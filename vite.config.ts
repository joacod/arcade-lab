import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite';
import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const wgsl = wgslVitePlugin();
const localManifest = fileURLToPath(new URL('./local-art/appearances.ts', import.meta.url));
export default defineConfig(({ command }) => ({
  // Vite 8 retains its own ?import marker for unknown extensions in development.
  plugins: [{ ...wgsl, enforce: 'pre', transform(source, id) {
    return wgsl.transform.call(this, source, id.replace(/\?import$/, ''));
  } }],
  // Optimize the lazy dependency upfront on the server, avoiding a mid-run dev reload.
  optimizeDeps: { include: ['three', 'vgpu'] },
  resolve: { alias: command === 'serve' && existsSync(localManifest)
    ? [{ find: /^\.\/local-appearances\.ts$/, replacement: localManifest }] : [] },
}));
