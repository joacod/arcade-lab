import { writeFileSync } from 'node:fs';

// Original vector artwork. All coordinates are authored here; no external inputs.
const save = (name, width, height, body, view = `0 0 ${width} ${height}`) => writeFileSync(new URL(`${name}.svg`, import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${view}">${body}</svg>\n`);
const path = (d, fill, stroke = 'none', width = 1) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const line = (d, stroke, width = 1) => path(d, 'none', stroke, width);
const circle = (x, y, r, fill, stroke = 'none', width = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
let effects = '';
// Eight 128-square cells: bolt, strike, guard, ground seal, heel, punch, sweep, aerial. Anchors are centers.
effects += path('M4 65L44 54 55 35 92 46 122 64 88 80 53 92 43 74Z', '#29778388')
  + path('M28 64L63 43 106 64 64 84Z', '#94ffe7', '#e9ffe2', 2) + path('M51 64L71 54 91 64 68 73Z', '#f4ffe9');
effects += `<g transform="translate(128 0)">${path('M64 3L71 45 107 17 82 53 125 64 80 73 109 112 72 83 64 127 55 83 17 109 44 72 1 64 45 55 18 19 55 44Z', '#ffce8e')}${path('M64 27L72 54 100 64 73 74 64 102 54 75 28 64 53 55Z', '#fff9d6')}</g>`;
effects += `<g transform="translate(256 0)">${path('M64 8L110 34 105 85 64 121 23 85 18 34Z', '#71d8dc22', '#c4ffff', 4)}${line('M64 20L95 40 91 78 64 104 38 79 33 41Z', '#6ac1d2', 2)}${line('M64 36v53M42 62h44', '#ecffff', 3)}</g>`;
effects += `<g transform="translate(384 0)">${circle(64, 64, 49, 'none', '#b9b18a', 2)}${circle(64, 64, 40, 'none', '#90cebe', 1)}${path('M64 26L83 64 64 102 44 64Z', 'none', '#c3ddc7', 2)}</g>`;
// Action ribbons are separate artwork, never hit indicators or collision geometry.
effects += `<g transform="translate(0 128)">${path('M39 8Q127 53 39 120Q92 56 39 8Z', '#8cf4dd', '#e7ffe8', 2)}${line('M57 17Q107 56 53 106', '#498e9f', 3)}</g>`;
effects += `<g transform="translate(128 128)">${path('M5 42L81 50 110 64 78 78 6 86 58 64Z', '#d49162')}${path('M33 57L88 58 111 64 87 70 31 71 69 64Z', '#fff1c4')}</g>`;
effects += `<g transform="translate(256 128)">${path('M8 55Q68 100 121 50Q93 126 8 55Z', '#78d4c5', '#bdf9dc', 2)}</g>`;
effects += `<g transform="translate(384 128)">${path('M16 8Q113 57 111 119Q76 48 16 8Z', '#dfbb7b', '#fff3cb', 2)}</g>`;
save('effects', 512, 256, effects);
