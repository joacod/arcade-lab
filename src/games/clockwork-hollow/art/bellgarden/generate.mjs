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

// Each contour is a complete keeper drawing, including both planted boots or a
// distinct airborne silhouette. Frames run forward around a full eight-cel stride.
const keeperContours = [
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L46 41Q52 43 54 52Q55 58 51 59Q47 59 45 53L43 51L43 62L46 69Q52 70 51 76L38 76L35 64L30 64L28 76L15 76Q13 71 20 69L23 61L23 51L20 57Q17 61 13 57Q10 53 14 47L19 41Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L47 42L53 49Q58 54 54 58Q50 60 47 55L43 51L43 61L49 68Q56 70 55 76L42 76L34 64L29 65L21 76L8 76Q7 71 14 69L23 60L22 49L17 52Q11 55 9 51Q7 46 13 43Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L47 41L52 47Q57 51 54 55Q50 58 46 53L43 51L43 60L46 66Q51 67 51 73L39 73L34 64L30 65L27 76L14 76Q12 71 19 69L23 61L23 50L18 54Q13 57 11 53Q8 49 13 45Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L47 41L51 45Q56 48 53 53Q50 56 45 52L43 51L43 60L40 67L43 71Q46 76 40 76L29 76L29 65L26 63L23 68Q19 72 15 68L13 64L22 59L23 51L18 57Q14 61 10 57Q8 53 13 47Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L49 41L54 44Q59 48 56 52Q53 55 48 52L43 50L43 60L37 68L40 71Q43 76 37 76L25 76L27 64L24 63L18 68Q12 70 11 64L13 60L22 57L23 51L20 59Q17 63 13 60Q9 57 12 51L17 43Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L49 40L55 44Q59 49 55 52Q51 55 46 51L43 50L43 60L39 64L49 69Q56 70 55 76L42 76L32 66L28 65L21 73L9 73Q7 68 14 66L23 59L23 51L20 58Q18 63 13 61Q9 59 11 53L16 44Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L49 40L53 43Q58 47 55 51Q52 55 47 51L43 50L43 60L40 64L46 69Q52 70 51 76L38 76L32 65L28 64L23 71L11 71Q9 66 16 64L23 59L23 51L20 57Q18 62 13 60Q10 58 12 52L17 43Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L47 41L51 45Q56 49 52 53Q48 56 44 51L43 51L43 60L37 65L39 70Q42 76 36 76L25 76L27 64L24 63L21 68Q17 72 13 68L12 64L23 58L23 51L18 56Q14 60 11 56Q8 52 13 47Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L46 41L50 47Q55 52 51 56Q47 59 44 53L43 51L43 61L44 68Q49 70 48 76L35 76L32 65L28 65L26 74L13 74Q11 69 18 67L23 60L23 51L18 54Q13 58 10 54Q8 50 13 45Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L48 37L51 28Q52 22 57 24Q61 26 58 33L55 45L44 52L43 60L48 63L54 62Q60 63 56 68L48 72L36 66L30 64L25 71L16 71L10 65Q8 60 13 58L20 63L24 59L23 51L11 39L6 29Q5 23 10 23Q14 23 15 30L20 38Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L50 40L57 43Q62 46 59 50Q56 54 51 50L43 48L43 61L47 68Q54 69 53 76L40 76L35 64L30 64L28 76L15 76Q13 71 20 69L23 61L23 49L14 51Q8 55 5 51Q2 47 7 44L17 40Z',
 'M21 37C12 35 12 29 13 23C12 13 20 9 32 9C46 9 53 14 52 24C54 31 49 36 44 38L47 44L51 51Q54 56 50 59Q46 61 43 55L42 57L43 65L48 70Q54 71 53 76L38 76L34 68L30 68L27 76L12 76Q10 71 18 70L23 64L24 57L20 59Q15 63 11 59Q8 55 13 50L18 43Z',
];
const materials = mode => mode === 'deluxe' ? `<defs>
 <linearGradient id="shell" x1=".1" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#fff9dc"/><stop offset=".3" stop-color="#e3d5af"/><stop offset=".65" stop-color="#a6b4a5"/><stop offset="1" stop-color="#405f64"/></linearGradient>
 <linearGradient id="metal" x1="0" y1="0" x2=".75" y2="1"><stop stop-color="#fff1bc"/><stop offset=".24" stop-color="#d9ac68"/><stop offset=".6" stop-color="#94744e"/><stop offset="1" stop-color="#3d5355"/></linearGradient>
 <radialGradient id="glass" cx=".35" cy=".25" r=".85"><stop stop-color="#529c99"/><stop offset=".35" stop-color="#224b54"/><stop offset="1" stop-color="#091e2b"/></radialGradient>
 <radialGradient id="heart" cx=".35" cy=".3"><stop stop-color="#fff9cf"/><stop offset=".4" stop-color="#b1f1d7"/><stop offset="1" stop-color="#4b9b93"/></radialGradient>
 <linearGradient id="thorn-copper" x1="0" y1="0" x2="1" y2=".3"><stop stop-color="#713c38"/><stop offset=".25" stop-color="#f1b18a"/><stop offset=".46" stop-color="#cf705a"/><stop offset=".7" stop-color="#9a4d43"/><stop offset="1" stop-color="#493d40"/></linearGradient>
 <linearGradient id="thorn-socket" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4d8a0"/><stop offset=".25" stop-color="#b28c5a"/><stop offset=".55" stop-color="#665b46"/><stop offset="1" stop-color="#253d40"/></linearGradient>
 </defs>` : '';
{
 const shell = cream;
 const metal = gold, glass = ink;
 const edge = ink, ribbon = coral;
 const sheet = keeperContours.map((contour, frame) => {
   // Whole-cel scarf drawing is pose-authored too, not a separately animated rig.
   const tail = frame === 9 ? 'M24 39Q13 42 8 54L15 52L17 59Q21 49 29 44Z'
    : frame === 10 ? 'M24 40Q12 35 5 34L10 40L5 44Q16 42 28 45Z'
    : `M25 40Q14 ${38 + frame % 3} 4 ${43 + frame % 2 * 3}L10 47L7 51Q17 48 29 44Z`;
   return group(frame * 64, 0,
    path(tail,ribbon,edge,1) +
    path(contour,shell,edge,1.5) +
    // These are inset surfaces on the complete silhouette, never limb sprites.
    path('M15 22Q31 16 51 22L50 31Q35 39 17 32Z',metal,edge,1) +
    path('M18 23Q32 20 48 23L47 30Q33 35 19 30Z',glass,edge,.7) +
    ellipse(28,27,2,2.7,frame === 11 ? '#ffab89' : '#d4ffe7') + ellipse(41,27,2,2.7,frame === 11 ? '#ffab89' : '#d4ffe7') +
    path('M23 40Q33 45 44 39L45 44Q33 49 23 44Z',ribbon,edge,.7) +
    path('M26 47Q33 43 41 48L40 58Q33 63 26 57Z',metal,edge,.8) +
    ellipse(33.5,52.5,5.2,6,teal,edge,.7) +
    path('M31 48Q28 52 31 56','none','#f3ffe0',1) +
    path('M18 18Q22 12 31 12M40 13L45 15','none',gold,1.3) +
    line(32,9,32,5,metal,1.8) + ellipse(32,4,2,2,teal)
   );
 }).join('');
 write('keeper',768,80,sheet);
 // Distinct connected shell contours include alternate feet and a genuinely spent crown.
 const beetles = [
  'M8 31Q8 11 28 10Q46 7 51 25Q58 22 60 29L58 35L51 37L48 43L42 43L43 36L34 36L31 43L25 43L27 36L19 36L16 43L10 43L13 35Z',
  'M8 32Q7 12 28 11Q46 8 51 26Q58 23 60 30L58 36L52 37L54 43L47 43L44 37L35 37L37 43L30 43L28 37L20 37L23 43L16 43L12 36Z',
  'M8 31Q8 11 28 10Q46 7 51 25Q58 22 60 29L58 35L51 37L55 43L48 43L45 36L34 36L38 43L31 43L28 36L19 36L23 43L16 43L12 35Z',
  'M7 37Q8 26 28 27Q46 24 51 35Q57 32 60 37L57 42L8 43Z',
 ];
 const body = beetles.map((d,i)=>group(i*64,0,path(d,i===3?'#5b7178':shell,edge,1.5)+
  (i===3 ? path('M14 35L23 32L28 37L36 32L46 37','none',gold,1) :
  path(`M12 ${28+i%2}Q13 ${13+i%2} 29 ${13+i%2}Q44 ${11+i%2} 48 ${28+i%2}Z`,coral,edge,1)+
  path(`M15 ${24+i%2}Q25 ${13+i%2} 40 ${18+i%2}M30 ${14+i%2}L31 29`,'none',cream,1.4)+
  path('M12 32Q28 35 49 31','none',cream,2)+
  ellipse(54,29+i%2,2,2,cream)))).join('');
 write('beetle',256,48,body);
}

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

