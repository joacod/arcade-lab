import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { foundryCell, foundryFrame } from '../asset-art.ts';

// Offline registration/packing of complete authored cels. No anatomical reconstruction.
const motionClips = {
  guard: [12], crouchGuard: [13], crouch: [14], block: [15, 12],
};

// Sheet rows are inspected transparent gutters, not an assumed equal-height grid.
const combatRows = {
  'eclipse-foundry/painted': { nera: [0, 303, 610, 850, 1127, 1402], kael: [0, 334, 647, 878, 1141, 1357] },
  'moonfall-sanctum/fighters': { nera: [0, 343, 667, 896, 1169, 1448], kael: [0, 317, 625, 852, 1140, 1402] },
};
// Inspected hip columns for the new guarded step-slide. The leading boot stays
// forward; a planted-foot midpoint would pull the torso sideways as stance widens.
const footworkHips = {
  'eclipse-foundry/painted': { nera: [184, 499, 814, 1129], kael: [174, 489, 804, 1119] },
  'moonfall-sanctum/fighters': { nera: [178, 493, 808, 1123], kael: [177, 493, 809, 1125] },
};
const footworkFloors = {
  'eclipse-foundry/painted': { nera: [296, 605, 915, 1227], kael: [310, 622, 924, 1228] },
  'moonfall-sanctum/fighters': { nera: [287, 595, 910, 1224], kael: [299, 608, 917, 1227] },
};

