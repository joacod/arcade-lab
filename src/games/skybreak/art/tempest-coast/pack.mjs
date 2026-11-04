import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const source='data:image/png;base64,'+readFileSync(new URL('source.png',import.meta.url)).toString('base64');
const browser=await chromium.launch();
try {
 const page=await browser.newPage();
 const data=await page.evaluate(async source=>{
  const image=new Image();image.src=source;await image.decode();
  const c=document.createElement('canvas');c.width=1024;c.height=1536;
  c.getContext('2d').drawImage(image,0,0,c.width,c.height);
  return c.toDataURL('image/webp',.9).split(',')[1];
 },source);
 writeFileSync(new URL('backdrop.webp',import.meta.url),Buffer.from(data,'base64'));
}finally{await browser.close();}