// Deluxe objects are newly illustrated volumes, preserving the flower, glass
// heart, bell profile and pointed danger language of the porcelain originals.
const qLantern = lit =>
 path('M56 148L58 85L69 85L72 148Z','url(#metal)',ink,2) +
 path('M38 42Q39 27 64 21Q89 27 90 42L84 48L44 48Z','url(#shell)',ink,2) +
 path('M44 47Q64 37 84 47L83 79Q64 97 45 79Z',lit?'url(#heart)':'url(#glass)',ink,2) +
 path('M44 45Q64 53 85 45M43 79Q64 91 85 79M52 49L52 83M76 49L76 83','none','url(#metal)',4) +
 path('M48 57L48 70','none','#edffe6',2) + flower(64,66,10,lit?'#fff7cf':'#83b5b0') +
 ellipse(64,27,5,5,'url(#metal)',ink) + foliage(60,150,38,'#548f86') +
 path('M49 148Q64 141 79 148L81 155L47 155Z','url(#shell)',ink,2);
const qBell = line(64,12,64,42,'url(#metal)',5) +
 path('M26 111Q41 100 42 69Q41 42 64 40Q87 42 86 69Q87 100 102 111L99 118Q64 132 29 118Z','url(#metal)',ink,2) +
 path('M48 68Q49 47 62 47L59 99Q49 100 42 106Z','#fff0c080') +
 path('M80 63Q80 95 92 109L76 114L71 48Z','#43585666') +
 ellipse(64,115,36,8,'url(#glass)',ink) + ellipse(64,119,8,10,'url(#metal)',ink) +
 path('M43 78Q64 84 85 78M39 96Q64 103 90 96','none','#e4bf7b',2) + flower(64,73,10,coral);
