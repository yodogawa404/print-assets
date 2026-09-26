// Exports PDF / PNG from print CSS after a production build (called from closeBundle).
import { createServer } from 'node:http';
import { rmdir, unlink } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { globSync } from 'tinyglobby';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const A4_VIEWPORT = { width: 794, height: 1123 };
const SQUARE_VIEWPORT = { width: 2048, height: 2048 };

export interface ExportOptions {
  pagesDir: string;
  distDir: string;
}

export function pageSlugs(pagesDir: string): string[] {
  const mains = globSync('*/main.tsx', { cwd: pagesDir, absolute: true });
  return mains.map((m) => basename(dirname(m))).sort();
}

async function keepOnlyAssets(distDir: string) {
  const keep = new Set(['.png', '.pdf']);
  const files = globSync('**/*', { cwd: distDir, absolute: true, onlyFiles: true });
  await Promise.all(
    files
      .filter((f) => !keep.has(extname(f).toLowerCase()))
      .map((f) => unlink(f).catch(() => undefined)),
  );
  const dirs = globSync('**/', { cwd: distDir, absolute: true, onlyDirectories: true }).sort(
    (a, b) => b.length - a.length,
  );
  await Promise.all(dirs.map((d) => rmdir(d).catch(() => undefined)));
}

export async function exportPages({ pagesDir, distDir }: ExportOptions) {
  const slugs = pageSlugs(pagesDir);
  const { chromium } = await import('playwright');

  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let filePath = join(distDir, urlPath === '/' ? 'index.html' : urlPath);
    try {
      const { stat } = await import('node:fs/promises');
      const st = await stat(filePath);
      if (st.isDirectory()) filePath = join(filePath, 'index.html');
      const { readFile } = await import('node:fs/promises');
      const body = await readFile(filePath);
      res.writeHead(200, {
        'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise<void>((res, rej) => server.listen(0, res).on('error', rej));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://localhost:${port}`;

  const browser = await chromium.launch();

  for (const slug of slugs) {
    // Pass 1: open a page to read the canvas data-format attribute.
    const probe = await browser.newPage({ deviceScaleFactor: 2, viewport: A4_VIEWPORT });
    await probe.goto(`${baseUrl}/#/${slug}`, { waitUntil: 'networkidle' });
    await probe.emulateMedia({ media: 'print' });
    const probeCanvas = probe.locator('[data-canvas="page"]').first();
    await probeCanvas.waitFor();
    const format = (await probeCanvas.getAttribute('data-format')) ?? '';
    await probe.close();

    if (format !== 'a4' && format !== 'square') {
      throw new Error(
        `page "${slug}" must declare data-format="a4" or data-format="square" on its canvas root`,
      );
    }

    const square = format === 'square';

    // Pass 2: capture with the settings for the resolved format.
    const page = await browser.newPage({
      deviceScaleFactor: square ? 1 : 2,
      viewport: square ? SQUARE_VIEWPORT : A4_VIEWPORT,
    });
    await page.goto(`${baseUrl}/#/${slug}`, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    const canvas = page.locator('[data-canvas="page"]').first();
    await canvas.waitFor();

    if (square) {
      await canvas.screenshot({ path: join(distDir, `${slug}@2048.png`) });
      await page.addStyleTag({
        content: '@page { size: 2048px 2048px; margin: 0; }',
      });
      await page.pdf({
        path: join(distDir, `${slug}.pdf`),
        preferCSSPageSize: true,
        printBackground: true,
      });
    } else {
      await canvas.screenshot({ path: join(distDir, `${slug}@2x.png`) });
      await page.pdf({
        path: join(distDir, `${slug}.pdf`),
        preferCSSPageSize: true,
        printBackground: true,
      });
    }

    await page.close();
  }

  await browser.close();
  await new Promise<void>((res) => server.close(() => res()));

  await keepOnlyAssets(distDir);

  return slugs;
}