async function packSheet(folder, kind, atlas, family) {
  const directory = new URL(`${folder}/`, import.meta.url);
  const source = new URL(`${kind}-${family}.png`, directory);
  const { data, info } = await sharp(readFileSync(source)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rowCount = 4;
  const rows = family === 'combat' ? combatRows[folder][kind]
    : Array.from({ length: rowCount + 1 }, (_, i) => Math.round(i * info.height / rowCount));
  const frames = [];
  for (let row = 0; row < rows.length - 1; row++) {
    const y = rows[row], width = info.width, height = rows[row + 1] - y;
    const pixels = await sharp(data, { raw: info }).extract({ left: 0, top: y, width, height }).raw().toBuffer();
    // Locate entire connected figures across the row. Wide attack silhouettes can
    // cross a nominal column boundary, so equal-width crops would sever hands/boots.
    const alive = new Uint8Array(width * height), components = [];
    for (let i = 0; i < alive.length; i++) alive[i] = pixels[i * 4 + 3] >= 40 ? 1 : 0;
    for (let i = 0; i < alive.length; i++) {
      if (!alive[i]) continue;
      const component = [i]; alive[i] = 0;
      for (let q = 0; q < component.length; q++) {
        const p = component[q], px = p % width, py = Math.floor(p / width);
        for (let yy = Math.max(0, py - 1); yy <= Math.min(height - 1, py + 1); yy++) for (let xx = Math.max(0, px - 1); xx <= Math.min(width - 1, px + 1); xx++) {
          const next = yy * width + xx;
          if (alive[next]) { alive[next] = 0; component.push(next); }
        }
      }
      if (component.length > 1000) components.push(component);
    }
    const figures = components.sort((a, b) => b.length - a.length).slice(0, 4)
      .map(component => ({ component, center: component.reduce((sum, p) => sum + p % width, 0) / component.length }))
      .sort((a, b) => a.center - b.center);
    if (figures.length !== 4) throw new Error(`Expected four complete ${kind} ${family} figures in row ${row}`);
    for (const [column, { component }] of figures.entries()) {
      const image = Buffer.from(pixels), retained = new Uint8Array(width * height);
      let left = width, top = height, right = 0, bottom = 0;
      for (const p of component) {
        const px = p % width, py = Math.floor(p / width);
        left = Math.min(left, px); right = Math.max(right, px); top = Math.min(top, py); bottom = Math.max(bottom, py);
        for (let yy = Math.max(0, py - 2); yy <= Math.min(height - 1, py + 2); yy++) for (let xx = Math.max(0, px - 2); xx <= Math.min(width - 1, px + 2); xx++) retained[yy * width + xx] = 1;
      }
      for (let i = 0; i < retained.length; i++) if (!retained[i] || image[i * 4 + 3] < 8) image[i * 4 + 3] = 0;
      let footLeft = width, footRight = 0;
      for (let yy = bottom - 5; yy <= bottom; yy++) for (let xx = left; xx <= right; xx++) {
        if (image[(yy * width + xx) * 4 + 3] >= 96) { footLeft = Math.min(footLeft, xx); footRight = Math.max(footRight, xx); }
      }
      // Travel registers the hip column. Grounded attacks register their rear
      // support boot, including single-leg kicks. No frame-specific body scaling.
      const supportOffset = frames[0]?.supportOffset ?? (footRight - footLeft) / 2;
      const hipColumn = (column + .55) * info.width / 4;
      const pivotX = family === 'combat'
        ? row === 3 ? hipColumn : footLeft + supportOffset
        : family === 'footwork' ? footworkHips[folder][kind][column] : (footLeft + footRight) / 2;
      const pivotY = family === 'footwork' ? footworkFloors[folder][kind][row] - y : bottom;
      frames.push({ image, width, height, supportOffset: pivotX - footLeft,
        rect: [left, y + top, right - left + 1, bottom - top + 1], pivot: [pivotX, y + pivotY],
        local: { left, top, right, bottom, pivotX, pivotY } });
    }
  }
  const worldHeight = kind === 'nera' ? 160 : 168;
  const scale = worldHeight / frames[0].rect[3];
  const draws = [], selections = family === 'motion' ? { ...motionClips }
    : family === 'footwork' ? { idle: [0, 1, 2, 3, 4, 3, 2, 1], walk: [0, 9, 10, 11, 12, 13, 14, 0] } : Object.fromEntries(
    ['light', 'heavy', 'sweep', 'air', 'special'].map((clip, row) => [clip,
      Object.fromEntries([0, 0, 0, 1, 1, 2, 3, 3].map((i, slot) => [slot, row * 4 + i]))]));
  // All standing attacks enter and return through the same neutral stance. Air and
  // sweep keep their low/airborne endpoints; hurt/rise/landing settle into neutral.
  if (family === 'footwork') {
    for (const clip of ['light', 'heavy', 'special']) selections[clip] = { 0: 0, 7: 0 };
    selections.hurt = { 2: 0 }; selections.rise = { 3: 0 }; selections.land = { 2: 0 };
  } else if (family === 'combat') {
    // Neutral endpoints come from the exact idle drawing in the footwork pass.
    for (const clip of ['light', 'heavy', 'special']) { delete selections[clip][0]; delete selections[clip][7]; }
  }
  for (const [clip, slots] of Object.entries(selections)) for (const [slot, index] of Object.entries(slots)) {
    const f = frames[index], d = f.local;
    const [ax, ay] = foundryFrame({ clip, frame: Number(slot) });
    const width = Math.round((d.right - d.left + 1) * scale), height = Math.round((d.bottom - d.top + 1) * scale);
    const left = Math.round(foundryCell.pivotX + (d.left - d.pivotX) * scale);
    const top = Math.round(foundryCell.pivotY + (d.top - d.pivotY) * scale) - (family === 'combat' && clip === 'air' ? 16 : 0);
    if (left < 1 || top < 1 || left + width >= foundryCell.width || top + height >= foundryCell.height) throw new Error(`Clipped motion ${kind}:${clip}:${slot}`);
    // Clear the prior complete cel before compositing its authored replacement.
    draws.push({ input: { create: { width: foundryCell.width, height: foundryCell.height, channels: 4, background: '#000000ff' } }, left: ax, top: ay, blend: 'dest-out' });
    const input = await sharp(f.image, { raw: { width: f.width, height: f.height, channels: 4 } })
      .extract({ left: d.left, top: d.top, width: d.right - d.left + 1, height: d.bottom - d.top + 1 })
      .resize(width, height).png().toBuffer();
    draws.push({ input, left: ax + left, top: ay + top });
  }
  const output = await sharp(atlas).composite(draws).png().toBuffer();
  const metadata = { size: [info.width, info.height], rows, scale, selections, frames: frames.map(({ rect, pivot }) => ({ rect, pivot })) };
  writeFileSync(new URL(`${kind}-${family}-layout.json`, directory), JSON.stringify(metadata, null, 2) + '\n');
  return output;
}

export async function packMotion(folder, kind, atlas) {
  const combat = await packSheet(folder, kind, atlas, 'combat');
  const stance = await packSheet(folder, kind, combat, 'motion');
  return packSheet(folder, kind, stance, 'footwork');
}