const qGate =
 path('M9 159L9 45Q10 11 64 5Q118 11 119 45L119 159L100 159L100 47Q98 27 64 24Q30 27 28 47L28 159Z','url(#shell)',ink,3) +
 path('M14 155V44Q15 17 64 11Q113 17 114 44V155M25 154V45Q27 25 64 20Q101 25 104 45V154','none','url(#metal)',3) +
 path('M7 151L30 151L32 159L5 159ZM98 151L121 151L123 159L96 159Z','url(#metal)',ink,2) +
 path('M64 6V24M27 18L37 32M101 18L91 32','none','#f5dfab',2) +
 foliage(15,144,75,'#548f86') + foliage(113,145,54,'#609a8d') + flower(109,41,12,coral);
const qMote = path('M64 51L83 78L64 105L45 78Z','url(#metal)',ink,2) +
 path('M64 54L64 78L48 78Z','#fff9d1') + path('M64 78L80 78L64 101Z','#88d4c0') +
 path('M64 54L80 78L64 78Z','#f9d588');
// Two complete forged thorns with their own sockets. Runtime repeats these
// cells to preserve the tall curved profile at each authored patch width.
const qThorns = [0, 1].map(i => group(i * 64, 0,
 rect(0, 153, 64, 7, '#263c3d') +
 path('M0 153L5 149L59 149L64 153L64 159L0 159Z','url(#thorn-socket)', '#263c3d', 1) +
 ellipse(32, 149, 25, 6, '#213839') +
 path(i === 0 ? 'M9 147Q24 128 33 105Q32 127 55 147Q36 157 9 147Z' : 'M9 147Q30 127 31 105Q40 130 55 147Q34 157 9 147Z','url(#thorn-copper)', '#4b3434', 1.5) +
 path(i === 0 ? 'M12 146Q25 128 33 105Q29 130 28 150Z' : 'M12 146Q30 126 31 105Q34 130 28 150Z','#e9ae82') +
 path(i === 0 ? 'M33 106Q33 131 51 146L35 150Z' : 'M31 106Q40 132 51 146L35 150Z','#8b4840') +
 path(i === 0 ? 'M16 143Q27 126 32 111' : 'M16 143Q30 125 31 111','none','#ffe2b3',1.5) +
 path('M8 146Q31 153 56 146L56 151Q32 159 8 151Z','url(#thorn-socket)', '#3c4440', 1) +
 path('M10 146Q32 153 54 146','none','#f2c78b',1.5) +
 [4,60].map(x => ellipse(x,155,1.6,1.6,'#20363a') + ellipse(x-.4,154.5,.5,.5,'#fce1a6')).join('')
)).join('');
const qVent =
 path('M13 130L23 122L105 122L116 130L116 157L13 157Z','url(#metal)',ink,2) +
 path('M21 132L107 132L101 142L27 142Z','url(#glass)',ink,2) +
 Array.from({length:8},(_,i)=>line(26+i*10,131,31+i*9,141,'#d5b782',3)).join('') +
 line(19,128,109,128,'#fff0c3',2) + ellipse(24,150,3,3,'#233e47') + ellipse(103,150,3,3,'#233e47') +
 ellipse(24,149,1,1,'#f4deaa') + ellipse(103,149,1,1,'#f4deaa');
