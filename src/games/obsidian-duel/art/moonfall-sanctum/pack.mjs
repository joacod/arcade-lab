import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

// Mechanical export only: preserve the complete source illustrations and their alpha.
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [name, width, height, format] of [['stage', 1600, 896, 'webp'], ['effects', 768, 768, 'png']]) {
    const source = readFileSync(new URL(`sources/${name}.png`, import.meta.url)).toString('base64');
    const encoded = await page.evaluate(async ({ source, width, height, format }) => {
      const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL(`image/${format}`, .92).split(',')[1];
    }, { source, width, height, format });
    writeFileSync(new URL(`${name}.${format}`, import.meta.url), Buffer.from(encoded, 'base64'));
  }
} finally { await browser.close(); }
