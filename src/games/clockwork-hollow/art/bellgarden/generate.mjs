import { writeFileSync, readFileSync } from 'node:fs';

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

// Complete connected silhouettes, with authored stance/action contours. No joint reconstruction.
const keeperContours = [
 'M20 40L15 45L10 54Q11 60 17 58L23 52L24 62L21 70L18 71L18 76L31 76L33 63L36 63L37 76L50 76L49 71L44 68L42 52L48 57Q54 59 54 53L47 43L43 40L48 35Q54 17 43 13L25 12Q11 15 15 33Z',
 'M20 40L12 44L9 51L14 55L23 50L24 61L17 69L12 71L12 76L26 76L34 64L38 68L40 76L53 76L52 71L47 68L42 51L49 59L55 57L53 50L45 40L48 35Q54 17 43 13L25 12Q11 15 15 33Z',
 'M20 40L13 46L12 57L18 58L24 51L25 62L23 71L20 72L20 76L33 76L35 64L39 69L41 75L53 75L52 70L46 66L42 50L50 54L55 50L49 44L43 40L48 35Q54 17 43 13L25 12Q11 15 15 33Z',
 'M20 40L12 46L9 56L15 59L24 52L25 62L29 70L26 71L26 76L39 76L38 64L43 68L45 74L56 74L55 69L49 65L42 50L49 52L54 47L47 42L43 40L48 35Q54 17 43 13L25 12Q11 15 15 33Z',
 'M20 40L13 43L9 50L12 56L20 54L25 62L35 70L34 76L49 76L48 71L42 66L35 62L32 63L24 70L14 70L13 75L27 76L39 66L42 51L48 58L54 56L53 50L45 40L48 35Q54 17 43 13L25 12Q11 15 15 33Z',
 'M20 40L13 31L9 24L4 27L7 38L22 52L24 61L19 64L14 60L10 64L17 72L26 72L33 64L40 69L48 72L54 68L50 63L44 62L42 51L55 37L58 26L53 23L49 32L43 40L48 35Q54 17 43 13L25 12Q11 15 15 33Z',
 'M20 40L10 42L4 48L6 54L13 51L23 51L24 61L20 70L18 72L18 76L31 76L33 64L39 64L42 76L55 76L54 71L49 68L42 51L53 51L59 47L56 42L46 42L43 40L48 35Q54 17 43 13L25 12Q11 15 15 33Z',
 'M20 40L12 42L7 54L12 59L22 53L24 62L21 70L18 71L18 76L31 76L33 63L36 63L37 76L50 76L49 71L44 68L42 52L50 60L56 57L53 48L43 40L48 35Q54 17 43 13L25 12Q11 15 15 33Z',
];
const keeperAtlas = keeperContours.map((contour, frame) => group(frame * 64, 0,
  path(contour, cream, ink) +
  path('M18 23Q30 18 49 23L48 33Q35 40 18 33Z', ink) +
  ellipse(28,28,2.5,3.5,frame === 7 ? coral : '#a4f6e2') + ellipse(42,28,2.5,3.5,frame === 7 ? coral : '#a4f6e2') +
  path('M24 46Q32 42 41 47L40 57Q32 63 25 57Z', gold, 'none') + ellipse(33,52,4,5,teal) +
  path('M20 40Q32 45 45 40L44 45Q32 49 21 45Z',coral,ink,1) +
  path('M22 17Q32 13 44 17M27 63L31 61M40 62L43 64','none',gold,1)
)).join('');
write('keeper',512,80,keeperAtlas);
write('keeper-normal',512,80,keeperAtlas.replaceAll(cream,'#ddbc78').replaceAll(coral,'#5e947c').replaceAll(teal,'#b6efce'));
write('keeper-quality',512,80,keeperAtlas.replaceAll(cream,'url(#copper)').replaceAll(coral,'#dba765').replaceAll(teal,'#b6f1d2').replaceAll(ink,'#15343c').replace(/^/,'<defs><linearGradient id="copper"><stop stop-color="#80725c"/><stop offset=".35" stop-color="#f3dcae"/><stop offset=".7" stop-color="#b3976b"/><stop offset="1" stop-color="#5b6156"/></linearGradient></defs>'));
const beetleAtlas = Array.from({length:4},(_,frame)=>group(frame*64,0,
 path('M9 31Q8 10 31 9Q49 9 52 24Q60 22 59 32L52 37L49 43L44 43L44 36L36 36L35 43L30 43L30 36L22 36L20 43L14 43L16 35L9 35Z',frame===3?'#647583':coral,ink,2) +
 path('M13 20Q27 5 44 18M31 11L31 31','none',cream,2) + path('M12 33L51 33','none',cream,3) + ellipse(54,27,2,2,cream)
)).join('');
write('beetle',256,48,beetleAtlas);
write('beetle-normal',256,48,beetleAtlas.replaceAll(coral,'#ce8c66'));
write('beetle-quality',256,48,beetleAtlas.replaceAll(coral,'#ba8b73').replaceAll(cream,'#ffe1b3'));

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

const objectSource = new URL('objects.svg', import.meta.url);
// Complete object images, same rectangles and pivots in every presentation.
for (const [suffix, replacements] of [['normal', [[cream, '#ddbc78'],[coral, '#ce8c66']]], ['quality', [[cream, '#e5cfa8'],[coral, '#ed9f8b'],[gold, '#ba9664']]]]) {
  let source = readFileSync(objectSource, 'utf8');
  for (const [from,to] of replacements) source = source.replaceAll(from,to);
  writeFileSync(new URL(`objects-${suffix}.svg`, import.meta.url),source);
}

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
