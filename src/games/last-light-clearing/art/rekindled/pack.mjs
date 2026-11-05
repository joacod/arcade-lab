import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// Whole authored cels retain their registered ground line, including passing poses.
// Alpha bounds only trim transparent storage; they never choose an animation pivot.
const directory = new URL('./', import.meta.url);
const registrations = JSON.parse(await readFile(new URL('registration.json', directory), 'utf8'));
const layout = {};
for (const [name, definition] of Object.entries(registrations)) {
  const source = new URL(`sources/${name}.png`, directory);
  const metadata = await sharp(source.pathname).metadata();
  const { columns, rows } = definition;
  const cw = metadata.width / columns, ch = metadata.height / rows.length;
  if (!Number.isInteger(cw) || !Number.isInteger(ch)) throw new Error(`${name}: non-integral source grid`);
  const layers = [], frames = [];
  for (let row = 0; row < rows.length; row++) for (let column = 0; column < columns; column++) {
    const registration = rows[row].frames?.[column] ?? rows[row];
    const { pivot, destinationPivot, scale } = registration;
    const cel = sharp(source.pathname).extract({ left: column * cw, top: row * ch, width: cw, height: ch });
    const { data, info } = await cel.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = cw, right = 0, top = ch, bottom = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (data[(y * cw + x) * info.channels + 3] > 8) {
      left = Math.min(left, x); right = Math.max(right, x + 1); top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
    }
    if (right <= left || bottom <= top) throw new Error(`${name}: empty cel ${row},${column}`);
    left = Math.max(0, left - 2); top = Math.max(0, top - 2);
    right = Math.min(cw, right + 2); bottom = Math.min(ch, bottom + 2);
    const width = Math.round((right - left) * scale), height = Math.round((bottom - top) * scale);
    const dx = Math.round(destinationPivot[0] + (left - pivot[0]) * scale);
    const dy = Math.round(destinationPivot[1] + (top - pivot[1]) * scale);
    if (dx < 0 || dy < 0 || dx + width > 256 || dy + height > 256) throw new Error(`${name}: registered cel exceeds its frame ${row},${column}`);
    const input = await sharp(source.pathname).extract({ left: column * cw + left, top: row * ch + top,
      width: right - left, height: bottom - top }).resize(width, height).png().toBuffer();
    layers.push({ input, left: column * 256 + dx, top: row * 256 + dy });
    frames.push({ row, column, bounds: [left, top, right, bottom], pivot, destinationPivot, scale,
      destination: [column * 256, row * 256, 256, 256], visible: [dx, dy, width, height] });
  }
  await sharp({ create: { width: columns * 256, height: rows.length * 256, channels: 4, background: '#00000000' } })
    .composite(layers).webp({ lossless: true, effort: 6 }).toFile(new URL(`${name}.webp`, directory).pathname);
  layout[name] = { sourceSize: [metadata.width, metadata.height], size: [columns * 256, rows.length * 256], frames };
  console.log(`Packed ${name}`);
}
await writeFile(new URL('layout.json', directory), `${JSON.stringify(layout, null, 2)}\n`);
await sharp(new URL('ground-source.png', directory).pathname).removeAlpha()
  .webp({ quality: 88, effort: 6 }).toFile(new URL('ground.webp', directory).pathname);
