import { writeFileSync } from 'node:fs';

// Original, editable SVG artwork. Runtime uses the committed outputs.
const ink = '#233d55', cream = '#fff0cf', coral = '#ec7968', teal = '#59b8b2', gold = '#e4b767';
const path = (d, fill, stroke = 'none', width = 2) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, fill, r = 0, stroke = 'none') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const ellipse = (x, y, rx, ry, fill, stroke = 'none') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const group = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;
const line = (x, y, x2, y2, color, width = 2) => path(`M${x} ${y}L${x2} ${y2}`, 'none', color, width);
function flower(x, y, size, color = cream) {
  return group(x, y, Array.from({ length: 5 }, (_, i) => `<g transform="rotate(${i * 72})">${ellipse(0, -size * .55, size * .32, size * .57, color)}</g>`).join('') + ellipse(0, 0, size * .27, size * .27, gold));
}
function foliage(x, y, size, color = teal) {
  return group(x, y, path(`M0 0Q${-size * .4} ${-size * .6} 0 ${-size}`, 'none', color, 2) +
    Array.from({ length: 5 }, (_, i) => {
      const yy = -size * (i + 1) / 6, s = i % 2 ? -1 : 1;
      return path(`M0 ${yy}Q${s * size * .5} ${yy - size * .3} ${s * size * .45} ${yy + size * .03}Q${s * size * .2} ${yy + size * .12} 0 ${yy}`, color);
    }).join(''));
}
function wheel(x, y, r, color = gold) {
  return group(x, y, ellipse(0, 0, r, r, 'none', color) + ellipse(0, 0, r * .78, r * .78, 'none', color) +
    Array.from({ length: 12 }, (_, i) => `<g transform="rotate(${i * 30})">${rect(-r * .08, -r * 1.08, r * .16, r * .22, color)}${line(0, 0, 0, -r * .75, color, r * .07)}</g>`).join('') + ellipse(0, 0, r * .2, r * .2, color));
}
function write(name, width, height, body) {
  writeFileSync(new URL(`${name}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><!-- Porcelain Bellgarden | Original Arcade Lab artwork | MIT -->${body}</svg>\n`);
}

// Eight independent frames, facing right. All soles share y=76.
write('keeper', 512, 80, Array.from({ length: 8 }, (_, frame) => {
  const stride = [0, -9, -4, 5, 10, 7, -5, 0][frame], jump = frame === 5, fall = frame === 6;
  const arm = jump ? 29 : fall ? 37 : 50;
  return group(frame * 64, 0,
    path(`M25 42Q7 ${jump ? 26 : 44} 4 55L18 52 26 48`, coral, ink) +
    line(27, 58, 24 + stride, 73, ink, 7) + line(37, 58, 40 - stride, 73, ink, 7) +
    rect(18 + stride, 70, 13, 6, cream, 2, ink) + rect(34 - stride, 70, 14, 6, cream, 2, ink) +
    line(21, 46, 14, arm, ink, 6) + line(42, 46, 49, arm + (jump ? 0 : stride * .5), ink, 6) +
    ellipse(14, arm, 4, 4, cream, ink) + ellipse(49, arm + (jump ? 0 : stride * .5), 4, 4, cream, ink) +
    path('M22 40Q16 56 23 62L41 62Q47 51 41 40Z', cream, ink) +
    path('M25 44L25 55Q32 61 39 55L39 44', 'none', gold) +
    ellipse(32, 51, 6, 6, ink) + ellipse(32, 51, 3, 3, teal) +
    rect(15, 13, 36, 29, cream, 11, ink) + path('M17 23Q30 17 49 23L49 34Q35 40 18 33Z', ink) +
    (frame === 7 ? line(26, 26, 30, 30, coral) + line(30, 26, 26, 30, coral) + line(39, 26, 43, 30, coral) + line(43, 26, 39, 30, coral)
      : ellipse(28, 28, 2.5, 3.5, '#a4f6e2') + ellipse(42, 28, 2.5, 3.5, '#a4f6e2')) +
    path('M21 17Q32 11 44 17', 'none', gold) + line(28, 12, 26, 5, ink) +
    path('M26 7Q14 -1 16 8Q21 13 26 7M26 7Q37 -2 36 6Q33 12 26 7', teal, ink, 1) +
    path('M20 40Q30 45 45 40L44 45Q32 49 21 45Z', coral, ink, 1));
}).join(''));

write('beetle', 256, 48, Array.from({ length: 4 }, (_, frame) => group(frame * 64, 0,
  Array.from({ length: 3 }, (_, leg) => line(18 + leg * 12, 31, 13 + leg * 13 + (frame % 2 ? 3 : -2), 43, gold, 3)).join('') +
  path('M9 31Q8 10 31 9Q49 9 52 31Z', frame === 3 ? '#647583' : coral, ink, 3) +
  path('M13 20Q27 5 44 18M31 11L31 31', 'none', cream, 2) +
  ellipse(25, 23, 4, 4, ink) + ellipse(39, 23, 4, 4, ink) +
  path('M12 33L51 33', 'none', cream, 4) + ellipse(51, 29, 7, 7, ink) + ellipse(54, 27, 2, 2, cream) +
  line(17, 12, 17, 4, gold) + line(11, 4, 23, 4, gold))).join(''));

const lantern = lit => line(64, 152, 64, 30, ink, 6) + path('M43 36L64 20 85 36Z', cream, ink, 3) +
  rect(46, 38, 36, 49, lit ? '#bef5da' : '#647e83', 8, ink) +
  path('M52 45L52 75M75 45L75 75M47 83L81 83', 'none', gold, 3) +
  (lit ? flower(64, 62, 11, cream) : ellipse(64, 64, 7, 10, '#8da7a5')) + foliage(56, 150, 40) + rect(53, 148, 23, 7, cream, 3, ink);
const bell = line(64, 14, 64, 45, gold, 4) +
  path('M26 112Q43 92 42 64Q43 42 64 42Q85 42 86 64Q85 92 102 112Z', cream, ink, 4) +
  path('M48 63Q63 54 80 63M46 86Q65 78 84 86M29 110L100 110', 'none', gold, 4) +
  flower(64, 78, 11, coral) + ellipse(64, 117, 10, 10, gold, ink);
const gate = path('M10 158L10 30Q64 -12 118 30L118 158 105 158 105 38Q64 11 23 38L23 158Z', '#89a9a2', ink, 3) +
  path('M7 31Q64 -9 121 31L120 42Q64 8 8 42Z', cream, ink) +
  line(17, 50, 17, 150, gold) + line(111, 50, 111, 150, gold) + foliage(14, 142, 72) + foliage(112, 148, 48) + flower(111, 46, 12, coral);
const mote = path('M64 51L83 78 64 105 45 78Z', gold, ink, 3) + path('M64 60L76 78 64 96 52 78Z', cream) + ellipse(64, 78, 4, 4, coral);
const thorn = path('M0 153L8 107 20 153 32 111 44 153 57 107 70 153 83 111 96 153 109 107 122 153 128 153Z', coral, ink, 2) + line(0, 156, 128, 156, ink, 4) + path('M8 117L8 141M57 117L57 141M109 117L109 141', 'none', cream, 2);
const vent = rect(12, 124, 104, 31, cream, 5, ink) + rect(20, 129, 88, 10, ink, 3) +
  Array.from({ length: 8 }, (_, i) => line(25 + i * 10, 129, 25 + i * 10, 139, gold, 3)).join('') + ellipse(29, 148, 3, 3, coral) + ellipse(98, 148, 3, 3, coral);
write('objects', 1024, 160, [lantern(false), lantern(true), bell, gate, mote, thorn, vent, foliage(64, 158, 115) + flower(66, 55, 15, coral)]
  .map((body, i) => `<svg x="${i * 128}" width="128" height="160" viewBox="0 0 128 160">${body}</svg>`).join(''));

const districts = [
  { id: 'aqueduct', stone: '#456e78', tile: '#335564', pale: '#a6c8b9', leaf: '#509a94', far: '#34546a', glow: '#b5d5be' },
  { id: 'emberworks', stone: '#80646e', tile: '#614e63', pale: '#dfad8c', leaf: '#947d8d', far: '#554257', glow: '#dc9e83' },
  { id: 'belfry', stone: '#656e99', tile: '#444f77', pale: '#bbc4e0', leaf: '#7a8fae', far: '#303c60', glow: '#afb9dc' },
];
write('terrain', 384, 192, districts.map((d, i) => `<svg x="${i * 128}" width="128" height="192" viewBox="0 0 128 192">` +
  rect(0, 0, 128, 128, d.tile) +
  Array.from({ length: 4 }, (_, row) => Array.from({ length: 3 }, (_, col) => {
    const x = col * 64 - (row % 2 ? 32 : 0), y = row * 32;
    return rect(x + 2, y + 2, 60, 28, d.stone, 3) + path(`M${x + 6} ${y + 6}L${x + 54} ${y + 6}`, 'none', d.pale, 1);
  }).join('')).join('') +
  path('M64 17L79 32 64 47 49 32ZM64 81L79 96 64 111 49 96Z', 'none', d.pale, 1) +
  rect(0, 128, 128, 32, ink) + rect(0, 128, 128, 8, cream) + rect(0, 136, 128, 4, gold) +
  Array.from({ length: 8 }, (_, n) => path(`M${n * 16} 146Q${n * 16 + 8} 161 ${n * 16 + 16} 146`, 'none', d.pale, 2)).join('') +
  foliage(23, 192, 25, d.leaf) + foliage(97, 190, 23, d.leaf) + '</svg>').join(''));

for (const d of districts) {
  // Quiet far layer: tall architectural silhouettes, unbroken repeating bottom edge.
  let far = '';
  for (let i = -1; i < 7; i++) {
    const x = i * 160 - 65, y = 190 + ((i % 3 + 3) % 3) * 28;
    far += group(x, y, path('M0 450L0 80Q75 -55 150 80L150 450 124 450 124 110Q75 24 26 110L26 450Z', d.far) +
      path('M-5 85Q75 -44 155 85M-5 100Q75 -29 155 100', 'none', d.pale, 2) +
      line(10, 130, 10, 450, d.pale, 1));
    if (d.id === 'aqueduct') far += group(x + 60, y + 180, path('M0 80Q-80 -80 0 -160Q100 -120 90 -20Q70 70 0 80', d.leaf));
    if (d.id === 'emberworks') far += group(x + 52, y + 55, rect(0, 30, 36, 250, d.stone, 12) + rect(-10, 68, 56, 12, d.pale, 4) + ellipse(18, 40, 12, 12, d.glow));
    if (d.id === 'belfry') far += group(x + 50, y - 90, path('M0 170L0 30 25 0 50 30 50 170Z', d.far) + rect(16, 53, 18, 64, d.glow, 9) + line(25, 57, 25, 113, d.far, 4));
  }
  far += path('M0 560Q160 520 320 565T640 560T960 560L960 640 0 640Z', d.far);
  write(`${d.id}-far`, 960, 640, far);

  // Near layer: glazed archways and district-specific machinery, botanicals and medallions.
  let near = '';
  for (let i = 0; i < 3; i++) {
    const x = i * 320 + 20, y = 215 + (i % 2) * 50;
    near += group(x, y, path('M0 425L0 75Q140 -75 280 75L280 425 242 425 242 101Q140 -7 38 101L38 425Z', d.stone, d.far, 3) +
      path('M-5 80Q140 -81 285 80L283 97Q140 -54 -3 97Z', d.pale, ink, 2) +
      line(8, 118, 8, 420, d.pale, 3) + line(270, 118, 270, 420, d.pale, 3) +
      Array.from({ length: 7 }, (_, k) => line(0, 160 + k * 38, 37, 160 + k * 38, d.far, 2) + line(243, 160 + k * 38, 280, 160 + k * 38, d.far, 2)).join('') +
      wheel(140, 55, 21, gold));
    if (d.id === 'aqueduct') {
      near += foliage(x + 34, y + 290, 160, d.leaf) + foliage(x + 255, y + 150, 115, d.leaf) + flower(x + 247, y + 100, 16, '#d79f94');
      near += group(x + 65, y + 235, path('M0 0Q65 35 130 0L130 15Q65 50 0 15Z', d.pale) + line(65, 35, 65, 150, d.pale, 4));
    } else if (d.id === 'emberworks') {
      near += group(x + 95, y + 150, rect(0, 0, 90, 190, d.far, 30, d.pale) + rect(12, 20, 66, 90, '#b17d74', 25, gold) +
        Array.from({ length: 5 }, (_, k) => line(22 + k * 12, 25, 22 + k * 12, 106, d.far, 5)).join('') + wheel(45, 145, 24));
      near += path(`M${x + 45} ${y + 330}V${y + 110}Q${x + 45} ${y + 90} ${x + 70} ${y + 90}H${x + 220}V${y + 300}`, 'none', gold, 7);
    } else {
      near += group(x + 74, y + 138, path('M0 180L0 20Q65 -45 130 20L130 180Z', d.far, d.pale, 3) +
        path('M10 169L10 30Q65 -25 120 30L120 169Z', d.glow) +
        path('M65 0L65 180M5 64L125 64M5 120L125 120M5 30L125 155M125 30L5 155', 'none', d.stone, 5));
      near += line(x + 140, y + 320, x + 140, y + 388, gold) + flower(x + 140, y + 350, 13, cream);
    }
  }
  write(`${d.id}-near`, 960, 640, near);
}
