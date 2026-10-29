/** Original Aurora Fleet drawings, MIT. Run with Node; no images or packages are inputs. */
import { writeFileSync } from 'node:fs';

const outline = '#101d32', seam = '#324660', light = '#e3f4ec';
const path = (d, fill, stroke = outline, width = 1.4) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const line = (d, color, width = 1) => path(d, 'none', color, width);
const circle = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const mirror = drawing => `<g>${drawing}</g><g transform="translate(64 0) scale(-1 1)">${drawing}</g>`;
const vent = (x, y, color) => [0, 3, 6].map(dy => rect(x, y + dy, 6, 1, color)).join('');
const nozzle = (x, y, width = 6) => rect(x - width / 2 - 1, y - 3, width + 2, 5, outline) + rect(x - width / 2, y - 2, width, 3, '#83c8d7');
function plume(x, y, frame, color = '#63e5e1', width = 6, length = 12) {
  const pulse = [0, 3, 1, 4, 2, 5][frame];
  return path(`M${x - width / 2} ${y} L${x - width / 2 + 1} ${y + 6} L${x} ${y + length + pulse} L${x + width / 2 - 1} ${y + 6} L${x + width / 2} ${y}Z`, color, 'none') +
    path(`M${x - width / 4} ${y} L${x} ${y + length * 0.65 + pulse / 2} L${x + width / 4} ${y}Z`, '#f1ffed', 'none');
}

