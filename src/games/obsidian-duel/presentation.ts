import { createImageResource } from '../../engine/browser/images.ts';
import { fighterImages, validateDuelSprites } from './asset-art.ts';
import { themes, type DuelTheme } from './themes.ts';
import { arena, fighters } from './content.ts';
import type { DuelEvent, Fighter, Match } from './game.ts';
import type { Screen } from './ui.ts';
import type { ImageBundle } from '../../engine/browser/images.ts';
import { drawFoundryFighter, drawFoundryEffect } from './asset-presentation.ts';
import type { SanctumDrawing, SanctumDrawingFactory } from './quality-presentation.ts';
import { createDuelAnimation, type AnimationSample } from './animation.ts';
export function duelView(width: number, height: number) {
  const scale = Math.min(width / arena.width, height / arena.height);
  return { scale, left: (width - arena.width * scale) / 2, top: (height - arena.height * scale) / 2 };
}
/** Cues follow the actual move windows, including misses, rather than predicting CPU decisions. */
export function duelCue(f: Fighter): { text: string; opening: boolean } | null {
  const s = f.attack;
  if (!s) return null;
  if (f.state === 'recovery') {
    return s.kind === 'heavy' || s.kind === 'sweep' || s.kind === 'special' && f.kind === 'kael'
      ? { text: 'RECOVERING', opening: true } : null;
  }
  if (f.state !== 'startup' && f.state !== 'active') return null;
  if (s.kind === 'sweep') return { text: 'LOW · CROUCH GUARD', opening: false };
  if (s.kind === 'air') return { text: 'OVERHEAD · STAND GUARD', opening: false };
  if (s.kind === 'special' && f.kind === 'nera') return { text: 'BOLT · GUARD / JUMP', opening: false };
  if (s.kind === 'heavy' || s.kind === 'special') return { text: 'HEAVY · GUARD / EVADE', opening: false };
  return null;
}
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string }
interface Impact { x: number; y: number; life: number; blocked: boolean; color: string }
export function createPresentation(surface: HTMLElement) {
  const canvas = document.createElement('canvas'); canvas.className = 'duel-canvas';
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D is unavailable.');
  const ctx = context; surface.append(canvas);
  const baseline = createImageResource(fighterImages, validateDuelSprites);
  let theme = themes.normal;
  let art: ImageBundle | undefined;
  let quality: SanctumDrawing | undefined;
  const animations = [createDuelAnimation(), createDuelAnimation()];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let sparks: Spark[] = [], impacts: Impact[] = [], shake = 0, last: number | undefined, disposed = false;
  function rect(x: number, y: number, w: number, h: number, fill: string | CanvasGradient) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
  function path(points: number[], color: string, width = 2, closed = false) {
    ctx.beginPath(); ctx.moveTo(points[0]!, points[1]!);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i]!, points[i + 1]!);
    if (closed) { ctx.closePath(); ctx.fillStyle = color; ctx.fill(); }
    else { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
  }
  function oval(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  }
  function glow(x: number, y: number, radius: number, color: string) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, color); g.addColorStop(1, '#10121b00');
    rect(x - radius, y - radius, radius * 2, radius * 2, g);
  }
  function scenery(t: number, reduced: boolean) {
    if (art) {
      ctx.drawImage(art.stage!, 0, 0, 1000, 560);
      // Subtle atmospheric motion stays behind the action and honors reduced motion.
      if (!reduced) for (let i = 0; i < 12; i++) {
        const x = (i * 89 + t * (3 + i % 3)) % 1000, y = 200 + (i * 47) % 200 - Math.sin(t * .4 + i) * 9;
        oval(x, y, .8, .8, '#f9cc8a66');
      }
      return;
    }
    // Normal deliberately leaves the lane quiet: simple sky, distant citadel and a flat terrace.
    const sky = ctx.createLinearGradient(0, 0, 0, 440);
    sky.addColorStop(0, theme.sky[0]); sky.addColorStop(1, theme.sky[1]);
    rect(0, 0, 1000, 560, sky);
    oval(570, 135, 43, 43, '#b7bacd');
    path([0,330,110,275,240,326,360,243,500,318,650,261,780,323,900,271,1000,320,1000,440,0,440], theme.mountain, 1, true);
    rect(0, 383, 1000, 57, '#252b3b');
    rect(0, 383, 1000, 6, '#626477');
    for (const x of [32, 932]) { rect(x, 225, 36, 215, '#262b3c'); rect(x - 7, 219, 50, 10, '#666479'); }
    rect(0, 420, 1000, 140, theme.floor);
    path([0, 440, 1000, 440], '#a6a4b1', 2);
    path([0, 494, 1000, 494], '#272938', 1);
  }
  function drawFighter(f: Fighter, time: number, reduced: boolean, sample: AnimationSample) {
    const nera=f.kind==='nera', down=f.state==='knockdown'||f.state==='ko';
    const base=arena.floor;
    const s=f.attack, active=f.state==='active', wind=f.state==='startup';
    ctx.save();
    oval(f.x,base+4,down?69:48,8, '#080d1e88');
    if (art && !down) { ctx.save(); ctx.globalAlpha=quality?.18:.24; if(quality)quality.effect(3,f.x,base+4,145,22);else drawFoundryEffect(ctx,art,3,f.x,base+4,112,20); ctx.restore(); }
    glow(f.x,base+10,76,nera?'#7debdc0d':'#ffc08d0b');
    ctx.translate(f.x,base-f.z);ctx.scale(f.facing,1);ctx.lineCap='round';ctx.lineJoin='round';
    if(f.immune>0&&!down) { ctx.globalAlpha=reduced?.9:.83+.17*Math.sin(time*35); }
    const { trim } = theme.fighters[f.kind];
    const sprites = art ?? baseline.images;
    if (sprites[f.kind]) drawFoundryFighter(ctx, sprites, f.kind, sample);
    else oval(0,-65,25,65,theme.fighters[f.kind].cloth);
    if (active && s) {
      const move = fighters[f.kind].attacks[s.kind];
      if (art && !(nera && s.kind === 'special')) {
        // Trails describe the committed move, including a miss; contact bursts require a hit event.
        const cell = s.kind === 'sweep' ? 6 : s.kind === 'air' ? 7 : nera && s.kind === 'heavy' ? 4 : 5;
        const x = cell === 5 ? move.reach : move.reach * .57;
        const y = cell === 6 ? -14 : cell === 4 ? -111 : -91;
        const width = cell === 5 ? move.reach * 1.1 : move.reach;
        ctx.globalAlpha = reduced ? .32 : .58;
        if (quality) quality.effect(cell, x, y, width, cell === 6 ? 34 : cell === 5 ? 65 : 116);
        else drawFoundryEffect(ctx, art, cell, cell === 5 ? x - width / 2 : x, y, width, cell === 6 ? 28 : 80);
      } else if (!art && s.kind !== 'special') {
        ctx.globalAlpha = .45; ctx.strokeStyle = trim; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(move.reach * .5, s.kind === 'sweep' ? -12 : -87, move.reach * .45, s.kind === 'sweep' ? 12 : 24, 0, -.9, .8); ctx.stroke();
      }
    }
    if (wind && s && (s.kind === 'heavy' || s.kind === 'special')) {
      // A compact hand/foot glint distinguishes charge from active danger without a false impact.
      oval(nera && s.kind === 'heavy' ? 10 : 35, nera && s.kind === 'heavy' ? -48 : -94, 3, 3, trim);
    }
    ctx.restore();
  }
  return {
    ready: baseline.ready,
    replaceTheme(next: DuelTheme, images?: ImageBundle, factory?: SanctumDrawingFactory) {
      const previousTheme = theme, previousArt = art, previousQuality = quality;
      const drawing = factory && images ? factory(ctx,images) : undefined;
      theme = next; art = images; quality = drawing; ctx.reset();
      return { rollback() { theme = previousTheme; art = previousArt; quality = previousQuality; ctx.reset(); } };
    },
    reset() { sparks=[];impacts=[];shake=0;last=undefined;for(const animation of animations)animation.reset(); },
    consume(events: readonly DuelEvent[]) {
      for(const e of events){
        if (e.type === 'ko') shake = 9;
        if (!['hit', 'heavyHit', 'block'].includes(e.type)) continue;
        const blocked=e.type==='block', color=blocked?'#b4d8ff':e.fighter===0?'#a5f6e0':'#ffcf98';
        const point={x:e.x,y:arena.floor-e.z};
        shake=Math.max(shake,blocked?2:e.strength*6);
        if(impacts.length<12)impacts.push({x:point.x,y:point.y,life:.25,blocked,color});
        const count=motion.matches?2:quality?6:art?10:4;
        for(let i=0;i<count&&sparks.length<120;i++){
          const a=i*2.399+e.x, speed=55+(i%5)*32;
          sparks.push({x:point.x,y:point.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-35,life:.22+(i%4)*.08,max:.46,color});
        }
      }
    },
    draw(m: Match, host: { width:number; height:number; ratio:number }, screen: Screen, now: number) {
      if(disposed)return;
      const {width,height,ratio}=host, pw=Math.round(width*ratio),ph=Math.round(height*ratio);
      if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
      const dt=last===undefined?0:Math.min(.05,Math.max(0,m.elapsed-last));last=m.elapsed;
      const animate=screen==='playing', reduced=motion.matches;
      if(animate){shake=Math.max(0,shake-dt*35);for(const p of sparks){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt;}for(const r of impacts)r.life-=dt;sparks=sparks.filter(p=>p.life>0);impacts=impacts.filter(p=>p.life>0);}
      const v=duelView(width,height);
      ctx.save();ctx.setTransform(ratio,0,0,ratio,0,0);rect(0,0,width,height,'#10121e');
      // This single uniform transform owns arena, fighter positions, projectiles and all contact effects.
      ctx.translate(v.left,v.top);ctx.scale(v.scale,v.scale);
      ctx.beginPath();ctx.rect(0,0,1000,560);ctx.clip();
      if(!quality&&!reduced&&animate)ctx.translate(Math.sin(now*83)*shake,Math.cos(now*71)*shake*.35);
      const t=screen==='title'?now:m.elapsed;
      const samples=m.fighters.map((f,i)=>animations[i]!.sample(f,t,reduced));
      if(quality) {
        quality.scenery(t,reduced);
        for(let i=0;i<2;i++)quality.reflection(m.fighters[i]!,samples[i]!);
      } else scenery(reduced?0:t,reduced);
      for(let i=0;i<2;i++)drawFighter(m.fighters[i]!,t,reduced,samples[i]!);
      const enemy=m.fighters[1], cue=screen==='playing'&&m.phase==='fight'?duelCue(enemy):null;
      if(cue){
        const labelScale=Math.max(1,10/(13*v.scale)), y=Math.max(80,arena.floor-enemy.z-190);
        const color=cue.opening?'#a5f6e0':'#ffdbad';
        ctx.font='600 13px system-ui, sans-serif';ctx.textAlign='center';
        const width=ctx.measureText(cue.text).width+24;
        const margin=width*labelScale/2+8, x=Math.max(margin,Math.min(arena.width-margin,enemy.x));
        ctx.save();ctx.translate(x,y);ctx.scale(labelScale,labelScale);
        rect(-width/2,-17,width,27,'#101520ed');
        rect(-width/2,10,width,2,color);
        ctx.fillStyle=color;ctx.fillText(cue.text,0,2);ctx.restore();
      }
      for(const p of m.projectiles){
        if(quality) {
          glow(p.x,arena.floor-p.z,36,'#6df5d52a');
          ctx.save();ctx.translate(p.x,arena.floor-p.z);ctx.scale(p.facing,1);
          quality.effect(0,0,0,110,62);ctx.restore();continue;
        }
        if (art) {
          ctx.save(); ctx.translate(p.x, arena.floor - p.z); ctx.scale(p.facing, 1);
          drawFoundryEffect(ctx, art, 0, -28, 0, 76, 46); ctx.restore(); continue;
        }
        glow(p.x,arena.floor-p.z,44,'#8cffe45a');
        path([p.x-p.facing*44,arena.floor-p.z,p.x,arena.floor-p.z],'#87f5d87a',8);
        oval(p.x,arena.floor-p.z,17,10,'#7cead8');oval(p.x+p.facing*4,arena.floor-p.z,9,6,'#efffea');
      }
      ctx.lineCap='round';
      for(const p of sparks){ctx.globalAlpha=Math.min(1,p.life/p.max);if(reduced)oval(p.x,p.y,1,1,p.color);else path([p.x,p.y,p.x-p.vx*.025,p.y-p.vy*.025],p.color,2);}
      for(const r of impacts){
        if(quality) {
          const life=Math.max(0,r.life/.25), size=reduced?108:85+(1-life)*55;
          ctx.globalAlpha=life;
          quality.effect(r.blocked?2:1,r.x,r.y,size,r.blocked?size: size*.85);
          continue;
        }
        ctx.globalAlpha=Math.max(0,r.life/.25);if(art){drawFoundryEffect(ctx,art,r.blocked?2:1,r.x,r.y,reduced?64:38+(1-r.life/.25)*44);continue;}ctx.strokeStyle=r.color;ctx.lineWidth=r.blocked?4:2;ctx.beginPath();ctx.arc(r.x,r.y,reduced?22:8+(1-r.life/.25)*30,r.blocked?-.9:0,r.blocked?2.2:Math.PI*2);ctx.stroke();if(!r.blocked){path([r.x-21,r.y,r.x+21,r.y],r.color,2);path([r.x,r.y-21,r.x,r.y+21],r.color,2);}}
      ctx.globalAlpha=1;ctx.restore();
    },
    dispose(){if(disposed)return;disposed=true;baseline.dispose();art=undefined;quality=undefined;sparks=[];impacts=[];canvas.remove();},
  };
}
