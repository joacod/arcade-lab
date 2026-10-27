import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const localManifest = fileURLToPath(new URL('./local-art/appearances.ts', import.meta.url));
export default defineConfig(({ command }) => ({
  // Optimize the lazy dependency upfront on the server, avoiding a mid-run dev reload.
  optimizeDeps: { include: ['three'] },
  resolve: { alias: command === 'serve' && existsSync(localManifest)
    ? [{ find: /^\.\/local-appearances\.ts$/, replacement: localManifest }] : [] },
}));
