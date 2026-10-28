import { attacks } from './content.ts';
import { attackPhase, stageOf, type Actor, type BrawlerEvent, type Run } from './game.ts';
import type { Screen } from './ui.ts';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export function circuitView(width: number, height: number, run: Run) {
  const scale = Math.min(width / 960, height / 560), w = width / scale, h = height / scale;
  const encounter = stageOf(run).encounters[run.encounter];
  const center = run.gated && encounter ? (encounter.left + encounter.right) / 2 : run.player.x + 160;
  return { scale, width: w, height: h, x: clamp(center - w / 2, 0, Math.max(0, stageOf(run).width - w)), ground: h * .58 };
}
interface Particle { x: number; lane: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; color: string }
interface Ring { x: number; lane: number; life: number; strength: number; color: string }
export function createPresentation(surface: HTMLElement) {
  const canvas = document.createElement('canvas'); canvas.className = 'circuit-canvas';
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D is unavailable.');
  const ctx = context; surface.append(canvas);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, camera: number | undefined, last: number | undefined, shake = 0;
  let particles: Particle[] = [], rings: Ring[] = [];
  function rect(x: number, y: number, w: number, h: number, color: string | CanvasGradient, radius = 0) {
    ctx.fillStyle = color; if (!radius) ctx.fillRect(x, y, w, h);
    else { ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); }
  }
  function line(points: readonly number[], color: string, width = 2) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    for (let i = 0; i < points.length; i += 2) { if (i === 0) ctx.moveTo(points[i]!, points[i + 1]!); else ctx.lineTo(points[i]!, points[i + 1]!); }
    ctx.stroke();
  }
  function polygon(points: readonly number[], color: string) {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < points.length; i += 2) { if (i === 0) ctx.moveTo(points[i]!, points[i + 1]!); else ctx.lineTo(points[i]!, points[i + 1]!); }
    ctx.closePath(); ctx.fill();
  }
  function ellipse(x: number, y: number, rx: number, ry: number, color: string) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function glow(x: number, y: number, r: number, color: string) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, '#07132300');
    rect(x - r, y - r, r * 2, r * 2, g);
  }
  function text(value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left') {
    ctx.font = `bold ${size}px monospace`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(value, x, y); ctx.textAlign = 'left';
  }
  function neon(value: string, x: number, y: number, color: string, size = 22) {
    ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = color; text(value, x, y, size, color); ctx.restore();
  }
  function scenery(view: ReturnType<typeof circuitView>, run: Run, time: number) {
    const { width: w, height: h, ground: g, x: cam } = view, station = stageOf(run).environment === 'station';
    const online = run.finale > 0 || run.status === 'victory';
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, station ? '#101525' : '#0c142a'); sky.addColorStop(.58, station ? '#28313c' : '#302640'); sky.addColorStop(1, '#111d2b'); rect(0, 0, w, h, sky);
    glow(w * .74 - cam * .04, g * .32, 300, online ? '#8bfbe348' : station ? '#ffa56119' : '#f184bd20');
    ellipse(w * .81 - cam * .02, g * .23, 39, 39, '#c5c9de');
    ellipse(w * .81 - cam * .02 - 13, g * .23 - 9, 39, 39, '#111a2c');
    // Two independently drifting skyline layers, drawn only inside the visible span.
    for (let layer = 0; layer < 2; layer++) {
      const parallax = layer === 0 ? .15 : .34, spacing = layer === 0 ? 145 : 205;
      for (let i = Math.floor(cam * parallax / spacing) - 1; i < Math.ceil((cam * parallax + w) / spacing) + 1; i++) {
        const x = i * spacing - cam * parallax, bh = 110 + ((i * 71 + layer * 43) % 190 + 190) % 190, y = g - 65 - bh;
        rect(x, y, spacing - 16, bh + 120, layer === 0 ? '#121e33' : '#162538');
        rect(x + 12, y - 8, 35, 8, '#1c2e40'); line([x + 30, y - 8, x + 30, y - 43], '#405165');
        for (let row = 0; row < bh / 26; row++) for (let col = 0; col < (spacing - 32) / 18; col++) {
          if ((i + row * 7 + col * 3) % (online ? 2 : 7) !== 0) continue;
          rect(x + col * 18 + 10, y + row * 26 + 14, 5, 9, online ? '#aadfc494' : '#b8ad9445');
        }
      }
    }
    // The elevated railway ties the streets to the industrial station.
    rect(0, g - 232, w, 16, '#0c192b'); line([0, g - 232, w, g - 232], '#65889755', 3);
    for (let i = -1; i < w / 170 + 1; i++) { const x = i * 170 - (cam * .5 % 170); polygon([x, g - 218, x + 18, g - 218, x + 80, g - 80, x + 64, g - 80], '#122237'); }
    // Near facades / transformer bays carry original signs and detailed silhouettes.
    const spacing = 420;
    for (let i = Math.floor(cam * .78 / spacing) - 1; i < Math.ceil((cam * .78 + w) / spacing) + 1; i++) {
      const x = i * spacing - cam * .78, y = g - 205;
      if (station) {
        rect(x, y - 115, 395, 310, '#1b2834');
        line([x, y - 112, x + 395, y - 112, x + 395, g - 13], '#4a5b65', 8);
        rect(x + 20, y - 90, 354, 42, '#101c2b'); text(i % 2 ? 'HIGH VOLTAGE / 06' : 'CENTRAL GRID / 04', x + 36, y - 64, 14, '#d0aa7c');
        for (let j = 0; j < 3; j++) {
          const tx = x + 60 + j * 120;
          rect(tx - 32, y + 10, 64, 153, '#34434b', 8); ellipse(tx, y + 12, 32, 10, '#657879');
          ellipse(tx, y + 160, 32, 9, '#1c303a');
          for (let k = 0; k < 5; k++) rect(tx - 40, y + 32 + k * 22, 80, 6, '#4f6165', 2);
          line([tx - 6, y + 1, tx - 6, y - 30, tx + 21, y - 30, tx + 21, y - 46], '#99a293', 5);
          glow(tx, y + 90, 55, online ? '#73ffcd22' : '#eea06a15');
          polygon([tx + 2, y + 56, tx - 12, y + 80, tx + 3, y + 80, tx - 2, y + 103, tx + 17, y + 72, tx + 3, y + 72], online ? '#a1ffd2' : '#d9ae73');
        }
        line([x + 20, g - 28, x + 375, g - 28], '#708188', 3);
        for (let k = 0; k < 15; k++) line([x + 22 + k * 24, g - 28, x + 22 + k * 24, g - 5], '#405665', 2);
      } else {
        rect(x, y - 65, 404, 258, '#182537'); rect(x + 10, y - 55, 384, 5, '#61707855');
        rect(x + 26, y + 32, 195, 151, '#111b2a');
        for (let k = 0; k < 16; k++) line([x + 30, y + 39 + k * 9, x + 217, y + 39 + k * 9], k % 4 ? '#293b4b' : '#4b5060', 2);
        rect(x + 18, y - 14, 214, 44, '#102030', 3); line([x + 18, y - 14, x + 232, y - 14], '#ee7ca955', 2);
        neon(['AFTER HOURS', 'NO SIGNAL', 'NIGHT MARKET'][Math.abs(i) % 3]!, x + 32, y + 13, i % 2 ? '#72dddf' : '#ed8db9', 19);
        rect(x + 263, y + 15, 104, 168, '#101a2a'); rect(x + 270, y + 22, 90, 7, '#405366');
        for (let k = 0; k < 4; k++) { rect(x + 274, y + 44 + k * 31, 36, 23, '#2a3e4c'); rect(x + 317, y + 44 + k * 31, 36, 23, online ? '#d3bb86' : '#284354'); }
        line([x + 244, y - 58, x + 244, g - 15, x + 255, g - 15], '#4d5c68', 5);
        rect(x + 283, y - 85, 70, 58, '#354151', 4); ellipse(x + 317, y - 55, 21, 21, '#192936');
        for (let a = 0; a < 6; a++) { const r = a * Math.PI / 3 + (motion.matches ? 0 : time); line([x + 317, y - 55, x + 317 + Math.cos(r) * 17, y - 55 + Math.sin(r) * 17], '#546575', 3); }
        rect(x + 236, y + 50, 21, 90, '#173141'); neon('24', x + 236, y + 73, '#6ae1cb', 14);
      }
      ctx.strokeStyle = '#0c1726'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 80, y - 92); ctx.quadraticCurveTo(x + 160, y - 20, x + 460, y - 105); ctx.stroke();
    }
    const floor = ctx.createLinearGradient(0, g - 20, 0, h); floor.addColorStop(0, '#283445'); floor.addColorStop(.3, '#172b3c'); floor.addColorStop(1, '#101b2c'); rect(0, g - 9, w, h - g + 9, floor);
    rect(0, g - 10, w, 13, '#4c5964'); line([0, g + 4, w, g + 4], '#77939c55', 2);
    line([0, g + 182, w, g + 182], station ? '#e8b47655' : '#acc6c62a', 3);
    for (let i = Math.floor(cam / 170) - 1; i < Math.ceil((cam + w) / 170) + 1; i++) {
      const x = i * 170 - cam;
      line([x, g + 5, x - 65, h], '#7192a20c');
      rect(x + 20, g + 210, 90, 3, '#dbcb973b');
      ellipse(x + 85, g + 70 + (i % 3) * 43, 69, 8, '#609da412');
      for (let j = 0; j < 6; j++) line([x + 32 + j * 17, g + 35 + j * 5, x + 62 + j * 11, g + 35 + j * 5], i % 2 ? '#75eedc1d' : '#f295bc20', 2);
      if (station) for (let j = 0; j < 5; j++) polygon([x + j * 18, g + 3, x + j * 18 + 9, g + 3, x + j * 18 - 4, g + 15, x + j * 18 - 13, g + 15], '#d7ab6948');
      else { rect(x + 12, g + 12, 47, 12, '#0b1827'); for (let j = 0; j < 7; j++) line([x + 15 + j * 6, g + 13, x + 15 + j * 6, g + 22], '#405669'); }
    }
    for (let i = Math.floor(cam * .78 / 420); i < Math.ceil((cam * .78 + w) / 420); i++) {
      const x = i * 420 + 120 - cam * .78;
      glow(x, g + 50, 130, online ? '#75e6b828' : station ? '#f3ae7b15' : i % 2 ? '#6de1df22' : '#ea80af22');
      for (let j = 0; j < 8; j++) rect(x - 50 + j % 3 * 18, g + 12 + j * 13, 70 - j * 5, 2, i % 2 ? '#7de9d61b' : '#ee8cb41b');
    }
    if (!station) {
      // Rain uses a fixed bounded field and the simulation clock; pausing freezes it.
      for (let i = 0; i < (motion.matches ? 0 : 100); i++) {
        const x = ((i * 137.3 - time * 75) % w + w) % w, y = (i * 83.7 + time * 400) % h;
        line([x, y, x - 5, y + 15], '#b6d5e31c', 1);
      }
    }
    const encounter = stageOf(run).encounters[run.encounter];
    if (run.gated && encounter) for (const boundary of [encounter.left, encounter.right]) {
      const x = boundary - cam; glow(x, g + 80, 80, '#ee77991e');
      line([x, g - 8, x, g + 185], '#ed8aa390', 3);
      for (let y = 0; y < 180; y += 24) line([x - 8, g + y + 12, x + 8, g + y], '#ffb1b178', 2);
      text('LOCK', x, g + 208, 8, '#e4a4b1', 'center');
    }
    if (!encounter && !run.finale && run.status !== 'victory') {
      const x = stageOf(run).width - 140 - cam; glow(x, g + 40, 160, '#78f8db33');
      neon('POWER STATION →', x - 80, g - 60, '#9afadf', 15);
    }
  }
  type Point = [number, number];
  function limb(points: readonly Point[], color: string, width: number) {
    const flat = points.flat(); line(flat, '#091522', width + 4); line(flat, color, width);
  }
  /** Original articulated vector figures. Pose observes the simulation's attack phase. */
  function body(a: Actor, time: number, reflection = false) {
    const player = a.kind === 'player', boss = a.kind === 'warden', bruiser = a.kind === 'bruiser';
    const size = boss ? 1.48 : bruiser ? 1.2 : 1;
    const ink = '#101b2c', trim = player ? '#86ffde' : boss ? '#ffb784' : bruiser ? '#e8b47a' : '#ed85ac';
    const coat = player ? '#408c92' : boss ? '#3f5260' : bruiser ? '#815c63' : '#666a91';
    const lit = player ? '#79b8af' : boss ? '#82919a' : bruiser ? '#c38a83' : '#a49bc0';
    ctx.save(); ctx.scale(a.facing * size, size);
    if (!reflection && a.immune > 0 && Math.floor(time * 16) % 2 === 0) ctx.globalAlpha *= .55;
    if (a.health <= 0) { ctx.rotate(-Math.PI * .37); ctx.scale(1, .6); }
    const walking = a.moving && !a.attack && a.elevation === 0;
    const stride = walking ? Math.sin(time * 15 + a.id) * 13 : 0;
    const bob = walking ? Math.abs(Math.sin(time * 15 + a.id)) * 2 : 0;
    const s = a.attack, phase = s ? attackPhase(s) : null;
    const active = phase === 'active', windup = phase === 'startup', recovery = phase === 'recovery';
    const kind = s?.kind, kick = kind === 'finisher' || kind === 'air';
    const heavy = kind === 'heavy' || kind === 'smash' || kind === 'quake';
    const recoil = a.stun > 0 && a.health > 0 ? -10 : windup ? -5 : active ? 7 : 0;
    ctx.translate(recoil, bob - a.elevation / size);
    let backFoot: Point = [-13 + stride, -3], frontFoot: Point = [17 - stride, -3];
    let backKnee: Point = [-12 - stride * .3, -25], frontKnee: Point = [13 + stride * .4, -25];
    if (a.elevation > 0) { backFoot = [-24, -28]; backKnee = [-20, -37]; frontFoot = [24, -14]; frontKnee = [24, -32]; }
    if (kick && active) { frontKnee = [33, -48]; frontFoot = [77, -51]; backFoot = [-13, -5]; }
    if (kind === 'charge' && active) { backFoot = [-36, -4]; frontFoot = [35, -8]; }
    limb([[-8, -45], backKnee, backFoot], '#26374d', boss ? 15 : 10);
    line([backFoot[0] - 7, backFoot[1], backFoot[0] + 10, backFoot[1]], '#182735', 10);
    line([backFoot[0] - 4, backFoot[1] - 4, backFoot[0] + 9, backFoot[1] - 4], trim, 2);
    // Rear arm is behind the jacket, with a compact guarded silhouette at rest.
    let rearElbow: Point = [-26, -59], rearHand: Point = [-17, -73];
    let elbow: Point = [28, -64], hand: Point = [33, -79];
    if (windup) { elbow = heavy ? [-10, -96] : [8, -66]; hand = heavy ? [-6, -120] : [0, -81]; }
    if (active && !kick) { elbow = heavy ? [25, -76] : [40, -69]; hand = heavy ? [65, kind === 'quake' ? -4 : -40] : [76, -69]; }
    if (kick) { elbow = [-6, -60]; hand = [-16, -57]; rearElbow = [-24, -70]; rearHand = [-15, -86]; }
    if (kind === 'cross' && active) { rearElbow = [25, -76]; rearHand = [73, -73]; hand = [10, -63]; }
    if (kind === 'charge') { elbow = [28, -64]; hand = [40, -76]; }
    if (a.stun > 0) { hand = [35, -45]; rearHand = [-35, -61]; }
    limb([[-13, -76], rearElbow, rearHand], coat, boss ? 17 : 9); ellipse(rearHand[0], rearHand[1], boss ? 13 : 7, boss ? 12 : 7, trim);
    polygon([-17, -81, 11, -83, 22, -48, 12, -39, -19, -43, -24, -60], coat);
    polygon([-15, -80, -3, -78, -5, -46, -18, -45, -22, -60], lit);
    polygon([-4, -79, 6, -78, 10, -45, -5, -45], '#1c2e40');
    line([-15, -43, 16, -43], '#ded1ab', 4); rect(0, -46, 7, 6, '#f4d9a6', 1);
    if (player) {
      // Rook's split turquoise jacket, white wraps and coral scarf define the fighter.
      polygon([-20, -49, -4, -45, -11 - Math.abs(stride) * .4, -26, -25, -29], '#326e7d');
      polygon([-14, -83, -28, -81, -45 - Math.abs(stride), -70 + Math.sin(time * 9) * 3, -35, -87, -14, -89], '#e184a0');
      line([-14, -82, 9, -84], '#f5adba', 5);
    }
    limb([[8, -44], frontKnee, frontFoot], boss ? '#3b4f62' : '#30465b', boss ? 16 : 11);
    if (boss || bruiser) { rect(frontKnee[0] - 8, frontKnee[1] - 10, 15, 17, lit, 4); }
    line([frontFoot[0] - 8, frontFoot[1], frontFoot[0] + 13, frontFoot[1]], '#152535', 10);
    line([frontFoot[0] - 6, frontFoot[1] - 4, frontFoot[0] + 10, frontFoot[1] - 4], trim, 2);
    if (boss) {
      polygon([-27, -90, -7, -91, -12, -66, -30, -70, -38, -82], '#71828d');
      polygon([8, -92, 29, -87, 35, -75, 20, -65, 11, -73], '#8c999e');
      ellipse(-2, -66, 12, 12, ink); ellipse(-2, -66, 8, 8, trim); ellipse(-2, -66, 3, 5, '#fff4c3');
      line([-21, -87, -13, -73], trim, 3);
    }
    // Faces / visors have a strong directional nose and hair or helmet contour.
    line([-2, -83, -2, -91], '#d8ac94', 13);
    if (player) {
      polygon([-13, -113, 7, -116, 16, -103, 20, -98, 13, -95, 10, -87, -5, -87, -14, -98], '#eac2a5');
      polygon([-16, -106, -13, -120, -4, -124, 9, -120, 13, -110, 4, -110, -3, -103, -7, -98, -13, -98], '#1b2435');
      line([-11, -111, 11, -114], '#88f3d4', 3); line([7, -103, 13, -103], '#192435', 2);
      line([7, -92, 13, -92], '#925e65', 2);
    } else {
      polygon([-16, -110, -8, -119, 10, -117, 20, -105, 17, -89, -9, -87, -18, -97], lit);
      polygon([-14, -107, 18, -107, 22, -99, 14, -96, -12, -97], ink);
      line([-9, -102, 18, -102], trim, boss ? 5 : 3);
      rect(-7, -91, 20, 4, '#263847');
      if (boss) { polygon([-15, -111, -25, -128, -9, -119], '#9eacaa'); polygon([6, -117, 19, -130, 18, -109], '#b4b4a3'); }
    }
    limb([[14, -77], elbow, hand], coat, boss ? 19 : bruiser ? 14 : 10);
    line([elbow[0], elbow[1], hand[0] * .8 + elbow[0] * .2, hand[1] * .8 + elbow[1] * .2], lit, boss ? 13 : 7);
    ellipse(hand[0], hand[1], boss ? 14 : bruiser ? 11 : 8, boss ? 13 : 8, player ? '#d8e2d2' : trim);
    line([hand[0] - 4, hand[1] - 4, hand[0] + 4, hand[1] - 4], player ? '#74ddc9' : '#fff0bc', 2);
    if (player && active) {
      const tip = kick ? frontFoot : kind === 'cross' ? rearHand : hand;
      glow(tip[0], tip[1], heavy ? 35 : 23, '#8effdc66');
      ctx.strokeStyle = heavy ? '#ffdcad99' : '#b2ffe5aa'; ctx.lineWidth = heavy ? 6 : 3;
      ctx.beginPath(); ctx.ellipse(30, -55, heavy ? 58 : 45, heavy ? 42 : 26, -.2, -.9, 1); ctx.stroke();
    }
    if (a.flash > 0 && !reflection) { ctx.globalCompositeOperation = 'screen'; ellipse(0, -65, 23, 43, '#ffffe655'); }
    if (recovery && boss) text('OPEN', 0, -143, 9, '#a3ffdc', 'center');
    ctx.restore();
  }
  function telegraph(a: Actor, ground: number) {
    const s = a.attack; if (!s || a.health <= 0 || a.kind === 'player') return;
    const phase = attackPhase(s), d = attacks[s.kind]; if (phase === 'recovery') return;
    const active = phase === 'active', color = active ? '#ffb797' : '#ed7c99';
    const x = a.x, y = ground + a.lane;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(active ? [] : [8, 5]);
    ctx.globalAlpha = active ? .7 : .35 + .35 * Math.min(1, s.time / d.startup);
    if (s.kind === 'quake') {
      ellipse(x + a.facing * 40, y, d.reach, d.lane, '#e86e8b1c');
      ctx.beginPath(); ctx.ellipse(x + a.facing * 40, y, d.reach, d.lane, 0, 0, Math.PI * 2); ctx.stroke();
      text('JUMP / STEP OUT', x, y + d.lane + 17, 9, color, 'center');
    } else {
      const length = s.kind === 'charge' ? 350 : d.reach + 22, start = a.facing > 0 ? x : x - length;
      rect(start, y - d.lane, length, d.lane * 2, '#e86e8b19'); ctx.strokeRect(start, y - d.lane, length, d.lane * 2);
      if (s.kind === 'charge') text(a.facing > 0 ? 'CHARGE →' : '← CHARGE', x + a.facing * 140, y - d.lane - 10, 9, color, 'center');
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (phase === 'startup') {
      ellipse(x, y - (a.kind === 'warden' ? 216 : a.kind === 'bruiser' ? 171 : 146), 12, 12, '#302139');
      text('!', x, y - (a.kind === 'warden' ? 211 : a.kind === 'bruiser' ? 166 : 141), 18, '#ffd7bc', 'center');
    }
    ctx.restore();
  }
  return {
    reset() { particles = []; rings = []; camera = undefined; last = undefined; shake = 0; },
    consume(events: readonly BrawlerEvent[]) {
      for (const e of events) {
        const impact = e.type === 'hit' || e.type === 'damage' || e.type === 'ko';
        if (impact && !motion.matches) shake = Math.max(shake, Math.min(5, e.strength * 3));
        if (impact || e.type === 'pickup' || e.type === 'victory' || e.type === 'clear') {
          const color = e.type === 'damage' ? '#f797ac' : e.type === 'pickup' || e.type === 'victory' ? '#8effdb' : '#ffe6b1';
          if (rings.length < 12) rings.push({ x: e.x, lane: e.lane, life: .3, strength: e.strength, color });
          for (let i = 0; i < (motion.matches ? 0 : e.type === 'victory' || e.type === 'ko' && e.strength >= 3 ? 48 : impact ? 14 : 20) && particles.length < 150; i++) {
            const angle = i * 2.4, power = 60 + i % 5 * 32;
            particles.push({ x: e.x, lane: e.lane, z: impact ? 60 : 20, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power * .3,
              vz: 60 + Math.abs(Math.sin(angle)) * power, life: .35 + i % 4 * .12, max: .72, color });
          }
        }
      }
    },
    draw(run: Run, size: { width: number; height: number; ratio: number }, screen: Screen, now: number) {
      if (disposed) return;
      const width = Math.max(1, Math.round(size.width * size.ratio)), height = Math.max(1, Math.round(size.height * size.ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; camera = undefined; }
      const dt = last === undefined || screen === 'paused' || screen === 'title' ? 0 : clamp(now - last, 0, .05); last = now;
      const view = circuitView(size.width, size.height, run);
      camera = camera === undefined ? view.x : camera + (view.x - camera) * (motion.matches ? 1 : 1 - Math.exp(-7 * dt)); view.x = camera;
      ctx.setTransform(size.ratio * view.scale, 0, 0, size.ratio * view.scale, 0, 0); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      scenery(view, run, run.elapsed);
      ctx.save(); ctx.translate(-view.x + (motion.matches ? 0 : Math.sin(now * 83) * shake), motion.matches ? 0 : Math.cos(now * 67) * shake * .5);
      shake = Math.max(0, shake - dt * 26);
      for (const a of run.enemies) telegraph(a, view.ground);
      for (const pickup of run.pickups) if (!pickup.collected) {
        const x = pickup.x, y = view.ground + pickup.lane;
        ellipse(x, y, 22, 6, '#071525aa'); glow(x, y - 12, 42, '#7bffd730');
        rect(x - 12, y - 24 + Math.sin(run.elapsed * 3) * 2, 24, 20, '#254b50', 4);
        rect(x - 8, y - 22, 16, 2, '#9ce9c7'); rect(x - 2, y - 20, 4, 13, '#9bffd3'); rect(x - 7, y - 15, 14, 4, '#9bffd3');
        text(`+${pickup.health}`, x, y - 33, 10, '#adffdb', 'center');
      }
      const actors = [run.player, ...run.enemies].filter(a => a.health > 0 || a.death > 0).sort((a, b) => a.lane - b.lane || a.id - b.id);
      // Reflections and shadows stay on the ground, independently of jump elevation.
      ctx.save(); ctx.beginPath(); ctx.rect(view.x, view.ground, view.width, view.height); ctx.clip();
      for (const a of actors) {
        ctx.save(); ctx.globalAlpha = .10; ctx.translate(a.x, view.ground + a.lane + 4); ctx.scale(1, -.45); body(a, run.elapsed, true); ctx.restore();
      }
      ctx.restore();
      for (const a of actors) {
        ellipse(a.x, view.ground + a.lane + 1, a.radius * 1.4, a.radius * .3, '#030e1b99');
        ctx.save(); ctx.translate(a.x, view.ground + a.lane); body(a, run.elapsed); ctx.restore();
        if (a.kind !== 'player' && a.kind !== 'warden' && a.health > 0 && a.health < a.maxHealth) {
          rect(a.x - 20, view.ground + a.lane - (a.kind === 'bruiser' ? 159 : 135), 40, 3, '#0a1525');
          rect(a.x - 20, view.ground + a.lane - (a.kind === 'bruiser' ? 159 : 135), 40 * a.health / a.maxHealth, 3, '#e2a5aa');
        }
      }
      for (const ring of rings) {
        ring.life -= dt; ctx.save(); ctx.globalAlpha = Math.max(0, ring.life / .3); ctx.strokeStyle = ring.color; ctx.lineWidth = 2;
        const radius = 10 + (1 - ring.life / .3) * 45 * ring.strength;
        ctx.beginPath(); ctx.ellipse(ring.x, view.ground + ring.lane - 55, radius, radius * .7, -.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      rings = rings.filter(r => r.life > 0);
      for (const p of particles) {
        p.life -= dt; p.x += p.vx * dt; p.lane += p.vy * dt; p.z += p.vz * dt; p.vz -= 430 * dt;
        ctx.globalAlpha = Math.max(0, p.life / p.max); line([p.x, view.ground + p.lane - p.z, p.x - p.vx * .025, view.ground + p.lane - p.z + p.vz * .025], p.color, 2.5);
      }
      ctx.globalAlpha = 1; particles = particles.filter(p => p.life > 0); ctx.restore();
      if (run.respawn > 0) { text('GET UP, ROOK.', view.width / 2, view.ground - 150, 23, '#adffe0', 'center'); }
      if (run.finale > 0 || run.status === 'victory') {
        glow(view.width * .65, view.ground * .4, 450, '#a1ffe32b');
        text('GRID ONLINE', view.width / 2, view.ground - 205, 28, '#bcffe5', 'center');
        text('THE CITY REMEMBERS THE LIGHT.', view.width / 2, view.ground - 174, 10, '#f8ddb5', 'center');
      }
      if (screen === 'title' && size.width > 850) {
        ctx.save(); ctx.translate(view.width * .77, view.ground + 85); ctx.scale(2.55, 2.55);
        glow(0, -65, 120, '#5dedd62b'); body({ ...run.player, x: 0, lane: 0, facing: -1 }, 0); ctx.restore();
        text('ROOK / STREET CIRCUIT', view.width * .77, view.ground + 125, 11, '#9de5da', 'center');
      }
      // A subtle border treatment gives the rain-soaked scene a printed arcade-poster finish.
      const shade = ctx.createLinearGradient(0, 0, 0, view.height); shade.addColorStop(0, '#060d1b55'); shade.addColorStop(.3, '#060d1b00'); shade.addColorStop(1, '#060d1b55'); rect(0, 0, view.width, view.height, shade);
    },
    dispose() { if (disposed) return; disposed = true; particles = []; rings = []; canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
