import { rooms, getTarget, type Point, type TargetId, type RoomId } from './content.ts';
import { has, roomTargets, wardReady, type Run } from './game.ts';
const roomColors: Record<RoomId, string> = { hall: '#283c43', gallery: '#343040', library: '#3d342d', kitchen: '#303e36', bell: '#252c45' };
export const WORLD = { width: 960, height: 540 };
export function transform(width: number, height: number) {
  const scale = Math.min(width / WORLD.width, height / WORLD.height);
  return { scale, x: (width - WORLD.width * scale) / 2, y: (height - WORLD.height * scale) / 2 };
}
export function worldPoint(x: number, y: number, width: number, height: number): Point | undefined {
  const view = transform(width, height), point = { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale };
  return point.x >= 0 && point.x <= 960 && point.y >= 0 && point.y <= 540 ? point : undefined;
}
export function hitTarget(run: Run, point: Point): TargetId | undefined {
  return roomTargets(run).filter(id => { const t = getTarget(id); return point.x >= t.x && point.x <= t.x + t.w && point.y >= t.y && point.y <= t.y + t.h; })
    .sort((a, b) => getTarget(a).w * getTarget(a).h - getTarget(b).w * getTarget(b).h)[0];
}
export function createPresentation(surface: HTMLElement) {
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', 'Blackthorn Castle scene'); surface.append(canvas);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D is unavailable.');
  const c = ctx;
  function rect(x: number, y: number, w: number, h: number, fill: string, stroke?: string) { c.fillStyle = fill; c.fillRect(x, y, w, h); if (stroke) { c.strokeStyle = stroke; c.strokeRect(x, y, w, h); } }
  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
  function line(x: number, y: number, ex: number, ey: number, color: string, width = 2) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke(); c.lineWidth = 1; }
  function label(text: string, x: number, y: number, size = 13, color = '#e1d6b8', align: CanvasTextAlign = 'center') { c.font = `${size}px Georgia, serif`; c.fillStyle = color; c.textAlign = align; c.fillText(text, x, y); }
  function arch(x: number, y: number, w: number, h: number, color: string) {
    c.fillStyle = color; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.quadraticCurveTo(x, y, x + w / 2, y - 12); c.quadraticCurveTo(x + w, y, x + w, y + w / 2); c.lineTo(x + w, y + h); c.closePath(); c.fill();
  }
  function candle(x: number, y: number, time: number) {
    rect(x - 2, y, 4, 22, '#c9ba8b'); ellipse(x, y - 4, 3 + Math.sin(time * 2 + x) * .5, 7, '#f4c679');
    const glow = c.createRadialGradient(x, y, 0, x, y, 72); glow.addColorStop(0, '#f5c87d22'); glow.addColorStop(1, '#f5c87d00'); c.fillStyle = glow; c.fillRect(x - 72, y - 72, 144, 144);
  }
  function person(x: number, foot: number, color: string, ghost: boolean, time: number, headless = false, moving = false) {
    const bob = ghost ? Math.sin(time * 1.5 + x) * 4 : moving ? Math.sin(time * 15) * 2 : 0;
    c.save(); c.translate(x, foot + bob); if (ghost) c.globalAlpha = .8;
    ellipse(0, 0, 24, 6, '#00000044');
    c.fillStyle = color; c.beginPath(); c.moveTo(-17, -70); c.lineTo(14, -70); c.lineTo(27, -13); c.lineTo(ghost ? 8 : 20, ghost ? 4 : -5); c.lineTo(-26, -9); c.closePath(); c.fill();
    if (!ghost) { line(-10, -10, -11 + (moving ? Math.sin(time * 15) * 8 : 0), 0, '#171c20', 7); line(10, -10, 10 - (moving ? Math.sin(time * 15) * 8 : 0), 0, '#171c20', 7); }
    const hx = headless ? 30 : 0, hy = headless ? -38 : -84;
    ellipse(hx, hy, 13, 17, ghost ? '#b6ded0' : '#cbb99b');
    rect(hx - 14, hy - 18, 28, 7, ghost ? '#536c6b' : '#202b30');
    if (!ghost) rect(hx - 9, hy - 29, 19, 13, '#202b30');
    ellipse(hx + 5, hy - 1, 2, 2, '#1b3134'); line(-15, -59, -28, -35, color, 7); line(13, -59, 26, -35, color, 7);
    if (!ghost) { rect(23, -34, 12, 17, '#967144', '#d9b26b'); rect(26, -31, 6, 10, '#f2c66b'); }
    c.restore();
  }
  function object(run: Run, id: TargetId, time: number) {
    const t = getTarget(id), { x, y, w, h } = t;
    if (t.kind === 'exit') {
      arch(x - 6, y - 8, w + 12, h + 8, '#59605b'); arch(x, y, w, h, '#111e27');
      for (let i = 1; i < 5; i++) line(x + i * w / 5, y + 35, x + i * w / 5, y + h, '#3b423e');
      if (id === 'bellDoor' && !has(run, 'confronted')) line(x + 5, y + 85, x + w - 5, y + 75, '#a88a52', 5);
      label(id === 'bellDoor' ? 'BELL TOWER' : t.name.toUpperCase(), x + w / 2, y - 20, 10); return;
    }
    if (t.kind === 'person' || ['oswald', 'brindle'].includes(id)) {
      person(x + w / 2, y + h, id === 'evelyn' ? '#755655' : id === 'vale' ? '#454d56' : '#658779', t.kind === 'ghost', time, id === 'oswald'); return;
    }
    switch (id) {
      case 'whisper': case 'guest': {
        const lit = id === 'guest' || has(run, 'whisperLit');
        c.save(); c.globalAlpha = lit ? .8 : .35;
        const cx = x + w / 2, cy = y + h / 2 + Math.sin(time * 2) * 8;
        const glow = c.createRadialGradient(cx, cy, 3, cx, cy, w); glow.addColorStop(0, '#98e4ce55'); glow.addColorStop(1, '#98e4ce00'); c.fillStyle = glow; c.fillRect(cx - w, cy - w, w * 2, w * 2);
        ellipse(cx, cy, w * .32, h * .34, id === 'guest' && !wardReady(run) ? '#8f82af' : '#a9decd');
        ellipse(cx - 10, cy - 10, 4, 7, '#263b47'); ellipse(cx + 10, cy - 10, 4, 7, '#263b47'); ellipse(cx, cy + 13, 6, 9, '#44626b');
        c.restore(); break;
      }
      case 'portrait': case 'emptyFrame': case 'photo':
        rect(x - 7, y - 7, w + 14, h + 14, '#917d55', '#c1a779'); rect(x, y, w, h, '#182a30');
        if (id !== 'emptyFrame' || has(run, 'released')) {
          ellipse(x + w / 2, y + h * .38, w * .2, h * .18, id === 'emptyFrame' ? '#9ed5c2' : '#a99e88');
          rect(x + w * .2, y + h * .58, w * .6, h * .36, '#525e57');
          if (id === 'portrait') { ellipse(x + w / 2, y + h * .48, 9, has(run, 'disabled') ? 2 : 12, '#243137'); for (let i = 0; i < 4; i++) line(x + 15 + i * 7, y + h - 4, x + 15 + i * 7, y + h + 9, '#1a2026'); }
        }
        if (id === 'photo' && has(run, 'photoLit')) rect(x, y + h - 3, w, 3, '#a2dfc3');
        break;
      case 'crate': rect(x, y, w, h, '#6b5140', '#a98658'); line(x, y + h, x + w, y, '#b19261', 3); label('◇ V ◇', x + w / 2, y + 35, 20); break;
      case 'journal': rect(x, y, w, h, '#bdac85', '#73674d'); line(x + w / 2, y, x + w / 2, y + h, '#615940'); for (let i = 0; i < 4; i++) line(x + 8, y + 10 + i * 9, x + 47, y + 10 + i * 9, '#726b55', 1); break;
      case 'musicBox': rect(x, y, w, h, '#7b573d', '#b99b65'); rect(x + 8, y - 12, w - 16, 16, '#b99b65'); ellipse(x + w / 2, y + 18, 12, 5, '#d1b87e'); if (has(run, 'music')) label('♪', x + w / 2, y - 24 + Math.sin(time * 2) * 3, 23, '#adcabc'); break;
      case 'brush': rect(x + 8, y + 13, 45, 8, '#a68857'); rect(x + 42, y + 5, 25, 24, '#bdb29a'); break;
      case 'poker': line(x + 18, y + 5, x + 18, y + h, '#b0aaa0', 5); line(x + 18, y + 8, x + 30, y + 8, '#b0aaa0', 5); break;
      case 'cabinet': rect(x, y, w, h, '#655944', '#b2a17b'); rect(x + 9, y + 12, w - 18, h - 35, has(run, 'cabinetOpen') ? '#1e2b2c' : '#425250', '#a1936e'); if (!has(run, 'cabinetOpen')) label('⚿', x + w / 2, y + 65, 28); break;
      case 'tube': rect(x + 38, 85, 30, y + h - 85, '#a2855b', '#d0ae77'); rect(x, y, w, h, has(run, 'tubeOpen') ? '#182b2c' : '#4e4940', '#a38c65');
        if (has(run, 'tubeOpen')) { ellipse(x + 48, y + 55, 26, 32, '#855342'); label('◇ V', x + 55, y + 105, 16); line(x + 85, y + 70, x + 100, y + 35, '#d0b582', 5); }
        else label('SOOT', x + w / 2, y + 70, 15); break;
      case 'chain': for (let i = 0; i < 9; i++) { c.strokeStyle = has(run, 'chain') ? '#d2c392' : '#7e8888'; c.beginPath(); c.ellipse(x + 30 + (has(run, 'chain') ? i * 10 : Math.sin(i) * 5), y + i * 13, 6, 10, -.4, 0, Math.PI * 2); c.stroke(); } break;
      case 'ward': line(x, y + 15, x + 43, y, '#c1cfb9', 4); line(x + 88, y, x + w, y + 15, '#c1cfb9', 4); if (has(run, 'ward')) line(x + 43, y, x + 88, y, '#bfe7c4', 4); break;
      case 'mirror': rect(x, y, w, h, '#8c825f', '#c3b384'); rect(x + 7, y + 7, w - 14, h - 14, has(run, 'mirror') ? '#a1c3bd' : '#657e92'); line(x + 15, y + h - 25, x + w - 15, y + 20, '#c9dbcf', 4); break;
      case 'housing': line(x + w / 2, 0, x + w / 2, y + 30, '#8e826d', 9); c.fillStyle = '#8d8266'; c.beginPath(); c.moveTo(x + 35, y + 30); c.quadraticCurveTo(x + w / 2, y - 5, x + w - 35, y + 30); c.lineTo(x + w, y + h - 20); c.lineTo(x, y + h - 20); c.closePath(); c.fill(); rect(x - 5, y + h - 25, w + 10, 20, '#b0a37b'); rect(x + 57, y + h - 65, 56, 48, '#1b2c30', '#c1b085'); break;
    }
  }
  return { canvas,
    draw(run: Run, size: { width: number; height: number; ratio: number }, selected: TargetId | undefined, hover: TargetId | undefined, reveal: boolean, debug: boolean, reduced: boolean, animationTime: number) {
      const width = Math.round(size.width * size.ratio), height = Math.round(size.height * size.ratio);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      c.setTransform(size.ratio, 0, 0, size.ratio, 0, 0); rect(0, 0, size.width, size.height, '#101c23');
      const view = transform(size.width, size.height); c.translate(view.x, view.y); c.scale(view.scale, view.scale);
      const time = reduced ? 0 : animationTime, room = rooms[run.room];
      const bg = c.createLinearGradient(0, 0, 0, 540); bg.addColorStop(0, '#0e1b24'); bg.addColorStop(.65, roomColors[run.room]); bg.addColorStop(1, '#141d24'); c.fillStyle = bg; c.fillRect(0, 0, 960, 540);
      for (let y = 80; y < 355; y += 46) for (let x = (y % 92 ? -70 : 0); x < 960; x += 140) rect(x, y, 139, 45, '#ffffff02', '#ffffff06');
      for (const x of [150, 770]) { arch(x, 66, 75, 190, '#324657'); arch(x + 8, 80, 59, 163, '#668891'); line(x + 37, 77, x + 37, 243, '#202f37', 7); line(x + 7, 155, x + 68, 155, '#202f37', 6); }
      if (run.room === 'library') for (const x of [180, 340, 510, 690]) { rect(x, 90, 105, 225, '#493a30', '#8d7956'); for (let row = 0; row < 4; row++) for (let i = 0; i < 10; i++) rect(x + 5 + i * 9, 100 + row * 53, 6, 38, ['#566f65', '#876a55', '#8c805f'][i % 3]!); }
      if (run.room === 'kitchen') { rect(190, 115, 240, 200, '#252b29', '#736d5c'); arch(240, 160, 140, 145, '#102127'); for (let i = 0; i < 3; i++) candle(278 + i * 25, 283, time); }
      rect(0, 380, 960, 160, '#242b2c'); line(0, 380, 960, 380, '#7d7560', 4);
      for (let x = -700; x <= 1600; x += 160) line(480 + (x - 480) * .4, 380, x, 540, '#4c514947');
      for (const y of [407, 447, 503]) line(0, y, 960, y, '#55594e44');
      if (run.room === 'hall' || run.room === 'library') { rect(340, 420, 280, 115, '#783f3d66'); line(355, 420, 355, 535, '#b9946255'); line(605, 420, 605, 535, '#b9946255'); }
      const visible = roomTargets(run).sort((a, b) => getTarget(a).y - getTarget(b).y);
      for (const id of visible) object(run, id, time);
      candle(135, 302, time); candle(830, 302, time);
      person(run.actor.x, run.actor.y, '#60737b', false, time, false, !!run.pending);
      if (run.pending) { const p = run.pending.path.at(-1)!; c.strokeStyle = '#c5b07a88'; c.beginPath(); c.ellipse(p.x, p.y, 12, 4, 0, 0, Math.PI * 2); c.stroke(); }
      for (const id of visible) {
        if (!reveal && id !== selected && id !== hover) continue;
        const t = getTarget(id); c.strokeStyle = id === selected ? '#f3ce87' : '#b7c8be99'; c.lineWidth = id === selected ? 2 : 1; c.strokeRect(t.x - 3, t.y - 3, t.w + 6, t.h + 6);
        const nameWidth = Math.max(72, t.name.length * 7 + 16), lx = Math.max(nameWidth / 2, Math.min(960 - nameWidth / 2, t.x + t.w / 2));
        rect(lx - nameWidth / 2, t.y - 27, nameWidth, 20, '#101d27ed'); label(t.name, lx, t.y - 13, 12, '#f2dfb1');
      }
      c.lineWidth = 1;
      if (debug) for (const f of room.floor) { c.strokeStyle = '#59ffb4'; c.strokeRect(f.x, f.y, f.w, f.h); }
      label('BLACKTHORN CASTLE', 480, 32, 11, '#bba77c'); label(room.name, 480, 60, 24, '#eee0bf');
      label('PERCIVAL WREN  /  CONSULTING DETECTIVE OF UNNATURAL AFFAIRS', 480, 527, 10, '#acb7ad');
    },
    dispose() { canvas.remove(); canvas.width = canvas.height = 0; },
  };
}
