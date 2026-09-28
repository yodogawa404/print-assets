import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { globSync } from 'tinyglobby';
import type { Plugin } from 'vite';
import { exportPages } from './export.js';

const ROUTES = 'virtual:print-assets/routes';
const CONFIG = 'virtual:print-assets/config';

export interface PrintAssetsOptions {
  /** Root folder that holds one subfolder per page; each contains a main.tsx. */
  pagesDir: string;
  /** Module exporting a themeClass (brand tokens live on the consumer side). */
  theme?: string;
  /** CSS to import globally (fonts, global.css, etc.). */
  styles?: string[];
}

function unicodeSort(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function routesModule(pagesDir: string): string {
  const mains = globSync('*/main.tsx', { cwd: pagesDir, absolute: true }).sort(
    (a, b) => unicodeSort(basename(dirname(a)), basename(dirname(b))),
  );

  const lines: string[] = [];
  const routes: { path: string; label: string; v: string }[] = [];
  mains.forEach((abs, i) => {
    const folder = basename(dirname(abs));
    const v = `__P${i}`;
    lines.push(`import ${v} from ${JSON.stringify(abs)};`);
    routes.push({ path: `/${folder}`, label: folder, v });
  });

  lines.push('export default [');
  for (const r of routes) {
    lines.push(
      `  { path: ${JSON.stringify(r.path)}, label: ${JSON.stringify(r.label)}, Component: ${r.v} },`,
    );
  }
  lines.push('];');
  return lines.join('\n');
}

function configModule(theme: string | null, styles: string[]): string {
  const lines: string[] = [];
  for (const s of styles) lines.push(`import ${JSON.stringify(s)};`);
  if (theme) {
    lines.push(`import { themeClass } from ${JSON.stringify(theme)};`);
    lines.push('export { themeClass };');
  } else {
    lines.push('export const themeClass = undefined;');
  }
  return lines.join('\n');
}

// Resolve theme / styles import specs: an existing file path becomes absolute,
// anything else stays a bare specifier (e.g. "modern-normalize/modern-normalize.css").
function toSpecifier(cwd: string, s: string): string {
  if (existsSync(resolve(cwd, s))) return resolve(cwd, s);
  return s;
}

export function printAssets(options: PrintAssetsOptions): Plugin {
  const cwd = process.cwd();
  const pagesDir = resolve(cwd, options.pagesDir);
  const theme = options.theme ? toSpecifier(cwd, options.theme) : null;
  const styles = (options.styles ?? []).map((s) => toSpecifier(cwd, s));
  const distDir = resolve(cwd, 'dist');

  return {
    name: 'print-assets',
    config() {
      return {
        optimizeDeps: {
          // Virtual modules cannot be prebundled, so exclude the whole package.
          // The consumer imports `init` directly from '@yogodawa404/print-assets/init'.
          exclude: ['@yodogawa404/print-assets'],
          // Once excluded, react imports are no longer scanned, so prebundle them
          // explicitly to resolve CJS named exports (e.g. createRoot).
          include: [
            'react',
            'react-dom',
            'react-dom/client',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
          ],
        },
      };
    },
    resolveId(id) {
      if (id === ROUTES || id === CONFIG) return '\0' + id;
    },
    load(id) {
      if (id === '\0' + ROUTES) return routesModule(pagesDir);
      if (id === '\0' + CONFIG) return configModule(theme, styles);
    },
    async closeBundle() {
      await exportPages({ pagesDir, distDir });
    },
  };
}
