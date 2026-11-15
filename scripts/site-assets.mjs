import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gameInfo } from '../src/app/catalog-data.ts';
import { pageMetadata, site } from '../src/app/site.ts';
import { gameAtPath, gamePath } from '../src/app/routes.ts';
import { selectionMarkup } from '../src/app/selection-markup.ts';
import { gameLoadingMarkup } from '../src/app/game-loading-markup.ts';

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const svg = body => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${body}</svg>`);

/** Derived files stay out of git and are recreated for both dev and production. */
export async function generateSiteAssets() {
  const icon = await readFile(new URL('../public/icon.svg', import.meta.url));
  // A fixed-size share card shows a sample; the launcher holds the full catalog.
  const previews = gameInfo.slice(0, 8);
  const columns = Math.min(4, Math.ceil(previews.length / 2));
  const tileWidth = Math.floor((1104 - (columns - 1) * 18) / columns);
  const position = index => ({ left: 48 + index % columns * (tileWidth + 18), top: 250 + Math.floor(index / columns) * 178 });
  const tiles = await Promise.all(previews.map(async (game, index) => ({
    input: await sharp(fileURLToPath(game.cover)).resize(tileWidth, 132, { fit: 'cover' }).png().toBuffer(),
    ...position(index),
  })));
  const labels = previews.map((game, index) => {
    const { left: x, top: y } = position(index);
    return `<rect x="${x}" y="${y + 132}" width="${tileWidth}" height="30" fill="#1a2930"/><text x="${x + 12}" y="${y + 153}" font-size="16" font-weight="600">${escape(game.title)}</text>`;
  }).join('');
  const card = await sharp(svg(`<rect width="1200" height="630" fill="#101a21"/>`)).composite([
    ...tiles,
    { input: svg(`<g fill="#f0f2eb" font-family="sans-serif"><text x="112" y="70" font-size="23" font-weight="700" letter-spacing="3">${escape(site.name.toUpperCase())}</text><text x="1152" y="68" text-anchor="end" fill="#adf5cf" font-size="18">${escape(new URL(site.url).host)}</text><text x="48" y="159" font-size="65" font-weight="700" letter-spacing="-2">${escape(site.headline)}</text><text x="50" y="206" font-size="23" fill="#b7cac3">${escape(site.socialDescription)}</text>${labels}</g>`) },
    { input: await sharp(icon).resize(48, 48).png().toBuffer(), left: 48, top: 35 },
  ]).png({ palette: true, quality: 90, effort: 7 }).toBuffer();
  await mkdir(new URL('../public/social/', import.meta.url), { recursive: true });
  await Promise.all([
    ...gameInfo.map(async game => {
      const artwork = await sharp(fileURLToPath(game.cover)).resize(1200, 470, { fit: 'cover' }).png().toBuffer();
      await sharp(svg('<rect width="1200" height="630" fill="#101a21"/>')).composite([
        { input: artwork, left: 0, top: 0 },
        { input: svg(`<g font-family="sans-serif"><rect y="470" width="1200" height="3" fill="#adf5cf"/><text x="48" y="527" fill="#adf5cf" font-size="18" letter-spacing="2">${escape(site.name.toUpperCase())} · ${escape(game.genre)}</text><text x="48" y="585" fill="#f0f2eb" font-size="48" font-weight="700">${escape(game.title)}</text><text x="1152" y="611" text-anchor="end" fill="#b7cac3" font-size="16">${escape(new URL(site.url).host)}</text></g>`) },
      ]).png({ palette: true, quality: 90, effort: 7 }).toFile(fileURLToPath(new URL(`../public/social/${game.slug}.png`, import.meta.url)));
    }),
    writeFile(new URL('../public/social.png', import.meta.url), card),
    sharp(icon).resize(32, 32).png().toFile(fileURLToPath(new URL('../public/icon-32.png', import.meta.url))),
    sharp(icon).resize(180, 180).png().toFile(fileURLToPath(new URL('../public/apple-touch-icon.png', import.meta.url))),
    writeFile(new URL('../public/robots.txt', import.meta.url), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}sitemap.xml\n`),
    writeFile(new URL('../public/sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[site.url, ...gameInfo.map(game => new URL(gamePath(game), site.url).href)].map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>\n`),
  ]);
}

/** Search and link previews receive metadata in the initial HTML, without JS. */
export function siteHtml(html, { path = '/' } = {}) {
  const game = gameAtPath(path);
  const page = pageMetadata(game);
  const metadata = [
    `<title>${escape(page.title)}</title>`,
    `<meta name="description" content="${escape(page.description)}">`,
    `<link rel="canonical" href="${page.url}">`,
    ...Object.entries(page.openGraph).map(([property, value]) => `<meta property="${property}" content="${escape(value)}">`),
    ...Object.entries(page.twitter).map(([name, value]) => `<meta name="${name}" content="${escape(value)}">`),
    `<script type="application/ld+json">${JSON.stringify(page.schema).replaceAll('<', '\\u003c')}</script>`,
  ].join('\n    ');
  const introduction = game ? `<main class="arcade-selection">${gameLoadingMarkup(game)}</main>` : `<main class="arcade-selection">${selectionMarkup({
    coverUrl: url => `/${relative(fileURLToPath(new URL('../', import.meta.url)), fileURLToPath(url))}`,
  })}</main>`;
  // Retain boundaries so the built shell (with Vite's hashed assets) can serve each route.
  return html.replace(/<!--site-metadata-->[\s\S]*?<!--\/site-metadata-->/, () => `<!--site-metadata-->${metadata}<!--/site-metadata-->`)
    .replace(/<!--page-content-->[\s\S]*?<!--\/page-content-->/, () => `<!--page-content-->${introduction}<!--/page-content-->`);
}
