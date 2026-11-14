import { createImageResource } from '../../engine/browser/images.ts';
import { rooms, getTarget, type Point, type TargetId, type ItemId } from './content.ts';
import { has, roomTargets, wardReady, type Run, type Command, type TargetCommand } from './game.ts';
import { artwork, castFrames, propFrames, equipmentFrames, itemFrames, validateArtwork, walkClip, type CastRole, type PropRole } from './art.ts';
export const WORLD = { width: 960, height: 540 };
export function transform(width: number, height: number) {
  const scale = Math.min(width / WORLD.width, height / WORLD.height);
  return { scale, x: (width - WORLD.width * scale) / 2, y: (height - WORLD.height * scale) / 2 };
}
export function worldPoint(x: number, y: number, width: number, height: number): Point | undefined {
  const view = transform(width, height), point = { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale };
  return point.x >= 0 && point.x <= WORLD.width && point.y >= 0 && point.y <= WORLD.height ? point : undefined;
}
export function createPresentation(surface: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Blackthorn Castle · Arcade artwork');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable.');
  const c = context, resource = createImageResource(artwork, validateArtwork);
  surface.append(canvas);
  let last: { run: Run; room: Run['room']; x: number; y: number; time: number } | undefined;
  let phase = 0, approach: TargetCommand | undefined, pose: CastRole = 'idle', poseUntil = 0;
  function react(command: Command, time: number) {
    if (command.kind === 'target' || command.kind === 'tool') {
      if (command.kind === 'target' && command.verb !== 'use'
        && (['person', 'exit'].includes(getTarget(command.target).kind)
          || ['oswald', 'brindle', 'guest', 'whisper'].includes(command.target))) return;
      pose = 'item' in command && ['lantern', 'bellows', 'fork'].includes(command.item) ? 'lantern' : 'reach';
      poseUntil = time + .65;
    }
  }
  function glow(x: number, y: number, radius: number, color: string, strength = 1) {
    c.save(); c.globalAlpha = strength;
    const g = c.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color); g.addColorStop(1, '#00000000');
    c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2); c.restore();
  }
  function line(points: readonly Point[], color: string, width = 2) {
    c.beginPath(); c.strokeStyle = color; c.lineWidth = width;
    points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
  }
  function sprite(role: PropRole, x: number, y: number, w: number, h: number, angle = 0) {
    const f = propFrames[role], scale = Math.min(w / f.w, h / f.h);
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(angle);
    c.drawImage(resource.images.props!, f.x, f.y, f.w, f.h, -f.w * scale / 2, -f.h * scale / 2, f.w * scale, f.h * scale); c.restore();
  }
  function character(role: CastRole, x: number, foot: number, scale: number, facing = 1, opacity = 1) {
    const f = castFrames[role];
    c.save(); c.globalAlpha = opacity; c.translate(x, foot); c.scale(facing * scale, scale);
    c.drawImage(resource.images.cast!, f.x, f.y, f.w, f.h, -f.anchorX, -f.foot, f.w, f.h); c.restore();
  }
  function shadow(x: number, y: number, width: number) {
    c.fillStyle = '#03080bad'; c.beginPath(); c.ellipse(x, y, width, 5, 0, 0, Math.PI * 2); c.fill();
  }
  function table(x: number, y: number, w: number, h: number) {
    const f = equipmentFrames.table;
    c.drawImage(resource.images.equipment!, f.x, f.y, f.w, f.h, x, y, w, h);
  }
  function itemIcon(id: ItemId) {
    const icon = document.createElement('canvas'), { sheet, frame: f } = itemFrames[id];
    icon.width = icon.height = 112; icon.className = 'adventure-item-art'; icon.setAttribute('aria-hidden', 'true');
    const ctx = icon.getContext('2d');
    if (ctx) {
      const scale = 100 / Math.max(f.w, f.h);
      ctx.drawImage(resource.images[sheet]!, f.x, f.y, f.w, f.h, (112 - f.w * scale) / 2, (112 - f.h * scale) / 2, f.w * scale, f.h * scale);
    }
    return icon;
  }
  function object(run: Run, id: TargetId, time: number) {
    const t = getTarget(id), { x, y, w, h } = t;
    if (t.kind === 'exit') {
      const f = propFrames.door;
      // Narrow, tall architectural registration, with its threshold on the
      // authored target's floor rather than vertically centering the arch.
      c.drawImage(resource.images.props!, f.x, f.y, f.w, f.h, x - 18, y - 55, w + 36, h + 55);
      if (id === 'bellDoor' && !has(run, 'confronted')) sprite('chainAttached', x - 5, y + 60, w + 10, 70);
      return;
    }
    if (['evelyn', 'vale', 'oswald', 'brindle'].includes(id)) {
      const ghost = t.kind === 'ghost', bob = ghost ? Math.sin(time * 1.4 + x) * 2 : 0;
      shadow(x + w / 2, y + h, w * .34);
      if (ghost) glow(x + w / 2, y + h * .5, 90, '#65bfa51a');
      character(id as CastRole, x + w / 2, y + h + bob, h / 317, 1, ghost ? .88 : 1); return;
    }
    let role: PropRole | undefined;
    switch (id) {
      case 'whisper':
        c.save(); c.globalAlpha = has(run, 'whisperLit') ? .94 : .38;
        glow(x + w / 2, y + h / 2, 90, '#84dfbb2b');
        sprite('whisper', x, y + Math.sin(time * 1.7) * 5, w, h); c.restore(); return;
      case 'guest':
        glow(x + w / 2, y + h / 2, 130, wardReady(run) ? '#6ddfbb38' : '#8a83e533');
        character('guest', x + w / 2, y + h + Math.sin(time * 1.4) * 4, h / 320, 1, wardReady(run) ? .62 : .94); return;
      case 'portrait': role = has(run, 'disabled') ? 'portraitQuiet' : 'portraitScream'; break;
      case 'emptyFrame': role = has(run, 'released') ? 'inhabitedFrame' : 'emptyFrame'; break;
      case 'crate': role = 'crate'; break;
      case 'journal': role = 'journal'; break;
      case 'photo': role = 'photo'; break;
      case 'musicBox': role = 'musicBox'; break;
      case 'poker': role = 'poker'; break;
      case 'brush': sprite('brush', x + 12, y - 7, 45, 60, -Math.PI / 2.5); return;
      case 'tube': role = has(run, 'tubeOpen') ? 'tubeOpen' : 'tubeClosed'; break;
      case 'cabinet': role = has(run, 'cabinetOpen') ? 'cabinetOpen' : 'cabinetClosed'; break;
      case 'chain': role = has(run, 'chain') ? 'chainAttached' : 'chainLoose'; break;
      case 'mirror': role = has(run, 'mirror') ? 'mirrorIn' : 'mirrorOut'; break;
      case 'housing':
        line([{ x: x + w / 2, y: 0 }, { x: x + w / 2, y: y + 35 }], '#74654b', 5);
        role = 'housing'; break;
      case 'ward': {
        const color = has(run, 'ward') ? '#c7e3d5' : '#b7aea0';
        line([{ x, y: y + 17 }, { x: x + 38, y: y + 3 }], color, 3);
        line([{ x: x + 94, y: y + 3 }, { x: x + w, y: y + 17 }], color, 3);
        if (has(run, 'ward')) line([{ x: x + 38, y: y + 3 }, { x: x + 94, y: y + 3 }], color, 3);
        return;
      }
    }
    if (role) sprite(role, x, y, w, h);
    if (id === 'housing' && has(run, 'finished')) sprite('lantern', x + 65, y + h - 65, 40, 50);
    if (id === 'photo' && has(run, 'photoLit')) glow(x + w / 2, y + h / 2, 85, '#b6e5bf33');
    if (id === 'musicBox' && has(run, 'music')) {
      glow(x + w / 2, y + 20, 50, '#edcb7933');
      for (let i = 0; i < 3; i++) {
        const drift = (time * .3 + i / 3) % 1;
        c.fillStyle = `rgba(227,201,142,${(1 - drift) * .65})`;
        c.beginPath(); c.ellipse(x + 25 + i * 17, y - drift * 26, 2, 2, 0, 0, Math.PI * 2); c.fill();
      }
    }
  }
  return {
    canvas, prepare: resource.prepare, react, itemIcon,
    reset() { last = undefined; phase = 0; approach = undefined; pose = 'idle'; poseUntil = 0; },
    draw(run: Run, size: { width: number; height: number; ratio: number }, debug: boolean, reduced: boolean, animationTime: number) {
      if (!resource.images.cast) return;
      const sameRoom = last?.run === run && last.room === run.room;
      const distance = sameRoom ? Math.hypot(run.actor.x - last!.x, run.actor.y - last!.y) : 0;
      if (!sameRoom) { phase = 0; approach = undefined; poseUntil = 0; }
      if (distance > 0) phase += distance / 72;
      if (approach && !run.pending && sameRoom && animationTime > last!.time) {
        const at = getTarget(approach.target).at;
        if (Math.hypot(run.actor.x - at.x, run.actor.y - at.y) < 3) react(approach, animationTime);
      }
      approach = run.pending?.command;
      last = { run, room: run.room, x: run.actor.x, y: run.actor.y, time: animationTime };
      const width = Math.round(size.width * size.ratio), height = Math.round(size.height * size.ratio);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      c.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
      c.fillStyle = '#080f16'; c.fillRect(0, 0, size.width, size.height);
      const view = transform(size.width, size.height);
      c.translate(view.x, view.y); c.scale(view.scale, view.scale);
      c.save(); c.beginPath(); c.rect(0, 0, WORLD.width, WORLD.height); c.clip();
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(resource.images[run.room]!, 0, 0, WORLD.width, WORLD.height);
      if (run.room === 'library') table(230, 375, 325, 80);
      if (run.room === 'kitchen') table(230, 368, 115, 48);
      const time = reduced ? 0 : animationTime;
      // The housing sits behind its inhabitant; the detective's floor geometry
      // remains independent of all cosmetic asset sizes.
      const visible = roomTargets(run).sort((a, b) => a === 'housing' ? -1 : b === 'housing' ? 1 : getTarget(a).y + getTarget(a).h - getTarget(b).y - getTarget(b).h);
      for (const id of visible) object(run, id, time);
      const moving = !!run.pending?.path.length;
      const role = moving ? walkClip[Math.floor(phase * walkClip.length) % walkClip.length]! : animationTime < poseUntil ? pose : 'idle';
      shadow(run.actor.x, run.actor.y, 24);
      const lanternX = run.actor.x + run.facing * (role === 'lantern' ? 34 : 27);
      const lanternY = run.actor.y - (role === 'lantern' ? 119 : 48);
      glow(lanternX, lanternY, 82, run.lantern.occupant === 'empty' ? '#e4b35725' : '#6dddbb3b', 1 + Math.sin(time * 3.2) * .06);
      character(role, run.actor.x, run.actor.y, .48, run.facing);
      if (run.lantern.occupant !== 'empty') {
        glow(lanternX, lanternY, 20, '#80e7c077');
        if (run.lantern.phase === 'sealed') {
          c.strokeStyle = '#e1c580'; c.lineWidth = 1;
          c.beginPath(); c.ellipse(lanternX, lanternY, 8, 12, 0, 0, Math.PI * 2); c.stroke();
        }
      }
      if (run.pending) {
        const p = run.pending.path.at(-1)!;
        c.strokeStyle = '#dcc49177'; c.lineWidth = 1;
        c.beginPath(); c.ellipse(p.x, p.y, 10, 3, 0, 0, Math.PI * 2); c.stroke();
      }
      if (!reduced) for (let i = 0; i < 12; i++) {
        const x = (i * 83 + Math.sin(time * .18 + i) * 9) % WORLD.width;
        const y = 80 + (i * 37 - time * (2 + i % 3) % 330 + 330) % 330;
        c.fillStyle = '#ddcaa22b'; c.fillRect(x, y, 1.4, 1.4);
      }
      const edge = c.createRadialGradient(480, 280, 230, 480, 280, 610);
      edge.addColorStop(0, '#00000000'); edge.addColorStop(1, '#02091077');
      c.fillStyle = edge; c.fillRect(0, 0, WORLD.width, WORLD.height);
      if (debug) for (const f of rooms[run.room].floor) { c.strokeStyle = '#59ffb4'; c.strokeRect(f.x, f.y, f.w, f.h); }
      c.restore();
    },
    dispose() { resource.dispose(); canvas.remove(); canvas.width = canvas.height = 0; },
  };
}
