import { writeFileSync } from 'node:fs';
// Original pixel illustration. Complete cels, baked aim variants and stable soles.
const path=(d,fill)=>`<path d="${d}" fill="${fill}"/>`;
const rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const save=(name,w,h,body)=>writeFileSync(new URL(`${name}.svg`,import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" shape-rendering="crispEdges">${body}</svg>\n`);
const contours=[
 'M17 18H35V22H38V31H34L36 35H42V43H36V49H34V56H39V60H26V49H23V56H25V60H12V56H16V46H14V33H17Z',
 'M17 18H35V22H38V31H34L37 35H42V43H35V48H30L34 55H42V59H29L23 49L18 57H20V60H5V56H12L16 46H14V33H17Z',
 'M17 18H35V22H38V31H34L36 35H42V43H36V49H33L28 57H32V60H19V55L23 48H19L13 56H17V60H4V56L12 51L16 46H14V33H17Z',
 'M17 18H35V22H38V31H34L36 35H42V43H35V48L42 51V56H33L27 51L20 56H9V51H16L19 46H14V33H17Z',
];
let operators='';
for(let role=0;role<2;role++)for(let state=0;state<4;state++)for(let aim=0;aim<5;aim++){
 const suit=role?'#dca54c':'#6cc7b4',dark=role?'#6d654c':'#325861',angle=[-90,-45,0,45,90][aim];
 const figure=path(contours[state],'#142b36')+path('M17 20H34V24H37V29H31V33H20V29H17Z','#d6a186')+path('M15 18H36V23H15Z',dark)+rect(18,18,15,2,suit)+path('M16 33H33L37 36H41V41H33V46H18V41H16Z',suit)+rect(18,41,16,5,dark)+rect(20,36,5,5,'#dce0bc')+rect(30,25,9,3,'#b1fff0')+path('M16 30H24V34H13V32H9V30Z','#e98069')+
 `<g transform="rotate(${angle} 29 37)">${path('M23 33H34V35H42V40H29V38H23Z',suit)}${rect(33,35,9,4,'#e6b79a')}${path(role?'M37 30H58V40H37Z':'M37 33H60V38H48V43H44V38H37Z','#1c303b')}${rect(39,role?30:33,17,2,'#8b9c91')}${role?rect(55,30,3,10,'#cfc99a'):''}</g>`;
 operators+=`<g transform="translate(${aim*64} ${(role*4+state)*64})">${figure}</g>`;
}
save('operators',320,512,operators);
let enemies='';
for(let role=0;role<3;role++)for(let frame=0;frame<3;frame++){
 const c=role?'#846e62':'#687b74';
 const body=role===2?path('M5 44H59V58H5ZM10 24H54V46H10ZM18 12H46V28H18ZM38 31H63V43H38Z','#1c2e36')+rect(12,26,40,16,c)+rect(20,15,24,10,'#42585c')+rect(22,19,22,4,'#f68b60')+rect(39,32,23,8,'#a69e82')+rect(8,48,48,3,'#7d8c80'):
 path(contours[frame], '#142b36')+path('M15 19H36V29H31V33H36V38H58V43H34V47H16V33H15Z',c)+rect(17,19,19,7,'#293d45')+rect(28,23,11,3,'#ffb17b')+rect(40,36,21,5,'#20363f');
 enemies+=`<g transform="translate(${frame*64} ${role*64})">${body}</g>`;
}
save('enemies',192,192,enemies);
const relay=off=>path('M14 5H49V59H14Z','#152c38')+rect(17,9,29,46,'#48676c')+rect(21,15,21,24,off?'#27393d':'#f0bb69')+path(off?'M21 15L42 38L39 41L19 18Z':'M29 17H35V24H39L31 37V28H26Z',off?'#152c38':'#fff0ad');
const barrel=path('M17 7H46V57H17L13 51V14Z','#d26b48')+rect(13,17,37,5,'#593c39')+rect(13,43,37,5,'#593c39')+path('M24 27L39 37M39 27L24 37','none');
const supply=lit=>path('M17 60V5H21V60Z','#7e9485')+rect(21,5,34,19,lit?'#a1e6bc':'#4e6a61')+rect(9,41,39,20,'#31565a')+path('M25 44H32V49H37V55H32V60H25V55H20V49H25Z','#bee5ba');
const cage=path('M3 2H61V7H3ZM3 57H61V62H3ZM5 7H9V57H5ZM22 7H26V57H22ZM39 7H43V57H39ZM56 7H60V57H56Z','#899a8b');
const ship=path('M8 26H44V18H88V24H103L122 33V48H108V54H35V49H16V42H8Z','#28434c')+rect(34,21,51,5,'#55756e')+rect(33,29,26,13,'#b9e5cd')+rect(63,29,20,13,'#6fb6b0')+rect(29,51,77,3,'#91a99a')+rect(27,46,5,9,'#476066')+rect(98,46,5,9,'#476066')+rect(15,10,107,3,'#aac2ad')+rect(67,12,4,9,'#53726b');
save('objects',512,64,[relay(false),relay(true),barrel,supply(false),supply(true),cage,ship].map((body,i)=>`<g transform="translate(${i*64} 0)">${body}</g>`).join(''));