function fighter(frame) {
  const wing = path('M28 25 13 30 5 53 9 57 26 48Z', '#91b4bb') +
    path('M25 31 14 35 9 50 23 44Z', '#edf5e7', '#547b88', 0.8) +
    path('M15 36 12 45 15 44 19 35Z', '#2b9d9e', 'none') +
    path('M17 44 13 59 22 62 26 45Z', '#527e90') + nozzle(18, 61) +
    rect(8, 44, 2, 10, '#d9e9df') + rect(8, 42, 2, 3, '#ffa975') + vent(19, 48, '#bed7d2');
  return plume(18, 63, frame) + plume(46, 63, (frame + 3) % 6) + mirror(wing) +
    path('M32 5 37 15 38 39 43 54 39 61 25 61 21 54 26 39 27 15Z', light) +
    path('M32 6 32 58 25 56 29 39 29 16Z', '#b6d4cf', 'none') +
    path('M32 17 36 27 35 39 29 39 28 27Z', '#10384e', '#5ba9b4', 0.8) +
    line('M31 22 30 29 30 34', '#a0ffff', 1.5) +
    path('M29 43 35 43 36 54 28 54Z', '#2e878e', 'none') +
    rect(31, 45, 2, 7, '#a6fff1') + rect(30, 10, 4, 3, '#ffffff') +
    line('M27 57H37', seam) + circle(24, 42, 1, '#ffcb87') + circle(40, 42, 1, '#ffcb87');
}
function scout(frame) {
  return plume(32, 47, frame, '#ffbc64', 6, 10) +
    mirror(path('M29 22 18 10 12 14 10 40 25 47Z', '#597085') +
      path('M25 26 19 17 16 19 15 35Z', '#d1b579', '#6f5a4c', 0.8) + rect(12, 28, 2, 9, '#f2d99d')) +
    path('M32 6 40 23 39 41 32 51 25 41 24 23Z', '#798b99') +
    path('M32 15 36 26 32 35 28 26Z', '#f7c65c', '#4c393b', 1) +
    rect(30, 37, 4, 6, '#172d40') + nozzle(32, 48) + line('M32 8V13', '#f2e0b2');
}
function raider(frame) {
  return plume(23, 46, frame, '#ff9876', 5, 9) + plume(41, 46, (frame + 2) % 6, '#ff9876', 5, 9) +
    mirror(path('M29 22 23 12 12 8 5 21 7 40 17 50 26 42Z', '#715568') +
      path('M22 21 15 13 9 22 11 34 22 39Z', '#b38486', '#684c62', 0.8) +
      path('M11 18 15 15 21 23 17 25Z', '#f3bc9b', 'none') + rect(7, 30, 3, 7, '#f7a779') + nozzle(23, 46, 5)) +
    path('M32 13 40 27 38 43 32 48 26 43 24 27Z', '#b8a5a0') +
    path('M32 20 36 29 34 37 30 37 28 29Z', '#ff9569', '#5e3d51', 1) +
    line('M31 24V31', '#ffeac2', 1.5) + rect(29, 40, 6, 2, '#4b3d55');
}
function gunship(frame) {
  const pod = path('M8 14 19 10 24 21 23 47 18 52 7 49 5 25Z', '#656a8c') +
    path('M9 20H18V39H8Z', '#9394af', '#4b5072', 0.8) +
    rect(10, 24, 6, 3, '#c7a0ef') + vent(10, 31, '#403f62') +
    rect(8, 12, 3, 9, '#ecce9e') + nozzle(15, 50, 7);
  return plume(15, 52, frame, '#b296ff', 7, 6) + plume(49, 52, (frame + 4) % 6, '#b296ff', 7, 6) +
    path('M12 24H52V42H12Z', '#41475f') + mirror(pod) +
    path('M32 11 42 19 42 41 36 49 28 49 22 41 22 19Z', '#7f82a3') +
    path('M26 20H38L36 32H28Z', '#d4b3ef', '#3e3558', 1) +
    line('M28 23H36', '#ffeddf', 2) + rect(28, 36, 8, 7, '#3b3a55') + rect(30, 38, 4, 3, '#ffb67d');
}
function interceptor(frame) {
  return plume(32, 47, frame, '#ff7e76', 5, 10) +
    mirror(path('M30 26 18 27 13 20 8 48 13 52 27 40Z', '#725766') +
      path('M26 31 17 34 13 45 22 39Z', '#cb867f', '#7d535f', 0.8) + rect(10, 42, 2, 7, '#ffd1a1')) +
    path('M32 3 36 18 38 36 35 49 29 49 26 36 28 18Z', '#c4b4af') +
    path('M32 12 34 25 33 34 30 34 30 24Z', '#ff967d', '#593b50', 0.8) +
    line('M32 17V26', '#fff1c4') + rect(30, 38, 4, 6, '#644254') + nozzle(32, 48, 5);
}
function flagship(frame) {
  // Coordinates share the fortress's visual footprint; turrets/reactor stay in the renderer.
  const wing = path('M144 47 109 22 65 30 10 64 1 95 51 115 103 98 143 115Z', '#545572') +
    path('M132 55 104 33 65 41 20 69 15 88 56 103 103 87 135 100Z', '#85829b', '#343d57', 1) +
    path('M105 36 68 44 57 63 92 57Z', '#b7a2a3', 'none') +
    path('M49 59 24 74 24 85 48 92 58 86 54 66Z', '#343c57') +
    line('M29 76 46 68M30 83 47 77', '#e6be80', 2) +
    path('M64 66 90 55 112 69 110 95 79 106 60 96Z', '#444a67') +
    rect(68, 68, 7, 28, '#b2a3b7') + rect(67, 74, 9, 3, '#d4c0b9') +
    path('M94 69 104 73 104 90 94 94Z', '#9c6d88', '#c092a1', 0.8) +
    line('M20 97 51 109 60 105M73 36 90 32', '#c1b2b7') +
    [0, 1, 2, 3].map(i => rect(116 + i * 5, 66 + i * 2, 2, 14, '#f1bb79')).join('') +
    nozzle(66, 118, 12) + nozzle(119, 110, 10);
  const reflectedWing = `<g>${wing}</g><g transform="translate(336 0) scale(-1 1)">${wing}</g>`;
  return plume(66, 119, frame, '#b391e3', 12, 24) + plume(270, 119, (frame + 3) % 6, '#b391e3', 12, 24) +
    plume(119, 112, frame, '#ffb17b', 10, 14) + plume(217, 112, (frame + 3) % 6, '#ffb17b', 10, 14) + reflectedWing +
    path('M168 5 191 26 202 77 196 122 180 148 156 148 140 122 134 77 145 26Z', '#77728d', '#17253c', 2) +
    path('M168 14 184 31 191 68 168 79 145 68 152 31Z', '#b4a6b6', '#44435e', 1) +
    path('M168 25 179 41 177 60 159 60 157 41Z', '#332f50', '#dba5b7', 1) +
    line('M162 43H174M162 49H174', '#ffce9d', 2) +
    path('M147 78 168 85 189 78 186 121 175 136 161 136 150 121Z', '#343b59') +
    line('M151 90V113L163 129M185 90V113L173 129', '#d0a384', 2) +
    circle(168, 102, 17, '#9a79ba') + circle(168, 102, 12, '#2d3454') + circle(168, 102, 7, '#ffc58f') +
    rect(164, 140, 8, 6, '#e6b783');
}
const drawings = { fighter: [64, 80, fighter], scout: [64, 64, scout], raider: [64, 64, raider], gunship: [64, 64, gunship], interceptor: [64, 64, interceptor], flagship: [336, 168, flagship] };
for (const [name, [width, height, draw]] of Object.entries(drawings)) {
  const frames = Array.from({ length: 6 }, (_, i) => `<g transform="translate(${i * width} 0)">${draw(i)}</g>`).join('\n');
  writeFileSync(new URL(`./${name}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 6}" height="${height}" viewBox="0 0 ${width * 6} ${height}">\n<!-- Original Arcade Lab artwork. MIT license. Generated by generate.mjs. -->\n${frames}\n</svg>\n`);
}
