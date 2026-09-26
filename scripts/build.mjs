// Precompiles the engine with tsc (TS/TSX -> JS, react left external) + .d.ts,
// then copies the structural CSS (page.css / print.css) into dist.
import { execFileSync } from 'node:child_process';
import { cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });

execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], {
  cwd: root,
  stdio: 'inherit',
});

await cp(resolve(root, 'src/page.css'), resolve(dist, 'page.css'));
await cp(resolve(root, 'src/print.css'), resolve(dist, 'print.css'));

console.log('print-assets build done -> dist/');
