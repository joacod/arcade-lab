import { defineConfig } from 'vite';
import { generateSiteAssets, siteHtml } from './scripts/site-assets.mjs';
import { gameInfo } from './src/app/catalog-data.ts';
import { gamePath, htmlRequestPath } from './src/app/routes.ts';

export default defineConfig(async () => {
  await generateSiteAssets();
  return {
    optimizeDeps: { include: ['audiobits'] },
    plugins: [{
      name: 'arcade-site',
      transformIndexHtml: {
        order: 'pre',
        handler: (html, ctx) => siteHtml(html, { path: htmlRequestPath(ctx) }),
      },
      generateBundle: {
        order: 'post',
        handler(_options, bundle) {
          const landing = bundle['index.html'];
          if (!landing || landing.type !== 'asset') throw new Error('Missing built landing HTML.');
          for (const game of gameInfo) this.emitFile({
            type: 'asset', fileName: `${gamePath(game).slice(1)}index.html`,
            source: siteHtml(String(landing.source), { path: gamePath(game) }),
          });
        },
      },
    }],
  };
});
