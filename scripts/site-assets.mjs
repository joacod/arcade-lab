import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { gameInfo } from '../src/app/catalog-data.ts';
import { site } from '../src/app/site.ts';

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const svg = body => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${body}</svg>`);

/** Derived files stay out of git and are recreated for both dev and production. */
export async function generateSiteAssets() {
  const icon = await readFile(new URL('../public/icon.svg', import.meta.url));
  const columns = Math.min(4, Math.ceil(gameInfo.length / 2));
  const tileWidth = Math.floor((1104 - (columns - 1) * 18) / columns);
  const position = index => ({ left: 48 + index % columns * (tileWidth + 18), top: 250 + Math.floor(index / columns) * 178 });
  const tiles = await Promise.all(gameInfo.map(async (game, index) => ({
    input: await sharp(fileURLToPath(game.cover)).resize(tileWidth, 132, { fit: 'cover' }).png().toBuffer(),
    ...position(index),
  })));
  const labels = gameInfo.map((game, index) => {
    const { left: x, top: y } = position(index);
    return `<rect x="${x}" y="${y + 132}" width="${tileWidth}" height="30" fill="#1a2930"/><text x="${x + 12}" y="${y + 153}" font-size="16" font-weight="600">${escape(game.title)}</text>`;
  }).join('');
  const card = await sharp(svg(`<rect width="1200" height="630" fill="#101a21"/>`)).composite([
    ...tiles,
    { input: svg(`<g fill="#f0f2eb" font-family="sans-serif"><text x="112" y="70" font-size="23" font-weight="700" letter-spacing="3">${escape(site.name.toUpperCase())}</text><text x="1152" y="68" text-anchor="end" fill="#adf5cf" font-size="18">${escape(new URL(site.url).host)}</text><text x="48" y="159" font-size="65" font-weight="700" letter-spacing="-2">${escape(site.headline)}</text><text x="50" y="206" font-size="23" fill="#b7cac3">${escape(site.socialDescription)}</text>${labels}</g>`) },
    { input: await sharp(icon).resize(48, 48).png().toBuffer(), left: 48, top: 35 },
  ]).png({ palette: true, quality: 90, effort: 7 }).toBuffer();
  await Promise.all([
    writeFile(new URL('../public/social.png', import.meta.url), card),
    sharp(icon).resize(32, 32).png().toFile(fileURLToPath(new URL('../public/icon-32.png', import.meta.url))),
    sharp(icon).resize(180, 180).png().toFile(fileURLToPath(new URL('../public/apple-touch-icon.png', import.meta.url))),
    writeFile(new URL('../public/robots.txt', import.meta.url), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}sitemap.xml\n`),
    writeFile(new URL('../public/sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site.url}</loc></url></urlset>\n`),
  ]);
}

/** Search and link previews receive metadata in the initial HTML, without JS. */
export function siteHtml(html) {
  const schema = { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url,
    description: site.description, sameAs: site.repository };
  const metadata = [
    `<title>${escape(site.title)}</title>`,
    `<meta name="description" content="${escape(site.description)}">`,
    `<link rel="canonical" href="${site.url}">`,
    ...Object.entries({ 'og:type': 'website', 'og:site_name': site.name, 'og:title': site.title,
      'og:description': site.description, 'og:url': site.url, 'og:image': `${site.url}social.png`,
      'og:image:type': 'image/png', 'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': site.socialAlt,
    }).map(([property, value]) => `<meta property="${property}" content="${escape(value)}">`),
    ...Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': site.title,
      'twitter:description': site.description, 'twitter:image': `${site.url}social.png`, 'twitter:image:alt': site.socialAlt,
    }).map(([name, value]) => `<meta name="${name}" content="${escape(value)}">`),
    `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`,
  ].join('\n    ');
  const introduction = `<main class="arcade-selection"><div class="arcade-selection-inner"><h1>${site.name}</h1><p>${site.description}</p><ul>${gameInfo.map(game => `<li><h2>${escape(game.title)}</h2><p>${escape(game.description)}</p></li>`).join('')}</ul><a href="${site.repository}">View Arcade Lab on GitHub</a><noscript><p>Enable JavaScript to choose and play a game.</p></noscript></div></main>`;
  return html.replace('<!--site-metadata-->', metadata).replace('<!--collection-introduction-->', introduction);
}
