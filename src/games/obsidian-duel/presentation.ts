import { themes, type DuelTheme } from './themes.ts';
import { arena, fighters } from './content.ts';
import type { DuelEvent, Fighter, Match } from './game.ts';
import type { Screen } from './ui.ts';
export function duelView(width: number, height: number) {
  const scale = Math.min(width / arena.width, height / arena.height);
  return { scale, left: (width - arena.width * scale) / 2, top: (height - arena.height * scale) / 2 };
}
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string }
interface Impact { x: number; y: number; life: number; blocked: boolean; color: string }
export function createPresentation(surface: HTMLElement) {
  const canvas = document.createElement('canvas'); canvas.className = 'duel-canvas';
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D is unavailable.');
  const ctx = context; surface.append(canvas);
  let theme = themes.normal;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let sparks: Spark[] = [], impacts: Impact[] = [], shake = 0, last = 0, disposed = false;
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
    const sky = ctx.createLinearGradient(0, 0, 0, 560); sky.addColorStop(0, theme.sky[0]); sky.addColorStop(.6, theme.sky[1]); sky.addColorStop(1, theme.sky[2]); rect(0, 0, 1000, 560, sky);
    glow(570, 143, 240, '#a799d034'); oval(570, 143, 55, 55, theme.orb[0]); oval(570, 143, 48, 48, theme.orb[1]);
    path([524,135,552,148,537,165,574,155,587,177,599,142,621,126], '#9b9aaa55', 2);
    // Authored mountain silhouettes and an ancient ring suspended over the dueling terrace.
    path([0,278,63,205,127,261,203,151,275,243,365,190,470,284,580,234,690,272,778,165,863,237,952,174,1000,216,1000,440,0,440], theme.mountains[0], 1, true);
    path([0,333,109,260,203,314,292,239,352,309,465,275,593,327,735,274,840,321,934,265,1000,314,1000,440,0,440], theme.mountains[1], 1, true);
    ctx.strokeStyle = '#a09aaf2c'; ctx.lineWidth = 15; ctx.beginPath(); ctx.arc(570, 250, 165, Math.PI * 1.08, Math.PI * 1.93); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#d4bda34a'; ctx.beginPath(); ctx.arc(570, 250, 178, Math.PI * 1.08, Math.PI * 1.93); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = Math.PI * (1.12 + i * .07); path([570 + Math.cos(a)*159,250+Math.sin(a)*159,570+Math.cos(a)*172,250+Math.sin(a)*172], '#bba28666', 3); }
    // Storm filaments glow continuously; reduced motion removes the periodic lightning flourish.
    const storm = theme.weather === 'dawn' ? 0 : reduced ? .12 : .10 + Math.pow(Math.max(0, Math.sin(t * .65)), 20) * .38;
    ctx.globalAlpha = storm;
    path([770,0,732,52,758,65,713,116,737,125,699,185], '#d4bafb', 3);
    path([170,0,196,42,181,61,215,94,194,113], '#a3c9f4', 2); ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      const drift = reduced ? 0 : Math.sin(t * .055 + i) * 28;
      oval(i * 220 - 35 + drift, 93 + i % 3 * 31, 190, 19 + i * 2, theme.clouds[i % 2 ? 0 : 1]);
    }
    // Rear balustrade, worn bronze pillars and fluttering storm banners.
    rect(0,350,1000,9,'#5d5259'); rect(0,359,1000,6,'#211f2e');
    for (let i=0;i<21;i++) { const x=i*50; path([x,360,x+10,360,x+9,400,x+16,408,x-6,408,x+2,400], '#323240',1,true); }
    rect(0,408,1000,12,'#504852');
    for (const x of [40, 920]) {
      rect(x-12,147,52,273,'#202432'); rect(x-4,158,35,250,'#383746'); rect(x+2,163,5,240,'#55505b');
      path([x-24,144,x+52,144,x+43,126,x-15,126], '#66606b',1,true);
      rect(x-17,119,62,8,'#8b7880'); rect(x-21,412,72,14,'#76636b');
      const flutter = reduced ? 0 : Math.sin(t*1.4+x)*7;
      path([x+24,156,x+80,161,x+78+flutter,287,x+51,268,x+24,298], theme.banner,1,true);
      path([x+48,184,x+62,205,x+48,226,x+34,205], '#d0a67f66',2);
      glow(x+14,320,70,'#ffae6d25');
      path([x-4,326,x+32,326,x+24,343,x+3,343], '#88706b',1,true);
      for (let j=0;j<3;j++) { const f = reduced ? 0 : Math.sin(t*5+j+x)*4; path([x+2+j*8,327,x+1+j*8+f,300-j*6,x+13+j*7,323],j===1?'#ffdf9c':'#d9946e',1,true); }
    }
    const floor = ctx.createLinearGradient(0,420,0,560); floor.addColorStop(0,theme.floor[0]); floor.addColorStop(.2,theme.floor[1]); floor.addColorStop(1,theme.floor[2]); rect(0,420,1000,140,floor);
    path([0,423,1000,423], '#b5a19366',2); path([0,432,1000,432], '#171d2b',3);
    for (let i=0;i<12;i++) path([500+(i-6)*66,423,500+(i-6)*140,560], '#151b2c77',1.5);
    for (const y of [453,490,546]) path([0,y,1000,y], '#74637744',1);
    // Inlaid dueling ring, cracks and rain-slick reflections are cosmetic only.
    ctx.strokeStyle='#b99a794d'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(500,458,286,30,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(500,458,264,23,0,0,Math.PI*2);ctx.stroke();
    path([500,441,516,458,500,475,484,458,500,441], '#b99a7966',1);
    path([170,471,205,485,191,496,230,515,215,540], '#14192b',2);
    path([825,427,803,451,815,468,778,479], '#14192b',2);
    for(let i=0;i<14;i++) {const x=(i*97)%1000;path([x,448+i%4*23,x+30+i%3*12,448+i%4*23], '#c0a7ad15',2);}
    const vignette=ctx.createRadialGradient(500,310,180,500,310,620);vignette.addColorStop(0,'#080d1800');vignette.addColorStop(1,'#080d18b3');rect(0,0,1000,560,vignette);
  }
  type Point = [number,number];
  function limb(a: Point,b: Point,c: Point,color: string,width: number) {
    path([...a,...b,...c], '#101725',width+4); path([...a,...b,...c],color,width);
    oval(b[0],b[1],width*.46,width*.46,color);
  }
  function drawFighter(f: Fighter, index: number, time: number, reduced: boolean) {
    const nera=f.kind==='nera', def=fighters[f.kind], down=f.state==='knockdown'||f.state==='ko';
    const cycle=Math.sin(time*(f.state==='move'?13:3.5)+index), breathe=reduced?0:cycle*1.5;
    const crouch=f.crouched || f.attack?.kind==='sweep', hurt=f.state==='hitstun';
    const base=arena.floor, hip:Point=[-5,crouch?-35:-66], shoulder:Point=[crouch?10:0,crouch?-66:-111];
    let head:Point=[shoulder[0]+7,shoulder[1]-25];
    let kneeBack:Point=[-22,-36], footBack:Point=[-34,-1], kneeFront:Point=[19,-35], footFront:Point=[35,-1];
    let elbowBack:Point=[-24,-87], handBack:Point=[-10,-108], elbowFront:Point=[23,-84], handFront:Point=[39,-108];
    let lean=0;
    const s=f.attack, d=s?def.attacks[s.kind]:null;
    const active=f.state==='active', wind=f.state==='startup', recovery=f.state==='recovery';
    if(crouch){kneeBack=[-29,-14];footBack=[-43,-1];kneeFront=[27,-19];footFront=[43,-1];elbowBack=[-12,-52];handBack=[5,-75];elbowFront=[26,-44];handFront=[44,-65];}
    if(f.state==='move'&&!crouch){ const stride=cycle*13;kneeBack=[-15-stride,-29];footBack=[-28-stride*1.4,-1];kneeFront=[20+stride,-30];footFront=[32+stride*1.4,-1]; }
    if(f.z>0){kneeBack=[-32,-48];footBack=[-43,-31];kneeFront=[24,-35];footFront=[30,-18];lean=.05;}
    if(f.guarding||f.state==='blockstun') { elbowFront=[30,crouch?-55:-102];handFront=[23,crouch?-91:-143];elbowBack=[6,crouch?-56:-108];handBack=[39,crouch?-78:-125];lean=-.07; }
    if(hurt){lean=-.23;elbowFront=[23,-80];handFront=[39,-70];head=[-1,shoulder[1]-24];}
    if(s&&d){
      const extend=active?1:wind?-Math.min(1,s.time/d.startup)*.35:recovery?Math.max(0,1-(s.time-d.startup-d.active)/d.recovery)*.7:0;
      if(s.kind==='light'){handFront=[40+extend*56,-109];elbowFront=[25+extend*28,-103];lean=extend*.10;}
      if(s.kind==='heavy'&&nera){kneeFront=[22+extend*32,-57-extend*13];footFront=[36+extend*96,-40-extend*67];lean=-extend*.12;}
      if(s.kind==='heavy'&&!nera || s.kind==='special'&&!nera){handFront=[34+extend*79,-108];elbowFront=[21+extend*43,-104];lean=extend*.15;handBack=[-15,-109];}
      if(s.kind==='sweep'){kneeFront=[28+extend*23,-18];footFront=[43+extend*70,-6];handFront=[10,-73];lean=extend*.12;}
      if(s.kind==='air'){kneeFront=[22+extend*26,-50];footFront=[34+extend*80,-44+extend*8];lean=-extend*.18;handFront=[6,-132];}
      if(s.kind==='special'&&nera){handFront=[30+extend*58,-95];elbowFront=[18+extend*33,-100];handBack=[19+extend*57,-105];elbowBack=[-13,-102];glow(f.x+f.facing*(36+extend*38),base-f.z-95,wind?24+Math.min(1,s.time/d.startup)*22:27,'#93ffe64d');}
    }
    ctx.save();
    oval(f.x,base+4,down?69:48,8, '#080d1e88');
    glow(f.x,base+10,76,nera?'#7debdc0d':'#ffc08d0b');
    ctx.translate(f.x,base-f.z);ctx.scale(f.facing,1);ctx.lineCap='round';ctx.lineJoin='round';
    if(down){ctx.translate(0,-12);ctx.rotate(-1.42);}
    else if(f.state==='wakeup'){ctx.translate(0,Math.max(0,f.stateTime/.3)*24);ctx.rotate(-f.stateTime*.8);}
    ctx.rotate(lean);ctx.translate(0,breathe);
    if(f.immune>0&&!down) { ctx.globalAlpha=reduced?.9:.83+.17*Math.sin(time*35); }
    const { cloth, dark, trim } = theme.fighters[f.kind], skin=nera?'#cda99e':'#d7aa8f';
    // A split, flowing silk coat versus a broad armored mantle creates different silhouettes.
    if(nera){path([-17,-103,-38,-82,-34-Math.sin(time*4)*5,-31,-8,-49,10,-91], '#215767',1,true);path([-16,-107,-46,-117,-72,-106,-47,-108,-27,-95], '#88e0cc',1,true);}
    else {path([-28,-116,21,-112,29,-48,-21,-33,-39,-56], '#3d3246',1,true);path([-28,-116,-39,-87,-28,-78,-17,-105], '#a77d6a',1,true);}
    limb(hip,kneeBack,footBack,dark,nera?15:20);limb(hip,kneeFront,footFront,nera?'#384f66':'#535064',nera?17:22);
    path([footBack[0]-5,footBack[1],footBack[0]+12,footBack[1]], '#1a2638',12);path([footFront[0]-5,footFront[1],footFront[0]+14,footFront[1]], '#1c293a',13);
    if(!nera){path([kneeFront[0],kneeFront[1]-5,footFront[0],footFront[1]-11], '#a18b83',13);}
    limb([shoulder[0]-8,shoulder[1]+4],elbowBack,handBack,nera?'#507f89':'#a07c73',nera?11:17);
    const sw=nera?18:27;
    path([shoulder[0]-sw,shoulder[1]-5,shoulder[0]+sw-3,shoulder[1]-3,hip[0]+20,hip[1]+5,hip[0]-20,hip[1]+5],cloth,1,true);
    path([shoulder[0]-10,shoulder[1],hip[0]+9,hip[1]], '#c6b0a0',nera?7:10);
    if(!nera){path([shoulder[0]+4,shoulder[1]+2,shoulder[0]+25,shoulder[1]+4,hip[0]+17,hip[1]-11,hip[0]+2,hip[1]-8], '#464656',1,true);path([shoulder[0]-27,shoulder[1]-6,shoulder[0]-4,shoulder[1]-11,shoulder[0]+1,shoulder[1]+5,shoulder[0]-30,shoulder[1]+12], '#b0a09a',1,true);}
    path([hip[0]-20,hip[1]-1,hip[0]+20,hip[1]-1],trim,6);path([hip[0]+10,hip[1]+1,hip[0]+25,hip[1]+29,hip[0]+15,hip[1]+25],trim,1,true);
    path([head[0]-5,head[1]+11,shoulder[0]+3,shoulder[1]],skin,13);
    // Original profile, tied hair and eye line; no costume or signature animation references.
    path([head[0]-14,head[1]-12,head[0]+10,head[1]-11,head[0]+17,head[1]+1,head[0]+11,head[1]+14,head[0]-8,head[1]+13,head[0]-15,head[1]],skin,1,true);
    if(nera){path([head[0]-15,head[1]+7,head[0]-18,head[1]-13,head[0]+1,head[1]-22,head[0]+14,head[1]-11,head[0]-2,head[1]-8,head[0]-9,head[1]+4], '#162b3e',1,true);path([head[0]-14,head[1]-7,head[0]-25,head[1]+3,head[0]-29+cycle*3,head[1]+37], '#172f43',10);path([head[0]-14,head[1]-9,head[0]+13,head[1]-6],trim,3);}
    else {path([head[0]-15,head[1]-1,head[0]-16,head[1]-14,head[0]-2,head[1]-21,head[0]+12,head[1]-15,head[0]+14,head[1]-9,head[0]-5,head[1]-10], '#292733',1,true);path([head[0]-8,head[1]+9,head[0]+10,head[1]+13,head[0]+12,head[1]+7], '#4a3941',5);}
    path([head[0]+6,head[1]-2,head[0]+12,head[1]-2], '#1c2835',2);
    limb([shoulder[0]+9,shoulder[1]+5],elbowFront,handFront,nera?'#75a5a6':'#b38b7d',nera?12:19);
    const wrap=nera?'#dfdac5':'#978f96';
    path([elbowFront[0]*.35+handFront[0]*.65,elbowFront[1]*.35+handFront[1]*.65,...handFront],wrap,nera?13:23);
    oval(handFront[0]+3,handFront[1],nera?8:12,nera?6:10,nera?'#d8c2af':'#bfb3ac');
    path([handFront[0]-7,handFront[1]-4,handFront[0]+7,handFront[1]-4],trim,2);
    if(active&&s){
      ctx.globalAlpha=.5;ctx.strokeStyle=trim;ctx.lineWidth=s.kind==='heavy'?6:3;ctx.beginPath();
      if(s.kind==='sweep')ctx.ellipse(47,-12,65,15,0,-1.4,1.2);
      else ctx.arc(12,-92,s.kind==='heavy'?99:76,-.9,.45);ctx.stroke();ctx.globalAlpha=1;
    }
    if(wind&&s&&(s.kind==='heavy'||s.kind==='special')){oval(-30,-85,3,3,trim);path([-42,-89,-48,-94],trim,2);}
    ctx.restore();
  }
  return {
    applyTheme(next: DuelTheme) { theme = next; },
    reset() { sparks=[];impacts=[];shake=0;last=0; },
    consume(events: readonly DuelEvent[]) {
      for(const e of events){
        if(!['hit','heavyHit','block','knockdown','special','ko'].includes(e.type))continue;
        const blocked=e.type==='block', color=blocked?'#b4d8ff':e.fighter===0?'#a5f6e0':'#ffcf98';
        if(e.type==='ko')shake=9;else if(e.type!=='special')shake=Math.max(shake,blocked?2:e.strength*6);
        if(impacts.length<12)impacts.push({x:e.x,y:arena.floor-e.z,life:.25,blocked,color});
        const count=motion.matches?4:blocked?9:16;
        for(let i=0;i<count&&sparks.length<120;i++){
          const a=i*2.399+e.x, speed=55+(i%5)*32;
          sparks.push({x:e.x,y:arena.floor-e.z,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-35,life:.22+(i%4)*.08,max:.46,color});
        }
      }
    },
    draw(m: Match, host: { width:number; height:number; ratio:number }, screen: Screen, now: number) {
      if(disposed)return;
      const {width,height,ratio}=host, pw=Math.round(width*ratio),ph=Math.round(height*ratio);
      if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
      const dt=last?Math.min(.05,Math.max(0,now-last)):0;last=now;
      const animate=screen==='playing', reduced=motion.matches;
      if(animate){shake=Math.max(0,shake-dt*35);for(const p of sparks){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt;}for(const r of impacts)r.life-=dt;sparks=sparks.filter(p=>p.life>0);impacts=impacts.filter(p=>p.life>0);}
      const v=duelView(width,height);
      ctx.save();ctx.setTransform(ratio,0,0,ratio,0,0);rect(0,0,width,height,'#10121e');
      // This single uniform transform owns arena, fighter positions, projectiles and all contact effects.
      ctx.translate(v.left,v.top);ctx.scale(v.scale,v.scale);
      ctx.beginPath();ctx.rect(0,0,1000,560);ctx.clip();
      if(!reduced&&animate)ctx.translate(Math.sin(now*83)*shake,Math.cos(now*71)*shake*.35);
      scenery(now,reduced);
      const t=screen==='title'?now:m.elapsed;
      for(let i=0;i<2;i++)drawFighter(m.fighters[i]!,i,t,reduced);
      for(const p of m.projectiles){
        glow(p.x,arena.floor-p.z,44,'#8cffe45a');
        path([p.x-p.facing*44,arena.floor-p.z,p.x,arena.floor-p.z],'#87f5d87a',8);
        oval(p.x,arena.floor-p.z,17,10,'#7cead8');oval(p.x+p.facing*4,arena.floor-p.z,9,6,'#efffea');
      }
      ctx.lineCap='round';
      for(const p of sparks){ctx.globalAlpha=Math.min(1,p.life/p.max);path([p.x,p.y,p.x-p.vx*.025,p.y-p.vy*.025],p.color,2);}
      for(const r of impacts){ctx.globalAlpha=Math.max(0,r.life/.25);ctx.strokeStyle=r.color;ctx.lineWidth=r.blocked?4:2;ctx.beginPath();ctx.arc(r.x,r.y,8+(1-r.life/.25)*30,r.blocked?-.9:0,r.blocked?2.2:Math.PI*2);ctx.stroke();if(!r.blocked){path([r.x-21,r.y,r.x+21,r.y],r.color,2);path([r.x,r.y-21,r.x,r.y+21],r.color,2);}}
      ctx.globalAlpha=1;ctx.restore();
    },
    dispose(){if(disposed)return;disposed=true;sparks=[];impacts=[];canvas.remove();},
  };
}
