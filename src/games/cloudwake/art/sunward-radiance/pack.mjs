import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const file = name => fileURLToPath(new URL(name, import.meta.url));
// Preserve cel registration. Do not trim frames independently by their alpha edge.
for (const role of ['courier', 'checkpoint']) {
  await sharp(file(`source-${role}.png`)).resize(1024, 1024)
    .webp({ lossless: true, effort: 6 }).toFile(file(`${role}.webp`));
}
const objects = [
  ['pillar', { left: 150, top: 0, width: 350, height: 660 }, 192, 480],
  ['mine', { left: 630, top: 0, width: 633, height: 660 }, 256, 256],
  ['fragment', { left: 0, top: 670, width: 550, height: 575 }, 192, 288],
  ['cloud', { left: 560, top: 700, width: 703, height: 545 }, 640, 252],
];
for (const [role, region, width, height] of objects) {
  const crop = await sharp(file('source-objects.png')).extract(region).png().toBuffer();
  await sharp(crop).trim({ threshold: 8 }).resize(width, height, { fit: 'fill' })
    .webp({ lossless: true, effort: 6 }).toFile(file(`${role}.webp`));
}
await sharp(file('source-sky.png')).resize(1536, 1024)
  .webp({ quality: 88, effort: 6 }).toFile(file('sky.webp'));
