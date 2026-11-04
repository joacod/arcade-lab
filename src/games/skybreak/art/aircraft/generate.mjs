import { writeFileSync } from 'node:fs';
const path=(d,fill,stroke='#17394b',width=1.5)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const roles=['fighter','scout','raider','gunship','interceptor','flagship'];
for(const [index,role] of roles.entries()) {
 const boss=role==='flagship',w=boss?336:64,h=boss?168:role==='fighter'?80:64;
 const colors=['#e8efcf','#d68b67','#e5b568','#a995bd','#bfddd6','#526b7c'];
 const base=colors[index];
 let frames='';
 for(let f=0;f<6;f++){
  let figure;
  if(boss)figure=path('M0 96L13 66L112 34L145 2H191L224 34L323 66L336 96L280 119L211 103L193 152H143L125 103L56 119Z',base,'#aabcb3',2)+path('M125 42L151 17H185L211 42L196 118L168 144L140 118Z','#203b4a','#b8c7ad')+path('M22 84L133 61M314 84L203 61M71 95L131 76M265 95L205 76','none','#b8c7ad',3)+path('M157 24H179L188 63L168 78L148 63Z','#8fb7b3');
  else {
   const span=index===3?30:index===4?18:index===2?23:28;
   figure=path(`M${32-span} 42L${35-span} 34L25 23L28 6L32 2L36 6L39 23L${29+span} 34L${32+span} 42L39 39L37 55L45 61V65L32 62L19 65V61L27 55L25 39Z`,base)+path('M28 25L32 18L36 25L35 44H29Z','#173c57','#b2d3c6')+path(`M${37-span} 36H25M39 36H${27+span}`,'none','#617b7e',2)+path('M28 50H36V57H28Z','#bba572')+path('M27 11H37','none','#f8eccc',1);
   // Exhaust is authored into the complete cel, never another animated actor part.
   figure+=path(`M29 63H35L34 ${h-1-(f%3)}H30Z`,'#e4b576','none');
  }
  frames+=`<g transform="translate(${f*w} 0)">${!boss && h===64 ? `<g transform="translate(0 1) scale(1 .94)">${figure}</g>` : figure}</g>`;
 }
 writeFileSync(new URL(`normal-${role}.svg`,import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="${w*6}" height="${h}" viewBox="0 0 ${w*6} ${h}">${frames}</svg>\n`);
}
