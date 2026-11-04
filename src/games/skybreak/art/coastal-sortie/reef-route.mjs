import { writeFileSync } from 'node:fs';
// Editable pixel scenery. Large reefs stay outside the central combat corridor.
let art = '<rect width="480" height="1600" fill="#123b4c"/>';
const random = n => { const v = Math.sin(n * 127.1 + 31.7) * 43758.5; return v - Math.floor(v); };
for (let i=0;i<560;i++) {
 const x=Math.floor(random(i+3)*120)*4,y=Math.floor(random(i+1800)*400)*4;
 art+=`<path d="M${x} ${y}h${4+Math.floor(random(i+900)*5)*4}v4h-8v4" fill="none" stroke="${i%5?'#235363':'#326b73'}" stroke-width="2" opacity="${i%5?'.48':'.6'}"/>`;
}
const shore='M-64-60h28v-20h48v12h32v20h20v32h16v48H60v36H32v20H-8V72h-36V48h-20Z';
for (const [i,x,y,flip] of [[0,24,180,1],[1,463,470,-1],[2,4,790,1],[3,480,1160,-1],[4,22,1400,1]]) {
 art+=`<g transform="translate(${x} ${y}) scale(${flip} 1)"><path d="${shore}" fill="#1d6370" stroke="#205362" stroke-width="24"/><path d="${shore}" fill="#aaad7d" stroke="#73a99b" stroke-width="10"/><path d="${shore}" transform="scale(.79 .83)" fill="#41694f" stroke="#78875d" stroke-width="8"/>`;
 for(let j=0;j<45;j++) {
  const xx=Math.floor((random(i*80+j+41)*76-38)/4)*4,yy=Math.floor((random(i*80+j+201)*110-52)/4)*4;
  art+=`<path d="M${xx} ${yy}h12v-4h8v8h4v8H${xx}Z" fill="${['#2b5145','#50785a','#688868'][j%3]}"/>`;
 }
 art+='<path d="M30 38h18v8H30ZM-40-32h12v8h-12Z" fill="#b7af83"/><path d="M42 58h6v48h-6Z" fill="#a99572"/><path d="M40 70h10m-10 8h10m-10 8h10m-10 8h10" stroke="#4b6460" stroke-width="2"/></g>';
}
writeFileSync(new URL('reef-route.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="1600" viewBox="0 0 480 1600" shape-rendering="crispEdges">${art}</svg>\n`);