write('objects-quality',1024,160, materials('deluxe') +
 [qLantern(false),qLantern(true),qBell,qGate,qMote,qThorns,qVent,foliage(64,158,115,'#639e89') + flower(66,55,15,coral)]
 .map((body,i)=>`<svg x="${i*128}" width="128" height="160" viewBox="0 0 128 160">${body}</svg>`).join(''));

const districts = [
  { id: 'aqueduct', stone: '#3c6570', tile: '#294957', pale: '#8fb7aa', leaf: '#4a8b82', far: '#263f53', glow: '#b5d5be' },
  { id: 'emberworks', stone: '#775964', tile: '#554352', pale: '#cda283', leaf: '#87717e', far: '#45394b', glow: '#dc9e83' },
  { id: 'belfry', stone: '#566286', tile: '#3b4668', pale: '#a6b4d0', leaf: '#6d84a4', far: '#29344f', glow: '#afb9dc' },
];
write('terrain', 384, 192, districts.map((d, i) => `<svg x="${i * 128}" width="128" height="192" viewBox="0 0 128 192">` +
  rect(0, 0, 128, 128, d.tile) +
  Array.from({ length: 4 }, (_, row) => Array.from({ length: 3 }, (_, col) => {
    const x = col * 64 - (row % 2 ? 32 : 0), y = row * 32;
    return rect(x + 2, y + 2, 60, 28, d.stone, 3) + path(`M${x + 6} ${y + 6}L${x + 54} ${y + 6}`, 'none', d.pale, 1);
  }).join('')).join('') +
  path('M64 64L72 76L64 88L56 76Z',d.tile) + line(61,76,67,76,d.pale,1) +
  rect(0, 128, 128, 32, ink) + rect(0, 128, 128, 8, cream) + rect(0, 136, 128, 4, gold) +
  Array.from({ length: 8 }, (_, n) => path(`M${n * 16} 146Q${n * 16 + 8} 161 ${n * 16 + 16} 146`, 'none', d.pale, 2)).join('') +
  foliage(23, 192, 25, d.leaf) + foliage(97, 190, 23, d.leaf) + '</svg>').join(''));

