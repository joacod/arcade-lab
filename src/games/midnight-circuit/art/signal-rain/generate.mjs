/** Original Signal / Rain artwork. Run with Node; outputs are committed runtime assets. */
import { writeFileSync } from 'node:fs';
const ink = '#10282e', cream = '#f5e3b9', teal = '#52c4b3', red = '#e96547';
const path = (d, fill, stroke = ink, width = 3) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const box = (x,y,w,h,fill,stroke='none',sw=2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line = (x,y,x2,y2,color,width=2) => `<path d="M${x} ${y}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
const circle = (x,y,r,fill,stroke=ink) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const text = (value,x,y,size,color=cream) => `<text x="${x}" y="${y}" font-family="monospace" font-weight="bold" font-size="${size}" fill="${color}">${value}</text>`;
function save(name,w,h,body,defs='') { writeFileSync(new URL(`./${name}.svg`,import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>\n`); }
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
