/** Original Signal / Rain artwork. Run with Node; outputs are committed runtime assets. */
import { writeFileSync } from 'node:fs';
const ink = '#10282e', cream = '#f5e3b9', teal = '#52c4b3', red = '#e96547';
const path = (d, fill, stroke = ink, width = 3) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const box = (x,y,w,h,fill,stroke='none',sw=2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line = (x,y,x2,y2,color,width=2) => `<path d="M${x} ${y}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
const circle = (x,y,r,fill,stroke=ink) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const text = (value,x,y,size,color=cream) => `<text x="${x}" y="${y}" font-family="monospace" font-weight="bold" font-size="${size}" fill="${color}">${value}</text>`;
function save(name,w,h,body,defs='') { writeFileSync(new URL(`./${name}.svg`,import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>\n`); }
const roles = [
  { coat:teal, light:'#9ae0c4', dark:'#237669', trim:red, skin:'#e8b487' },
  { coat:'#d85d45', light:'#f39a6a', dark:'#893f38', trim:cream, skin:cream },
  { coat:'#c19350', light:'#edd49b', dark:'#765137', trim:red, skin:'#d9b58a' },
  { coat:cream, light:'#fff7d9', dark:'#9b9e87', trim:red, skin:cream },
];
let atlas='';
for (let row=0;row<roles.length;row++) {
  const p=roles[row], boss=row===3;
  const hatch=Array.from({length:4},(_,i)=>line(18,33+i*5,24,29+i*5,p.dark,1)).join('');
  const head = row===0
    ? path('M18 24L30 19L43 24L46 36L53 41L46 45L43 57L27 56L17 45Z',p.skin)+path('M14 36L16 18L28 9L42 15L48 27L35 25L25 37L21 43L16 41Z',ink)+path('M16 21L40 19L45 25L17 28Z',cream)+line(40,37,46,38,ink,2)+line(34,50,43,51,'#af614b',2)
    : path(boss?'M13 26L12 12L24 20L38 18L49 9L48 30L52 44L42 58L20 56L12 43Z':'M14 28L23 15L41 17L50 30L49 47L39 57L21 55L13 43Z',p.skin)+path('M14 31L49 30L53 39L44 46L16 43Z',ink)+path('M20 34L45 34L43 38L20 39Z',p.trim,'none')+path('M20 47L42 49L39 54L24 52Z',p.dark,'none')+line(18,24,39,23,p.light,2);
  const torso = path(boss?'M9 13L23 6L42 8L57 20L49 36L50 57L14 59L10 38L4 26Z':'M15 12L27 8L42 11L53 26L46 54L18 61L9 47L10 26Z',p.coat)+path('M17 15L27 12L28 47L19 53L13 43Z',p.light,'none')+path('M31 13L38 15L42 52L31 53Z',ink,'none')+path('M13 49L49 46L48 53L15 56Z',p.dark)+box(30,48,9,6,cream,ink,1)+hatch;
  const chest = boss ? circle(32,31,12,ink)+circle(32,31,8,red)+path('M34 22L27 33L33 32L30 41L39 29L33 30Z',cream,'none') : row===0 ? path('M13 11L28 7L43 10L42 17L21 19L10 14Z',red)+path('M12 15L3 16L1 38L9 34L16 18Z',red) : box(36,23,10,6,p.trim)+line(40,22,40,30,ink,1);
  const segment=(fill,armored=false)=>path(armored?'M22 5L41 5L46 18L41 46L24 49L18 37L19 16Z':'M23 5L39 6L43 18L39 47L25 48L20 34L20 15Z',fill)+path('M23 10L29 9L28 39L24 40Z',p.light,'none')+path('M23 37L40 36L39 44L25 46Z',p.dark,'none')+line(34,13,38,24,p.dark,1);
  const parts=[head,torso+chest,segment(p.coat,boss),segment(p.coat,boss)+path('M21 31L42 30L41 44L25 47Z',boss?p.trim:cream)+line(25,34,38,34,p.dark,1)+line(25,38,38,38,p.dark,1),segment('#294348',row>1),segment('#294348',row>1)+path('M22 7L40 7L41 24L23 27Z',row>1?p.coat:'#43625d')+line(26,12,35,12,p.light,2),path('M21 36L39 36L42 46L57 49L59 57L18 57L16 50Z',ink)+path('M20 49L55 50L55 54L20 54Z',p.trim,'none')+line(24,41,35,41,p.light),path('M22 23L39 21L47 29L45 40L24 43L19 34Z',boss?p.trim:row===0?cream:p.coat)+line(29,26,29,37,p.dark,1)+line(34,25,34,36,p.dark,1)];
  parts.forEach((part,col)=>{ atlas+=`<g transform="translate(${col*64} ${row*64})">${part}</g>`; });
}
save('fighters',512,256,atlas);
let sky=box(0,0,960,320,'#203d43')+circle(746,65,40,'#e1bf83','none')+circle(733,57,40,'#203d43','none');
for(let i=0;i<20;i++) {const x=i*50,h=75+(i*73)%230,y=320-h;sky+=box(x,y,46,h,i%2?'#284b4e':'#17333b')+box(x+7,y-8,18,9,'#17333b');for(let r=0;r<h/20-1;r++)for(let c=0;c<3;c++) if((i+r+c)%3===0) sky+=box(x+8+c*11,y+14+r*20,4,7,'#b09c66');}
for(let i=0;i<30;i++) sky+=line(i*39,180,i*39-100,320,'#3c6260',1);
save('skyline',960,320,sky);
function facade(station) {
 let s=box(0,0,960,340,'#253c3d');
 for(let i=0;i<3;i++) {
  const x=i*320;
  s+=box(x+3,18,314,310,'#35504b',ink,5)+box(x+10,25,300,12,'#718475')+box(x+15,41,290,45,ink)+text(station?['GRID / 04','DANGER // 06','TRANSFORMER'][i]:['DEAD FREQUENCY','ALL NIGHT / 24','RADIO REPAIR'][i],x+27,70,station?20:21,i%2?teal:'#dbab72');
  if(station) {
   s+=box(x+28,102,264,210,'#1b3338',ink,3);
   for(let j=0;j<2;j++) {const a=x+62+j*138;s+=path(`M${a} 154L${a+9} 128L${a+48} 128L${a+62} 154L${a+62} 287L${a} 287Z`,'#89917a')+box(a+8,153,45,129,'#63796a');for(let k=0;k<7;k++)s+=box(a-8,161+k*16,78,6,'#a1a48b',ink,1);s+=line(a+30,129,a+30,103,cream,4)+path(`M${a+35} 191L${a+17} 220L${a+32} 219L${a+25} 242L${a+46} 211L${a+32} 212Z`,red);}
   for(let j=0;j<12;j++)s+=path(`M${x+20+j*24} 306l12 0l-9 14l-12 0Z`,'#d3ad6a','none');
  } else {
   s+=box(x+24,102,176,216,'#1a3036',ink,4);
   for(let j=0;j<19;j++)s+=line(x+28,113+j*10,x+197,113+j*10,j%3?'#4a6258':'#69806b',2);
   s+=path(`M${x+24} 102l176 0l22 21l-176 0Z`,'#b46747')+box(x+218,102,76,217,'#172f35',ink,3)+box(x+227,114,57,89,'#739084');
   for(let j=0;j<3;j++)s+=line(x+227,138+j*25,x+284,138+j*25,ink,5);
   s+=box(x+225,216,61,96,'#3d5b52')+line(x+272,248,x+272,264,cream,3)+box(x+61,173,69,61,'#d8c28f',ink)+text(['LISTEN','NO GRID','KEEP ON'][i],x+67,198,11,ink)+line(x+67,210,x+121,210,red,4)+text('MC / 19',x+72,225,8,ink);
   s+=box(x+230,3,66,39,'#718474',ink,3)+circle(x+262,23,14,'#29494a')+line(x+252,12,x+273,34,'#aeb599')+line(x+252,34,x+273,12,'#aeb599');
  }
  s+=line(x+9,88,x+9,327,'#a0926e',3)+box(x,327,320,13,ink);
  for(let j=0;j<10;j++)s+=line(x+25+j*29,92,x+34+j*29,98,'#476257',1);
 }
 s+=`<path d="M0 2Q240 79 480 4Q720 79 960 2" fill="none" stroke="${ink}" stroke-width="5"/>`;
 return s;
}
save('backstreets',960,340,facade(false));save('station',960,340,facade(true));
let ground=box(0,0,960,240,'#314b48')+box(0,0,960,9,'#93a28a')+box(0,9,960,5,ink);
for(let i=0;i<8;i++){const x=i*120;ground+=path(`M${x+4} 23l78 -2l28 10l-13 6l-81 -2Z`,'#729383','none')+path(`M${x+24} 90l68 -4l21 8l-16 5l-84 1Z`,'#3f6960','none')+line(x+35,140,x+83,137,'#a6885d',3)+line(x+38,148,x+107,144,'#a6885d',2)+line(x+10,15,x-58,240,'#203d3d',1);for(let k=0;k<7;k++)ground+=line(x+20+k*8,35+k*8,x+48+k*8,35+k*8,i%2?'#42776c':'#946249',1);}
for(let j=0;j<3;j++)ground+=line(0,60+j*70,960,60+j*70,'#203d3d',1);
save('pavement',960,240,ground);
save('repair',64,64,path('M9 18L18 10L47 10L56 18L54 49L45 56L15 53L8 45Z',teal)+path('M10 19L54 19L49 26L14 26Z',cream)+box(15,29,34,18,ink)+path('M29 30L36 30L36 35L42 35L42 41L36 41L36 46L29 46L29 41L23 41L23 35L29 35Z',cream,'none')+line(18,14,44,14,ink,2));
