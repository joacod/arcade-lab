import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { gameInfo } from '../src/app/catalog-data.ts';
import { generateSiteAssets } from './site-assets.mjs';

const [id, input] = process.argv.slice(2);
const game = gameInfo.find(game => game.id === id);
if (!game || !input) {
  console.error(`Usage: pnpm screenshot <${gameInfo.map(game => game.id).join('|')}> <capture.png>`);
  process.exit(1);
}
// One web-sized canonical image, shared by the landing and all documentation.
const output = new URL(game.cover);
const buffer = await sharp(input).resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toBuffer();
await writeFile(output, buffer);
await generateSiteAssets();
console.log(`Updated ${game.title}: ${output.pathname}`);
