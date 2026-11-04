/** Original inked arcade scenery. Committed SVGs are the runtime assets. */
import { writeFileSync } from 'node:fs';
const ink='#10282e', paper='#ead5a6', teal='#6cafa0', brass='#b99a64';
const path=(d,fill,stroke=ink,width=3)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const box=(x,y,w,h,fill,stroke='none',sw=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line=(x,y,x2,y2,color,width=2)=>path(`M${x} ${y}L${x2} ${y2}`,'none',color,width);
const circle=(x,y,r,fill,stroke=ink)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
const text=(value,x,y,size,color=paper)=>`<text x="${x}" y="${y}" font-family="monospace" font-weight="bold" letter-spacing="2" font-size="${size}" fill="${color}">${value}</text>`;
function save(name,w,h,body){writeFileSync(new URL(`./${name}.svg`,import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>\n`);}
let sky=box(0,0,1920,480,'#203d43')+circle(1510,110,48,'#ad9e77','none');
for(let i=0;i<24;i++){
 const x=i*80,h=110+(i*73)%240,y=480-h;
 sky+=box(x,y,74,h,i%2?'#2a474b':'#19343d')+box(x+12,y-12,30,13,'#19343d');
 for(let r=0;r<h/27-1;r++)for(let c=0;c<3;c++)if((i+r*2+c)%5===0)sky+=box(x+12+c*18,y+18+r*27,5,10,'#91875d');
}
save('skyline',1920,480,sky);
function facade(station){
 let s=box(0,0,1920,600,'#233d40');
 for(let i=0;i<3;i++){
  const x=i*640;
  s+=box(x+5,100,630,478,i===1?'#3c524c':'#304a46',ink,6)+box(x,91,640,16,'#87927a',ink,4);
  // Masonry and upper windows stay softer than the figures and the shop signs.
  for(let y=117;y<580;y+=25){s+=line(x+12,y,x+628,y,'#4a6053',1);for(let j=0;j<8;j++)s+=line(x+20+j*80+(y%50?30:0),y,x+20+j*80+(y%50?30:0),y+24,'#486052',1);}
  for(let j=0;j<5;j++){
   const wx=x+43+j*116;
   s+=box(wx,125,73,76,ink)+box(wx+7,131,59,62,(j+i)%3?'#264544':'#839279')+line(wx+37,130,wx+37,193,ink,4)+line(wx+7,163,wx+66,163,ink,4)+box(wx-4,198,81,8,'#71826c',ink);
  }
  s+=box(x+612,112,7,446,'#a69670',ink)+box(x+607,550,22,13,'#a69670',ink);
  if(station){
   s+=box(x+25,232,588,56,ink)+text(i===1?'MAIN CIRCUIT':'CENTRAL GRID',x+58,269,28,i===1?paper:teal)+box(x+27,302,580,261,'#172f34',ink,6);
   if(i===1){
    s+=box(x+132,329,375,216,'#5c7366',ink,6)+box(x+143,340,353,43,'#264642',ink)+text('09 / GRID CONTROL',x+165,370,21,paper);
    for(let j=0;j<3;j++){
     s+=circle(x+204+j*112,429,34,paper)+circle(x+204+j*112,429,25,'#9da58a')+line(x+204+j*112,429,x+219+j*112,411,ink,4);
     s+=box(x+174+j*112,483,62,35,'#203f3f',ink)+box(x+180+j*112,490,18,8,teal)+box(x+208+j*112,490,19,8,brass);
    }
    for(const side of [57,548]){s+=box(x+side,334,33,205,'#405e53',ink);for(let j=0;j<6;j++)s+=box(x+side+7,349+j*30,19,8,j%2?brass:teal);}
   }else{
    for(let j=0;j<2;j++){
     const tx=x+97+j*269;
     s+=box(tx,382,180,159,'#6b7e6c',ink,6)+box(tx+15,393,150,136,'#47655a');
     for(let k=0;k<9;k++)s+=box(tx-10,395+k*15,201,6,'#94a185',ink,1);
     for(let k=0;k<2;k++){
      s+=box(tx+46+k*78,322,10,62,paper,ink);
      for(let z=0;z<5;z++)s+=box(tx+32+k*78,329+z*9,38,5,'#b1b59a',ink,1);
     }
     s+=path(`M${tx+91} 431l-20 30h17l-5 24l24-34h-17Z`,brass);
    }
   }
   s+=box(x+25,563,588,15,ink);
   for(let j=0;j<22;j++)s+=path(`M${x+28+j*26} 563h12l-9 15h-12Z`,brass,'none');
   s+=line(x+70,309,x+570,309,'#93815b',6);
  }else{
   const titles=['LAST TRAIN','NO SIGNAL','BLUE HOUR'];
   s+=box(x+27,232,570,59,ink,paper,2)+text(titles[i],x+58,273,35,i===0?brass:teal);
   s+=text(['NOODLES / LATE SERVICE','RADIO / REPAIRS / PARTS','LAUNDRY / OPEN ALL NIGHT'][i],x+42,315,14,'#adb397');
   s+=box(x+29,333,570,225,ink,ink,6);
   if(i===0){
    s+=box(x+41,347,433,191,'#92704b');
    for(let j=0;j<6;j++)s+=box(x+47+j*69,356,40,12,'#c8a16c')+box(x+53+j*69,431,37,8,'#5d513d')+box(x+57+j*69,439,5,52,'#66583d');
    for(let j=0;j<4;j++)s+=box(x+47+j*117,347,8,192,ink);
    s+=box(x+39,494,436,18,'#b29667',ink)+box(x+485,346,96,195,'#3f5d50',ink)+box(x+495,358,75,85,'#ac9e72',ink);
    s+=path(`M${x+27} 330h570l18 36H13Z`.replace('H13',`H${x+13}`),'#39685c',ink,5);
    for(let j=0;j<16;j++)s+=box(x+26+j*36,351,18,21,j%2?'#74937b':'#c0b28b',ink,1);
    for(const lx of [x+60,x+547])s+=line(lx,366,lx,389,paper,2)+`<ellipse cx="${lx}" cy="410" rx="18" ry="27" fill="#d0a36b" stroke="${ink}" stroke-width="4"/>`+line(lx-13,398,lx+13,398,'#8e693e',2)+line(lx-13,421,lx+13,421,'#8e693e',2);
   }else if(i===1){
    s+=box(x+40,346,386,196,'#274541');
    for(let j=0;j<21;j++)s+=line(x+43,351+j*9,x+422,351+j*9,j%4?'#4f6c5c':'#6b8268',2);
    s+=box(x+443,344,139,199,'#2e4b43',ink,4)+box(x+452,354,120,68,'#72917c',ink);
    for(let j=0;j<3;j++)s+=box(x+463+j*34,371,22,30,'#263f3e',ink)+circle(x+474+j*34,388,6,brass);
    s+=box(x+105,408,200,95,paper,ink,4)+text('KEEP TALKING',x+124,444,18,ink)+text('OFF AIR / 09',x+134,481,14,'#5f6c52');
    s+=box(x+553,462,5,21,paper);
   }else{
    s+=box(x+42,346,537,194,'#4d7567');
    for(let j=0;j<4;j++){
     const lx=x+62+j*129;
     s+=box(lx,397,100,131,'#b1b59a',ink,5)+box(lx+9,406,81,15,'#466359',ink)+circle(lx+50,472,34,ink)+circle(lx+50,472,23,'#527c71')+path(`M${lx+31} 465q18-22 37-1q-18 24-37 1Z`,'#83a18a','none')+box(lx+75,409,7,5,teal);
    }
    for(let j=0;j<4;j++)s+=line(x+174+j*129,346,x+174+j*129,540,ink,7);
   }
  }
  s+=box(x+9,105,15,474,'#728371',ink,4)+box(x+4,577,632,15,'#7e8c76',ink,4);
  // A rear gutter, behind the walkable road, rather than misleading combat obstacles.
  s+=box(x+43,586,97,7,ink);for(let j=0;j<12;j++)s+=line(x+47+j*8,585,x+47+j*8,595,'#829784',2);
 }
 // Railway steel and overhead wiring unite the three distinct storefront silhouettes.
 s+=box(0,46,1920,33,'#1b343a',ink,5)+line(0,51,1920,51,'#6e8271',4);
 for(let x=0;x<1920;x+=120)s+=path(`M${x} 49l54 27l54-27`,'none','#526d62',3)+circle(x+7,60,2,brass,'none');
 s+=`<path d="M0 14Q320 125 640 14Q960 125 1280 14Q1600 125 1920 14" fill="none" stroke="${ink}" stroke-width="5"/>`;
 s+=box(0,594,1920,6,ink);
 return s;
}
save('backstreets',1920,600,facade(false));save('station',1920,600,facade(true));
let floor=box(0,0,1920,480,'#263f3f')+box(0,0,1920,5,'#6c8374')+box(0,5,1920,4,ink);
// Sparse broken ink reflections; no dense perspective grid in the combat lanes.
for(let i=0;i<9;i++){
 const x=i*229+30,y=30+(i%3)*52;
 floor+=path(`M${x} ${y}l130-5 47 10-34 8-137-2Z`,i%3?'#34564d':'#4c6050','none');
 for(let j=0;j<7;j++)floor+=line(x+12+(j%3)*8,y+16+j*9,x+119-j*9,y+16+j*9,i%3?'#4b7362':'#8b7954',j%3?1:2);
 floor+=line(x+30,348,x+108,346,'#877c57',3);
}
save('pavement',1920,480,floor);
save('repair',64,64,path('M9 18L18 10L47 10L56 18L54 49L45 56L15 53L8 45Z','#52c4b3')+path('M10 19L54 19L49 26L14 26Z',paper)+box(15,29,34,18,ink)+path('M29 30L36 30L36 35L42 35L42 41L36 41L36 46L29 46L29 41L23 41L23 35L29 35Z',paper,'none')+line(18,14,44,14,ink,2));
