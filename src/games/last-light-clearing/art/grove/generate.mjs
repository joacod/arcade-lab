import { writeFileSync } from 'node:fs';
// Original whole silhouettes: each frame is an independently drawn complete creature.
const path = (d,fill,stroke='#172c37',width=2) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const circle = (x,y,r,c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
{
 let body = '';
 for (let row=0;row<3;row++) for (let frame=0;frame<4;frame++) {
  const contours = [
   'M10 17Q22 7 38 13L50 22L58 27L55 38L45 40Q25 56 10 46L14 34Z',
   'M10 19Q22 9 38 14L50 23L58 28L55 39L45 41Q25 54 10 44L14 33Z',
   'M11 16Q22 8 38 13L51 23L58 28L55 37L44 39Q25 55 11 47L14 34Z',
   'M10 18Q22 10 38 14L50 22L58 27L55 38L45 40Q25 53 10 45L14 34Z',
  ];
  const crawlers = [
   'M8 21L15 20L13 13L24 16Q35 7 47 18L54 17L52 25L59 29L56 36L49 38L53 47L44 44Q33 56 23 47L13 51L15 42L6 40L10 33L4 28Z',
   'M6 22L15 23L12 14L24 17Q35 8 47 18L56 20L52 27L59 30L55 36L48 39L50 49L43 44Q33 55 23 46L11 49L16 41L7 39L11 32L5 28Z',
   'M8 20L15 20L15 11L25 16Q35 7 47 18L53 15L52 25L59 29L56 36L50 38L55 45L44 44Q33 56 23 47L15 53L15 42L5 42L10 33L4 28Z',
   'M6 21L15 22L13 14L24 17Q35 8 47 18L56 19L52 27L59 30L55 36L49 39L52 49L43 44Q33 55 23 46L11 50L16 41L7 39L11 32L5 28Z',
  ];
  let figure;
  if (row===0) figure = path(contours[frame],'#b7c7a0') + path('M22 17Q32 10 40 20L46 28L39 39Q28 45 20 35Z', '#304a45') + path('M37 20L50 24L55 30L50 38L40 39L36 31Z','#cfa35c') + path('M40 25L49 27L49 34L40 35Z','#f8efbd') + path('M17 23Q13 34 19 42','none','#f2dfaa',2);
  else figure = path(crawlers[frame],row===2?'#96728d':'#ae7974') + path('M17 23Q25 10 38 17L42 27L38 44Q25 50 17 39Z','#8d5f67') + path('M29 17L27 44','none','#ceb0a1',2) + circle(47,26,3,'#fff0c5') + circle(47,36,3,'#fff0c5') + (row===2?path('M19 15L19 5L28 16L37 6L38 19M17 42L20 58L29 47L39 57L39 44','#d6b57d'): '');
  body += `<g transform="translate(${frame*64} ${row*64})">${figure}</g>`;
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="192" viewBox="0 0 256 192">${body}</svg>\n`;
 writeFileSync(new URL('actors.svg',import.meta.url),svg);
}
writeFileSync(new URL('gem.svg',import.meta.url),'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M16 2L28 13L23 27L10 30L3 18Z" fill="#74dcab" stroke="#193d36" stroke-width="2"/><path d="M16 2L18 16L3 18M18 16L23 27M18 16L28 13" fill="none" stroke="#ddffe2" stroke-width="2"/></svg>');
