import { cp, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const themesDir = resolve(distDir, 'themes');
const sourceThemesDir = resolve(root, 'src/styles/themes');

await mkdir(themesDir, { recursive: true });
await cp(resolve(root, 'src/styles/styles.css'), resolve(distDir, 'styles.css'));

for (const entry of await readdir(sourceThemesDir)) {
  if (!entry.endsWith('.css')) {
    continue;
  }

  await cp(resolve(sourceThemesDir, entry), resolve(themesDir, entry));
}
