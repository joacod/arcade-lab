import { writeFileSync } from 'node:fs';

// Original vector artwork. All coordinates are authored here; no external inputs.
const save = (name, width, height, body, view = `0 0 ${width} ${height}`) => writeFileSync(new URL(`${name}.svg`, import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${view}">${body}</svg>\n`);
const path = (d, fill, stroke = 'none', width = 1) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const line = (d, stroke, width = 1) => path(d, 'none', stroke, width);
const circle = (x, y, r, fill, stroke = 'none', width = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const defs = `<defs>
  <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#101b30"/><stop offset=".6" stop-color="#4e6470"/><stop offset="1" stop-color="#b39c82"/></linearGradient>
  <linearGradient id="stone" x2=".8" y2="1"><stop stop-color="#66717a"/><stop offset=".4" stop-color="#303c4b"/><stop offset="1" stop-color="#151d2b"/></linearGradient>
  <linearGradient id="bronze" x2="1" y2=".5"><stop stop-color="#3c343a"/><stop offset=".4" stop-color="#b99465"/><stop offset=".55" stop-color="#dfb980"/><stop offset="1" stop-color="#55434a"/></linearGradient>
  <linearGradient id="floor" x2="0" y2="1"><stop stop-color="#6f7a7d"/><stop offset=".14" stop-color="#465461"/><stop offset="1" stop-color="#162331"/></linearGradient>
  <radialGradient id="halo"><stop stop-color="#efb66f" stop-opacity=".4"/><stop offset="1" stop-color="#e9bc7b" stop-opacity="0"/></radialGradient>
  <radialGradient id="mist"><stop stop-color="#9eb7b5" stop-opacity=".22"/><stop offset="1" stop-color="#9eb7b5" stop-opacity="0"/></radialGradient>
  <radialGradient id="vignette"><stop offset=".45" stop-color="#071222" stop-opacity="0"/><stop offset="1" stop-color="#071222" stop-opacity=".8"/></radialGradient>
</defs>`;
let stage = defs + rect(0, 0, 1000, 560, 'url(#sky)');
// Deliberately quiet negative space behind heads; ornamental density stays high or at the edges.
for (let i = 0; i < 78; i++) stage += circle((i * 173 + 29) % 1000, (i * 67) % 242, i % 6 === 0 ? 1 : .5, '#d4d8cc', 'none');
stage += circle(500, 173, 225, 'url(#halo)') + circle(500, 173, 89, '#d5a46a') + circle(500, 173, 83, '#242937') + circle(500, 173, 82, 'none', '#f5d29a', 1.5);
stage += `<ellipse cx="500" cy="173" rx="172" ry="43" fill="none" stroke="url(#bronze)" stroke-width="8" transform="rotate(-23 500 173)"/>`;
stage += `<ellipse cx="500" cy="173" rx="150" ry="112" fill="none" stroke="#8f795e" stroke-width="2" transform="rotate(25 500 173)"/>`;
for (let i = 0; i < 32; i++) {
  const a = i * Math.PI / 16, x = 500 + Math.cos(a) * 117, y = 173 + Math.sin(a) * 117;
  stage += line(`M${x} ${y} l${Math.cos(a) * (i % 4 ? 5 : 12)} ${Math.sin(a) * (i % 4 ? 5 : 12)}`, '#c3a173', i % 4 ? .8 : 2);
}
for (let layer = 0; layer < 3; layer++) {
  let d = 'M0 420';
  for (let i = 0; i <= 21; i++) { const x = i * 50, y = 255 + layer * 34 + (i * 47 % 71); d += `L${x} ${y + 35} L${x + 13} ${y - 18} L${x + 34} ${y + 4} L${x + 41} ${y + 37}`; }
  stage += path(d + 'L1000 440H0Z', ['#344654', '#3c505a', '#415660'][layer]);
}
// The distant aqueduct belongs to the observatory, not the traversable lane.
for (let i = 0; i < 17; i++) {
  const x = i * 65 - 25;
  stage += path(`M${x} 368V307h63v61h-10v-30q-21-35-43 0v30Z`, '#293d49');
  stage += line(`M${x} 309h63`, '#89908a', 1);
}
stage += `<ellipse cx="500" cy="376" rx="570" ry="64" fill="url(#mist)"/>`;
for (const mirror of [false, true]) {
  stage += `<g${mirror ? ' transform="translate(1000 0) scale(-1 1)"' : ''}>`;
  stage += path('M0 0H94L80 81 98 100 77 108 75 399H0Z', '#192737');
  stage += path('M31 0H68L60 81 69 111 60 398H28Z', 'url(#stone)');
  stage += line('M65 6L56 82 67 108 58 390', '#c0a07a', 2);
  stage += path('M3 100H94L105 114 85 126H0Z', 'url(#bronze)');
  stage += path('M35 389H88L112 420H0V410Z', 'url(#stone)');
  stage += path('M95 129L151 137 143 260 121 247 104 270Z', '#214c58', '#7c998b');
  stage += path('M114 151L136 173 119 196 104 174Z', 'none', '#d3ba88', 2);
  stage += line('M113 212l17 0M112 219h16M111 226h12', '#71968e');
  stage += path('M118 0L139 27 134 81 121 95 110 73 108 31Z', '#263846', '#60777a');
  stage += line('M124 21v48M118 38l12 12-10 10', '#b2b19a');
  stage += circle(78, 351, 66, 'url(#halo)');
  stage += path('M64 358L56 348 97 348 90 359 88 399H67Z', 'url(#bronze)');
  stage += path('M64 347Q52 327 72 308L70 327 85 296Q107 333 87 347Z', '#e4a774');
  stage += path('M70 345Q66 333 81 318L79 333 85 329 83 345Z', '#ffe0a1');
  stage += '</g>';
}
stage += path('M0 403H1000V418H0Z', '#233541') + line('M0 404H1000', '#9d9f8e', 2);
for (let x = 22; x < 1000; x += 44) stage += path(`M${x} 405v-27l7-5 7 5v27`, '#304652', '#566a6d');
stage += rect(0, 420, 1000, 140, 'url(#floor)') + line('M0 422H1000M0 429H1000', '#c7b58c', 1);
for (let i = -8; i <= 8; i++) stage += line(`M${500 + i * 63} 430L${500 + i * 138} 560`, '#111e2f', 1.3);
for (const y of [447, 477, 522]) stage += line(`M0 ${y}H1000M0 ${y + 1}H1000`, '#72838430', 1);
stage += `<ellipse cx="500" cy="467" rx="281" ry="33" fill="none" stroke="#b69e76" stroke-width="1.5"/><ellipse cx="500" cy="467" rx="263" ry="27" fill="none" stroke="#a192743b"/>`;
for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16; stage += line(`M${500 + Math.cos(a) * 269} ${467 + Math.sin(a) * 28}L${500 + Math.cos(a) * 279} ${467 + Math.sin(a) * 32}`, '#bca67c', 1); }
stage += path('M469 467l31-14 31 14-31 14Z', 'none', '#bcaa81') + line('M485 467h30M500 460v14', '#bcaa81');
for (let i = 0; i < 70; i++) { const x = i * 137 % 1000, y = 435 + i * 31 % 122; stage += line(`M${x} ${y}h${5 + i % 17}`, i % 2 ? '#d0c3a51b' : '#09172844', .7); }
stage += rect(0, 0, 1000, 560, 'url(#vignette)');
save('stage', 1600, 896, stage, '0 0 1000 560');

let effects = '';
// Four 128-square cells: bolt, strike, guard, ground seal. Anchors are their centers.
effects += path('M4 65L44 54 55 35 92 46 122 64 88 80 53 92 43 74Z', '#29778388')
  + path('M28 64L63 43 106 64 64 84Z', '#94ffe7', '#e9ffe2', 2) + path('M51 64L71 54 91 64 68 73Z', '#f4ffe9');
effects += `<g transform="translate(128 0)">${path('M64 3L71 45 107 17 82 53 125 64 80 73 109 112 72 83 64 127 55 83 17 109 44 72 1 64 45 55 18 19 55 44Z', '#ffce8e')}${path('M64 27L72 54 100 64 73 74 64 102 54 75 28 64 53 55Z', '#fff9d6')}</g>`;
effects += `<g transform="translate(256 0)">${path('M64 8L110 34 105 85 64 121 23 85 18 34Z', '#71d8dc22', '#c4ffff', 4)}${line('M64 20L95 40 91 78 64 104 38 79 33 41Z', '#6ac1d2', 2)}${line('M64 36v53M42 62h44', '#ecffff', 3)}</g>`;
effects += `<g transform="translate(384 0)">${circle(64, 64, 49, 'none', '#b9b18a', 2)}${circle(64, 64, 40, 'none', '#90cebe', 1)}${path('M64 26L83 64 64 102 44 64Z', 'none', '#c3ddc7', 2)}</g>`;
save('effects', 512, 128, effects);
