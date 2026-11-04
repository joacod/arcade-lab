import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
// Inspected source rectangles, including the wide complete fortress, not grid assumptions.
const crops = {
 quality: [[0,0,363,360],[382,0,326,355],[720,0,365,356],[1086,0,362,356],[0,370,292,338],[292,382,570,284],[875,385,232,286],[1170,390,254,281],[36,746,288,302],[428,717,224,367],[752,728,300,331],[1090,712,358,374]],
 assets: [[0,0,363,355],[373,0,340,350],[717,0,370,350],[1090,0,358,351],[0,373,270,337],[270,390,558,277],[850,416,228,240],[1172,413,244,242],[62,777,242,252],[438,713,205,373],[748,733,304,315],[1088,760,360,288]],
};
const browser = await chromium.launch();
try {
 const page = await browser.newPage();
 for (const mode of ['assets','quality']) {
  const source = 'data:image/png;base64,' + readFileSync(new URL(`${mode}-source.png`, import.meta.url)).toString('base64');
  const data = await page.evaluate(async ({source,crops,mode}) => {
   const image = new Image(); image.src = source; await image.decode();
   const cell = mode === 'quality' ? 256 : 96;
   const canvas = document.createElement('canvas'); canvas.width = cell * 4; canvas.height = cell * 3;
   const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
   // Tight crop the transparent padding, then pack whole illustrations into stable center pivots.
   const probe = document.createElement('canvas'); probe.width=image.width; probe.height=image.height;
   const pc = probe.getContext('2d'); pc.drawImage(image,0,0);
   const pixels = pc.getImageData(0,0,image.width,image.height).data;
   for (const [i,[x,y,w,h]] of crops.entries()) {
    if (i === 5) continue; // The fortress has a dedicated larger hull sheet.
    let left=x+w,top=y+h,right=x,bottom=y;
    for(let yy=y;yy<Math.min(image.height,y+h);yy++)for(let xx=x;xx<Math.min(image.width,x+w);xx++) {
     if(pixels[(yy*image.width+xx)*4+3] > 128) {left=Math.min(left,xx);top=Math.min(top,yy);right=Math.max(right,xx);bottom=Math.max(bottom,yy);}
    }
    const width=right-left+1,height=bottom-top+1,fit=(cell-8)/Math.max(width,height);
    const dw=width*fit,dh=height*fit;
    ctx.drawImage(image,left,top,width,height, i%4*cell+(cell-dw)/2,Math.floor(i/4)*cell+(cell-dh)/2,dw,dh);
   }
   return canvas.toDataURL('image/png').split(',')[1];
  }, {source,crops:crops[mode],mode});
  writeFileSync(new URL(`${mode}-fleet.png`,import.meta.url),Buffer.from(data,'base64'));
 }
 const hullSource = 'data:image/png;base64,' + readFileSync(new URL('fortress-source.png',import.meta.url)).toString('base64');
 for (const mode of ['quality','assets']) {
  const result = await page.evaluate(async ({source,mode}) => {
   const image=new Image();image.src=source;await image.decode();
   const c=document.createElement('canvas');c.width=mode==='quality'?768:288;c.height=c.width/3;
   const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';
   ctx.drawImage(image,0,mode==='quality'?0:512,1536,512,0,0,c.width,c.height);
   const d=ctx.getImageData(0,0,c.width,c.height).data;
   return {png:c.toDataURL('image/png').split(',')[1], alpha:[d[3],d[(Math.floor(c.height/2)*c.width)*4+3],d[((c.height-1)*c.width+c.width-1)*4+3]]};
  },{source:hullSource,mode});
  console.log(mode, 'hull margin alpha',result.alpha);
  writeFileSync(new URL(`${mode}-fortress.png`,import.meta.url),Buffer.from(result.png,'base64'));
 }
} finally { await browser.close(); }
