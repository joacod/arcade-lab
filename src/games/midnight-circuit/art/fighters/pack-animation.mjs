import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

// Mechanical packing of complete connected drawings. No anatomical edits or part assembly.
const root = new URL('./', import.meta.url), quality = new URL('../afterglow/fighters/', import.meta.url);
const source = path => 'data:image/png;base64,' + readFileSync(path).toString('base64');
const inputs = {
  original: source(new URL('fighters.png', root)),
  movement: source(new URL('movement/source.png', root)),
  quality: ['rook','striker','bruiser','warden'].map(role => source(new URL(`${role}-source.png`, quality))),
  walking: ['rook','striker','bruiser','warden'].map(role => source(new URL(`walking/${role}-source.png`, root))),
};
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async inputs => {
    async function load(url) { const image=new Image(); image.src=url; await image.decode(); return image; }
    function inspect(image, columns, rows) {
      const canvas=document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
      const ctx=canvas.getContext('2d'); ctx.drawImage(image,0,0);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height), labels=new Uint32Array(canvas.width*canvas.height), figures=[];
      let id=0;
      for(let start=0;start<labels.length;start++){
        if(labels[start]||pixels.data[start*4+3]<16)continue;
        const label=++id, queue=[start]; labels[start]=label;
        let left=canvas.width,top=canvas.height,right=0,bottom=0;
        for(let n=0;n<queue.length;n++){
          const index=queue[n],x=index%canvas.width,y=Math.floor(index/canvas.width);
          left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
          for(let yy=Math.max(0,y-1);yy<=Math.min(canvas.height-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(canvas.width-1,x+1);xx++){
            const next=yy*canvas.width+xx;
            if(!labels[next]&&pixels.data[next*4+3]>=16){labels[next]=label;queue.push(next);}
          }
        }
        if(queue.length>500)figures.push({id:label,rect:[left,top,right-left+1,bottom-top+1]});
      }
      figures.sort((a,b)=>Math.floor((a.rect[1]+a.rect[3]/2)/(canvas.height/rows))-Math.floor((b.rect[1]+b.rect[3]/2)/(canvas.height/rows))||a.rect[0]-b.rect[0]);
      if(figures.length!==columns*rows)throw new Error(`Expected ${columns*rows} complete figures, got ${figures.length}`);
      function cut(figure){
        const [x,y,w,h]=figure.rect, drawing=document.createElement('canvas');drawing.width=w;drawing.height=h;
        const ctx=drawing.getContext('2d'),data=ctx.createImageData(w,h);
        for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
          const sx=x+xx,sy=y+yy,index=sy*canvas.width+sx,alpha=pixels.data[index*4+3];
          let retain=labels[index]===figure.id;
          // Alpha-one matte RGB is not artwork. Keep only connected antialiased edge coverage.
          if(!retain&&alpha>1&&alpha<16)for(let dy=-1;dy<=1&&!retain;dy++)for(let dx=-1;dx<=1&&!retain;dx++){
            const ax=sx+dx,ay=sy+dy;
            if(ax>=0&&ay>=0&&ax<canvas.width&&ay<canvas.height&&labels[ay*canvas.width+ax]===figure.id)retain=true;
          }
          if(retain)data.data.set(pixels.data.subarray(index*4,index*4+4),(yy*w+xx)*4);
        }
        ctx.putImageData(data,0,0);return drawing;
      }
      return {image,figures,cut,width:canvas.width,height:canvas.height};
    }
    const original=await load(inputs.original), movement=inspect(await load(inputs.movement),6,4);
    const arcade=document.createElement('canvas');arcade.width=4096;arcade.height=1024;const a=arcade.getContext('2d');
    const movementLayout=[];
    for(let row=0;row<4;row++){
      const mapping=[[0,0],[5,3],[6,4],[7,5],[10,6],[11,7]];
      for(const [dest,old]of mapping)a.drawImage(original,old*256,row*256,256,256,dest*256,row*256,256,256);
      const figures=movement.figures.slice(row*6,row*6+6), cellW=movement.width/6,cellH=movement.height/4;
      const standingHeight=figures.slice(0,4).reduce((sum,f)=>sum+f.rect[3],0)/4;
      const scale=216/standingHeight;
      const baseline=figures.slice(0,4).map(f=>f.rect[1]+f.rect[3]-row*cellH).sort((x,y)=>x-y)[2];
      movementLayout.push({scale,baseline,rects:figures.map(f=>f.rect)});
      for(let frame=0;frame<6;frame++){
        const figure=figures[frame], [x,y,w,h]=figure.rect, dest=[1,2,3,4,8,9][frame];
        const dx=128+(x-(frame*cellW+cellW/2))*scale,dy=240+(y-(row*cellH+baseline))*scale;
        if(dx<0||dy<0||dx+w*scale>256||dy+h*scale>256)throw new Error(`Clipped arcade movement ${row}/${frame}`);
        a.drawImage(movement.cut(figure),dest*256+dx,row*256+dy,w*scale,h*scale);
      }
    }
    const modern=document.createElement('canvas');modern.width=8192;modern.height=2048;const q=modern.getContext('2d'),qualityLayout=[];
    for(let row=0;row<4;row++){
      const sheet=inspect(await load(inputs.quality[row]),4,3), cw=sheet.width/4,ch=sheet.height/3;
      const standingHeight=sheet.figures[0].rect[3],scale=(row===3?400:416)/standingHeight;
      const baselines=sheet.figures.slice(0,8).map((f,i)=>f.rect[1]+f.rect[3]-Math.floor(i/4)*ch).sort((x,y)=>x-y);
      const baseline=baselines[4],rects=[];
      for(let frame=0;frame<12;frame++){
        const figure=sheet.figures[frame],[x,y,w,h]=figure.rect;
        let factor=scale,dx=256+(x-(frame%4*cw+cw/2))*factor,dy=480+(y-(Math.floor(frame/4)*ch+baseline))*factor;
        if(frame===11){factor=Math.min(scale,480/w);dx=256-w*factor/2;dy=480-h*factor;}
        if(dx<0||dy<0||dx+w*factor>512||dy+h*factor>512)throw new Error(`Clipped Quality cel ${row}/${frame}: ${[dx,dy,w*factor,h*factor]}`);
        q.drawImage(sheet.cut(figure),frame*512+dx,row*512+dy,w*factor,h*factor);
        rects.push({source:figure.rect,destination:[dx,dy,w*factor,h*factor]});
      }
      qualityLayout.push({source:[sheet.width,sheet.height],baseline,scale,rects});
    }
    const walkingLayout=[];
    for(let row=0;row<4;row++){
      const sheet=inspect(await load(inputs.walking[row]),4,4),cw=sheet.width/4,ch=sheet.height/4;
      const modes=[];
      for(let mode=0;mode<2;mode++){
        const ctx=mode?q:a,cell=mode?512:256,pivot=cell*15/16,figures=sheet.figures.slice(mode*8,mode*8+8);
        const scale=(mode?(row===3?400:416):216)/(figures.reduce((sum,f)=>sum+f.rect[3],0)/8);
        const baseline=figures.map((f,i)=>f.rect[1]+f.rect[3]-(mode*2+Math.floor(i/4))*ch).sort((x,y)=>x-y)[4];
        const rects=[];
        for(let frame=0;frame<8;frame++){
          const figure=figures[frame],drawing=sheet.cut(figure),[x,y,w,h]=figure.rect;
          // Register the upper torso as a whole. Source-cell centering varies between drawings;
          // foot bounding boxes vary intentionally as the free leg passes the planted one.
          const data=drawing.getContext('2d').getImageData(0,0,w,h).data;
          let sum=0,weight=0;
          for(let yy=Math.floor(h*.22);yy<Math.floor(h*.5);yy++)for(let xx=0;xx<w;xx++){
            const alpha=data[(yy*w+xx)*4+3];if(alpha<16)continue;sum+=xx*alpha;weight+=alpha;
          }
          const center=sum/weight;
          const dx=cell/2-center*scale,dy=pivot+(y-(mode*2+Math.floor(frame/4))*ch-baseline)*scale;
          if(dx<0||dy<0||dx+w*scale>cell||dy+h*scale>cell)throw new Error(`Clipped walking cel ${row}/${mode}/${frame}`);
          const dest=[1,12,2,13,3,14,4,15][frame];
          ctx.clearRect(dest*cell,row*cell,cell,cell);
          ctx.drawImage(drawing,dest*cell+dx,row*cell+dy,w*scale,h*scale);
          rects.push({source:[x,y,w,h],destination:[dx,dy,w*scale,h*scale],column:dest});
          if(mode)qualityLayout[row].rects[dest]={sourceSheet:`../../fighters/walking/${['rook','striker','bruiser','warden'][row]}-source.png`,source:[x,y,w,h],destination:[dx,dy,w*scale,h*scale]};
        }
        modes.push({scale,baseline,rects});
      }
      walkingLayout.push({source:[sheet.width,sheet.height],modes});
    }
    return {arcade:arcade.toDataURL('image/webp',.96).split(',')[1],modern:modern.toDataURL('image/webp',.96).split(',')[1],movementLayout,qualityLayout,walkingLayout};
  },inputs);
  writeFileSync(new URL('animated.webp',root),Buffer.from(result.arcade,'base64'));
  writeFileSync(new URL('fighters.webp',quality),Buffer.from(result.modern,'base64'));
  writeFileSync(new URL('movement/layout.json',root),JSON.stringify(result.movementLayout,null,2)+'\n');
  writeFileSync(new URL('layout.json',quality),JSON.stringify(result.qualityLayout,null,2)+'\n');
  writeFileSync(new URL('walking/layout.json',root),JSON.stringify(result.walkingLayout,null,2)+'\n');
  process.stdout.write('Packed 64 arcade cels and 64 separate Quality cels with registered eight-frame walks.\n');
} finally {await browser.close();}
