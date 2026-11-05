import { defineConfig } from 'vite';
import { generateSiteAssets, siteHtml } from './scripts/site-assets.mjs';

export default defineConfig(async () => {
  await generateSiteAssets();
  return {
    optimizeDeps: { include: ['audiobits'] },
    plugins: [{ name: 'arcade-site', transformIndexHtml: siteHtml }],
  };
});