// Restrained illustrated-retro architecture: broad silhouettes, two ink values
// and sparse ivory inlay. The roof frames the route instead of a row of tiny arches.
for (const d of districts) {
 let far = '';
 for (let i = -1; i < 4; i++) {
  const x = i * 320;
  far += group(x, 0,
   path('M0 900V175L125 55L250 175V900Z', d.far) +
   path('M22 900V187L125 88L228 187V900Z', d.tile) +
   path('M57 900V230Q125 115 193 230V900Z',d.far) +
   path('M68 680V238Q125 146 182 238V680Z',d.stone) +
   path('M125 181V680M68 325H182M68 490H182','none',d.far,7) +
   line(15,188,15,900,d.pale,1));
 }
 write(`${d.id}-far`,960,900,far);
 let near = '';
 for (let i = 0; i < 2; i++) {
  const x = i * 480;
  near += group(x,0,
   path('M0 900V210Q0 75 240 8Q480 75 480 210V900L449 900V216Q446 113 240 49Q34 113 31 216V900Z',d.far,ink,3) +
   path('M8 900V210Q8 83 240 20Q472 83 472 210V900','none',d.stone,7) +
   path('M29 899V213Q34 113 240 48Q446 113 451 213V899','none',d.pale,2) +
   Array.from({length:8},(_,j)=>line(1,258+j*80,29,258+j*80,d.stone,6)+line(451,258+j*80,479,258+j*80,d.stone,6)).join('') +
   line(6,228,6,900,d.pale,1));
 }
 if (d.id === 'aqueduct') {
  near += wheel(480,430,193,d.stone) + wheel(480,430,175,d.far) +
   foliage(30,650,175,d.leaf) + foliage(927,540,135,d.leaf) +
   flower(35,508,12,'#ba8b86');
  near += path('M664 398Q685 430 675 655','none',d.pale,7) + path('M658 398Q677 430 668 655','none',d.leaf,2);
 } else if (d.id === 'emberworks') {
  for(let i=0;i<2;i++) near += group(i*480+155,180,
   rect(0,0,170,540,d.far,65,ink) + rect(14,12,142,510,d.stone,55) +
   Array.from({length:4},(_,j)=>rect(-7,80+j*114,184,15,d.far,3)+line(0,82+j*114,170,82+j*114,d.pale,2)).join('') +
   ellipse(85,170,49,49,d.far,ink) + ellipse(85,170,38,38,'#b58075') +
   Array.from({length:5},(_,j)=>line(56+j*14,140,56+j*14,200,d.far,5)).join('') + wheel(85,360,35,d.pale));
  near += path('M88 900V230Q88 190 130 190H815Q855 190 855 230V900','none',d.far,19)+
   path('M83 900V230Q83 185 130 185H815Q850 185 850 230V900','none',d.pale,3);
 } else {
  near += group(480,300,
   ellipse(0,0,166,166,d.far,ink) + ellipse(0,0,154,154,d.stone) +
   Array.from({length:12},(_,j)=>`<g transform="rotate(${j*30})">` +
    path('M0 -18Q-53 -83 0 -139Q53 -83 0 -18Z',j%2?d.pale:d.leaf,d.far,6)+'</g>').join('') +
   ellipse(0,0,27,27,d.far) + flower(0,0,15,cream));
  near += foliage(29,670,100,d.leaf) + foliage(932,620,110,d.leaf);
 }
 write(`${d.id}-near`,960,900,near);
}
