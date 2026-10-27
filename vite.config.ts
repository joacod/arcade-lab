import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const localManifest = fileURLToPath(new URL('./local-art/appearances.ts', import.meta.url));
export default defineConfig(({ command }) => ({
  resolve: { alias: command === 'serve' && existsSync(localManifest)
    ? [{ find: /^\.\/local-appearances\.ts$/, replacement: localManifest }] : [] },
}));
