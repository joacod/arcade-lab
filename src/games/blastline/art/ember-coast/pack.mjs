import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Offline cropping/resampling of complete drawings; runtime never assembles actors.
const specifications = [
  { name: 'operators', columns: 5, rows: 8, width: 640, height: 1024, scale: .78, anchor: [54, 120] },
  { name: 'nova-run', columns: 6, rows: 5, width: 768, height: 640, scale: .88, anchor: [54, 120], running: true },
  { name: 'bolt-run', columns: 6, rows: 5, width: 768, height: 640, scale: .88, anchor: [54, 120], running: true },
  { name: 'enemies', columns: 3, rows: 3, width: 384, height: 384, scale: .94, anchor: [64, 120] },
  { name: 'objects', columns: 4, rows: 4, width: 512, height: 512 },
  { name: 'backdrop', columns: 1, rows: 2, width: 1536, height: 1024 },
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const spec of specifications) {
    const source = await readFile(new URL(`sources/${spec.name}.png`, import.meta.url));
    const result = await page.evaluate(async ({ data, spec }) => {
      const image = new Image(); image.src = data; await image.decode();
      const atlas = document.createElement('canvas'); atlas.width = spec.width; atlas.height = spec.height;
      const ctx = atlas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      const sw = image.width / spec.columns, sh = image.height / spec.rows;
      const source = document.createElement('canvas'); source.width = image.width; source.height = image.height;
      const sourceContext = source.getContext('2d'); sourceContext.drawImage(image, 0, 0);
      for (let row = 0; row < spec.rows; row++) for (let col = 0; col < spec.columns; col++) {
        const dx = col * 128, dy = row * 128;
        if (spec.name === 'backdrop') {
          ctx.drawImage(image, 0, row * sh, image.width, sh, 0, row * 512, 1536, 512);
        } else if (spec.anchor) {
          const size = 128 * spec.scale;
          let sourceFoot = .94;
          if (spec.running) {
            // Inspect the opaque boot baseline, translating whole cels without resizing individual poses.
            const pixels = sourceContext.getImageData(Math.round(col * sw), Math.round(row * sh), Math.floor(sw), Math.floor(sh));
            for (let y = pixels.height - 1; y >= 0; y--) {
              let opaque = 0;
              for (let x = 0; x < pixels.width; x++) if (pixels.data[(y * pixels.width + x) * 4 + 3] >= 240) opaque++;
              if (opaque >= 5) { sourceFoot = (y + 1) / sh; break; }
            }
          }
          ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, 128, 128); ctx.clip();
          ctx.drawImage(image, col * sw, row * sh, sw, sh,
            dx + spec.anchor[0] - size * (spec.running ? .45 : .5), dy + spec.anchor[1] - size * sourceFoot, size, size);
          ctx.restore();
        } else {
          // Inspected whole-object crops, including the wide helicopter across its nominal cell.
          const crops = [
            [30, 8, 250, 292], [344, 8, 258, 292], [677, 45, 203, 250], [973, 5, 245, 291],
            [25, 320, 285, 290], [343, 342, 239, 260], [590, 340, 464, 245], [1062, 324, 168, 282],
            [28, 648, 253, 246], [342, 647, 252, 247], [657, 645, 251, 250], [973, 646, 253, 250],
            [29, 961, 252, 249], [328, 971, 265, 209], [635, 958, 290, 263], [956, 958, 290, 263],
          ];
          const [x, y, w, h] = crops[row * 4 + col];
          // The retained source is 1254 square. Scaling keeps crops explicit if exported at another size.
          const k = image.width / 1254;
          ctx.drawImage(image, x * k, y * k, w * k, h * k, dx, dy, 128, 128);
        }
      }
      return atlas.toDataURL(spec.name === 'backdrop' ? 'image/webp' : 'image/png', .94).split(',')[1];
    }, { data: `data:image/png;base64,${source.toString('base64')}`, spec });
    await writeFile(new URL(`${spec.name}.${spec.name === 'backdrop' ? 'webp' : 'png'}`, import.meta.url), Buffer.from(result, 'base64'));
  }
} finally { await browser.close(); }
