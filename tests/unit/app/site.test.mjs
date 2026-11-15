import test from 'node:test';
import assert from 'node:assert/strict';
import { gameInfo } from '../../../src/app/catalog-data.ts';
import { gameAtPath, gamePath, htmlRequestPath } from '../../../src/app/routes.ts';
import { pageMetadata, site } from '../../../src/app/site.ts';
import { siteHtml } from '../../../scripts/site-assets.mjs';

const template = '<head><!--site-metadata--><!--/site-metadata--></head><div id="app"><!--page-content--><!--/page-content--></div>';

test('every game has a unique URL and crawler-visible metadata, including when derived from the built landing', () => {
  assert.equal(new Set(gameInfo.map(gamePath)).size, gameInfo.length);
  const landing = siteHtml(template);
  assert.ok(landing.includes(`<meta property="og:image" content="${site.url}social.png">`));
  assert.ok(landing.includes('Press Play'));
  for (const game of gameInfo) {
    const path = gamePath(game);
    assert.equal(gameAtPath(path), game);
    assert.equal(gameAtPath(path.slice(0, -1)), game);
    assert.ok(landing.includes(`href="${path}"`));
    const page = pageMetadata(game);
    const html = siteHtml(landing, { path });
    assert.ok(html.includes(`<title>${game.title} | Arcade Lab</title>`));
    assert.ok(html.includes(`<link rel="canonical" href="${page.url}">`));
    assert.ok(html.includes(`<meta property="og:image" content="${site.url}social/${game.slug}.png">`));
    assert.ok(html.includes(`<meta name="twitter:image" content="${page.openGraph['og:image']}">`));
    assert.equal((html.match(/<title>/g) ?? []).length, 1);
    assert.equal((html.match(/property="og:image"/g) ?? []).length, 1);
    assert.ok(html.includes(`Loading ${game.title}…`));
    assert.ok(!html.includes('Press Play'));
    assert.equal(page.schema['@type'], 'VideoGame');
  }
  assert.equal(gameAtPath('/'), undefined);
  assert.equal(gameAtPath('/not-a-game/'), undefined);
  assert.equal(gameAtPath('/skybreak/extra'), undefined);
  // Dev rewrites a game directory to index.html; the browser address must still select that game.
  assert.equal(htmlRequestPath({ path: '/index.html', originalUrl: '/skybreak/' }), '/skybreak/');
  assert.equal(htmlRequestPath({ path: '/index.html', originalUrl: '/the-thirteenth-guest/?ref=share' }), '/the-thirteenth-guest/');
  assert.equal(gameAtPath(htmlRequestPath({ path: '/index.html' })), undefined);
  assert.equal(htmlRequestPath({ path: '/skybreak/index.html' }), '/skybreak/');
});
