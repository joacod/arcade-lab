import { createImageResource } from '../../engine/browser/images.ts';
import { rooms, getTarget, type Point, type TargetId, type ItemId } from './content.ts';
import { has, roomTargets, wardReady, type Run, type Command, type TargetCommand } from './game.ts';
import { arcadeArt, appearances, validateArtwork, walkClip, strideDistance, type AdventureArt, type CastRole, type PropRole } from './art.ts';
import { createSceneArt } from './scene-art.ts';
export const WORLD = { width: 960, height: 540 };
export function transform(width: number, height: number) {
  const scale = Math.min(width / WORLD.width, height / WORLD.height);
  return { scale, x: (width - WORLD.width * scale) / 2, y: (height - WORLD.height * scale) / 2 };
}
export function worldPoint(x: number, y: number, width: number, height: number): Point | undefined {
  const view = transform(width, height), point = { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale };
  return point.x >= 0 && point.x <= WORLD.width && point.y >= 0 && point.y <= WORLD.height ? point : undefined;
}
export function createPresentation(surface: HTMLElement, art: AdventureArt = arcadeArt) {
  const { artwork, castFrames, propFrames, equipmentFrames, serviceFrames, itemFrames } = art;
  const deluxe = art.mode === 'deluxe';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', `Blackthorn Castle · ${art.mode === 'deluxe' ? 'Deluxe' : 'Arcade'} · ${appearances[art.mode]} artwork`);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable.');
  const c = context;
  const scenery = document.createElement('canvas'), backdrop = scenery.getContext('2d', { alpha: false });
  if (!backdrop) throw new Error('Canvas 2D is unavailable.');
  const lights = new Map<string, HTMLCanvasElement>();
  const vignette = document.createElement('canvas'); vignette.width = WORLD.width; vignette.height = WORLD.height;
  const edgeContext = vignette.getContext('2d')!;
  const edge = edgeContext.createRadialGradient(480, 280, 230, 480, 280, 610);
  edge.addColorStop(0, '#00000000'); edge.addColorStop(1, '#02091077');
  edgeContext.fillStyle = edge; edgeContext.fillRect(0, 0, WORLD.width, WORLD.height);
  const resource = createImageResource(artwork, dimensions => validateArtwork(art, dimensions));
  const sceneArt = createSceneArt(art.mode, () => resource.images);
  let disposed = false, sceneryKey = '';
  surface.append(canvas);
  let last: { run: Run; room: Run['room']; x: number; y: number; time: number } | undefined;
  let phase = 0, approach: TargetCommand | undefined, pose: CastRole = 'idle', poseUntil = 0;
  function react(command: Command, time: number) {
    if (command.kind === 'target' || command.kind === 'tool') {
      if (command.kind === 'target' && command.verb !== 'use'
        && (command.verb === 'inspect' || ['person', 'exit'].includes(getTarget(command.target).kind)
          || ['oswald', 'brindle', 'guest', 'whisper'].includes(command.target))) return;
      pose = 'item' in command && ['lantern', 'bellows', 'fork'].includes(command.item) ? 'lantern' : 'reach';
      poseUntil = time + (pose === 'lantern' ? .42 : .28);
    }
  }
  function glow(x: number, y: number, radius: number, color: string, strength = 1) {
    let stamp = lights.get(color);
    if (!stamp) {
      stamp = document.createElement('canvas'); stamp.width = stamp.height = 128;
      const light = stamp.getContext('2d')!, gradient = light.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, color); gradient.addColorStop(1, '#00000000');
      light.fillStyle = gradient; light.fillRect(0, 0, 128, 128); lights.set(color, stamp);
    }
    c.save(); c.globalAlpha *= strength;
    c.drawImage(stamp, x - radius, y - radius, radius * 2, radius * 2); c.restore();
  }
  function line(c: CanvasRenderingContext2D, points: readonly Point[], color: string, width = 2) {
    c.beginPath(); c.strokeStyle = color; c.lineWidth = width;
    points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
  }
  function sprite(c: CanvasRenderingContext2D, role: PropRole, x: number, y: number, w: number, h: number, angle = 0) {
    const f = propFrames[role], scale = Math.min(w / f.w, h / f.h);
    if (['crate', 'cabinetOpen', 'cabinetClosed'].includes(role)) shadow(c, x + w / 2, y + h / 2 + f.h * scale / 2, f.w * scale * .48);
    if (['journal', 'musicBox', 'brush'].includes(role)) shadow(c, x + w / 2, y + h / 2 + f.h * scale / 2, f.w * scale * .42, 2);
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(angle);
    sceneArt.draw(c, 'props', f, -f.w * scale / 2, -f.h * scale / 2, f.w * scale, f.h * scale, role === 'whisper'); c.restore();
  }
  function character(role: CastRole, x: number, foot: number, scale: number, facing = 1, opacity = 1) {
    const f = castFrames[role];
    const size = scale * f.scale;
    c.save(); c.globalAlpha = opacity; c.translate(x, foot); c.scale(facing, 1);
    sceneArt.draw(c, f.sheet, f, -f.anchorX * size, -f.foot * size, f.w * size, f.h * size,
      ['oswald', 'brindle', 'guest'].includes(role)); c.restore();
  }
  function shadow(c: CanvasRenderingContext2D, x: number, y: number, width: number, height = 7, strength = 1) {
    let stamp = lights.get('contact');
    if (!stamp) {
      stamp = document.createElement('canvas'); stamp.width = stamp.height = 128;
      const ink = stamp.getContext('2d')!, shade = ink.createRadialGradient(64, 64, 0, 64, 64, 64);
      shade.addColorStop(0, '#091019a6'); shade.addColorStop(.35, '#09101970'); shade.addColorStop(1, '#09101900');
      ink.fillStyle = shade; ink.fillRect(0, 0, 128, 128); lights.set('contact', stamp);
    }
    c.save(); c.globalAlpha *= strength;
    c.drawImage(stamp, x - width, y - height, width * 2, height * 2); c.restore();
  }
  function table(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const f = equipmentFrames.table;
    shadow(c, x + w / 2, y + h - 1, w * .57, 9, .8);
    shadow(c, x + w * .10, y + h - 1, w * .10, 4);
    shadow(c, x + w * .90, y + h - 1, w * .10, 4);
    sceneArt.draw(c, 'equipment', f, x, y, w, h);
  }
  function itemIcon(id: ItemId | 'satchel' | 'casebook') {
    const icon = document.createElement('canvas'), { sheet, frame: f } = id === 'satchel' || id === 'casebook'
      ? { sheet: 'equipment', frame: equipmentFrames[id] } : itemFrames[id];
    icon.width = icon.height = 112; icon.className = 'adventure-item-art'; icon.setAttribute('aria-hidden', 'true');
    const ctx = icon.getContext('2d');
    if (ctx) {
      const scale = 100 / Math.max(f.w, f.h);
      ctx.drawImage(resource.images[sheet]!, f.x, f.y, f.w, f.h, (112 - f.w * scale) / 2, (112 - f.h * scale) / 2, f.w * scale, f.h * scale);
    }
    return icon;
  }
  function object(c: CanvasRenderingContext2D, run: Run, id: TargetId, time: number) {
    const t = getTarget(id), { x, y, w, h } = t;
    if (t.kind === 'exit') {
      const f = propFrames.door;
      // Narrow, tall architectural registration, with its threshold on the
      // authored target's floor rather than vertically centering the arch.
      shadow(c, x + w / 2, y + h, w * .8, 8, .8);
      sceneArt.draw(c, 'props', f, x - 18, y - 55, w + 36, h + 55);
      if (id === 'bellDoor' && !has(run, 'confronted')) sprite(c, 'chainAttached', x - 5, y + 60, w + 10, 70);
      return;
    }
    if (['evelyn', 'vale', 'oswald', 'brindle'].includes(id)) {
      const ghost = t.kind === 'ghost', bob = ghost ? Math.sin(time * 1.4 + x) * 2 : 0;
      shadow(c, x + w / 2, y + h, w * .44, ghost ? 10 : 6, ghost ? .35 : .85);
      if (ghost) glow(x + w / 2, y + h * .5, 90, '#65bfa51a');
      character(id as CastRole, x + w / 2, y + h + bob, h / 317, 1, ghost ? .88 : 1); return;
    }
    let role: PropRole | undefined;
    switch (id) {
      case 'whisper':
        c.save(); c.globalAlpha = has(run, 'whisperLit') ? .94 : .38;
        glow(x + w / 2, y + h / 2, 90, '#84dfbb2b');
        sprite(c, 'whisper', x, y + Math.sin(time * 1.7) * 5, w, h); c.restore(); return;
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
      case 'brush': sprite(c, 'brush', x + 12, y - 7, 45, 60, -Math.PI / 2.5); return;
      case 'tube': {
        const f = serviceFrames[has(run, 'disabled') ? 'stopped' : has(run, 'tubeOpen') ? 'open' : 'closed'];
        // The upper elbow terminates inside the wall. Keep this fitting clear
        // of decorative pipework and leave masonry visible beneath the clock.
        sceneArt.draw(c, 'service', f, 510, 40, 150, 300);
        return;
      }
      case 'clock': return; // Drawn with the connected service assembly above.
      case 'cabinet': role = has(run, 'cabinetOpen') ? 'cabinetOpen' : 'cabinetClosed'; break;
      case 'chain': role = has(run, 'chain') ? 'chainAttached' : 'chainLoose'; break;
      case 'mirror': role = has(run, 'mirror') ? 'mirrorIn' : 'mirrorOut'; break;
      case 'housing':
        line(c, [{ x: x + w / 2, y: 0 }, { x: x + w / 2, y: y + 35 }], '#74654b', 5);
        role = 'housing'; break;
      case 'ward': {
        const color = has(run, 'ward') ? '#c7e3d5' : '#b7aea0';
        line(c, [{ x, y: y + 17 }, { x: x + 38, y: y + 3 }], color, 3);
        line(c, [{ x: x + 94, y: y + 3 }, { x: x + w, y: y + 17 }], color, 3);
        if (has(run, 'ward')) line(c, [{ x: x + 38, y: y + 3 }, { x: x + 94, y: y + 3 }], color, 3);
        return;
      }
    }
    if (role) sprite(c, role, x, y, w, h);
    if (id === 'housing' && has(run, 'finished')) sprite(c, 'lantern', x + 65, y + h - 65, 40, 50);
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
  function atmosphere(run: Run, time: number, reduced: boolean) {
    // Window light stays behind interaction labels and never shifts the world.
    c.save(); c.globalCompositeOperation = 'screen';
    c.fillStyle = '#b5d7ef08';
    const origin = run.room === 'bell' ? 480 : run.room === 'hall' ? 360 : 140;
    if (run.room === 'hall' || run.room === 'bell') {
      c.beginPath(); c.moveTo(origin, 25); c.lineTo(origin + 55, 25);
      c.lineTo(origin + 320, 530); c.lineTo(origin + 130, 530); c.closePath(); c.fill();
    }
    if (!reduced) for (let i = 0; i < 8; i++) {
      const x = origin + 60 + i * 24 + Math.sin(time * .23 + i) * 5;
      const y = 90 + (i * 53 + time * (1 + i % 3)) % 380;
      c.fillStyle = '#d9eaf536'; c.fillRect(x, y, 1, 1);
    }
    if (run.room === 'bell' && wardReady(run)) {
      glow(500, 385, 145, '#77c9c91c');
    }
    c.restore();
  }
  return {
    canvas, prepare: resource.prepare, react, itemIcon,
    reset() { last = undefined; phase = 0; approach = undefined; pose = 'idle'; poseUntil = 0; sceneryKey = ''; },
    draw(run: Run, size: { width: number; height: number; ratio: number }, debug: boolean, reduced: boolean, animationTime: number) {
      if (disposed || !resource.images.cast) return;
      // Cap both buffer axes independently of the display's DPR.
      size = { ...size, ratio: Math.min(size.ratio, 2560 / size.width, 1440 / size.height) };
      const sameRoom = last?.run === run && last.room === run.room;
      const distance = sameRoom ? Math.hypot(run.actor.x - last!.x, run.actor.y - last!.y) : 0;
      if (!sameRoom) { phase = 0; approach = undefined; poseUntil = 0; }
      if (distance > 0) phase += distance / strideDistance;
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
      // Expensive resampling belongs in the static cache, never the frame loop.
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'low';
      const time = reduced ? 0 : animationTime;
      sceneArt.enter(run.room);
      const visible = roomTargets(run);
      const animated = (id: TargetId) => ['person', 'ghost'].includes(getTarget(id).kind) || id === 'musicBox' || id === 'photo';
      const tableDepth = run.room === 'library' ? 430 : run.room === 'kitchen' ? 402 : undefined;
      const onTable = (id: TargetId) => ['journal', 'musicBox', 'brush'].includes(id);
      const layered = (id: TargetId) => animated(id) || onTable(id) || getTarget(id).kind !== 'exit' && getTarget(id).y + getTarget(id).h > 365;
      // Walls and mounted objects stay cached. Floor objects and their tabletop
      // contents share a depth pass with Wren, so nearer silhouettes occlude him.
      const key = `${run.room}:${run.facts.join(',')}:${visible.join(',')}:${width}:${height}`;
      if (key !== sceneryKey) {
        scenery.width = width; scenery.height = height;
        backdrop.fillStyle = '#080f16'; backdrop.fillRect(0, 0, width, height);
        backdrop.setTransform(size.ratio * view.scale, 0, 0, size.ratio * view.scale, size.ratio * view.x, size.ratio * view.y);
        backdrop.imageSmoothingQuality = 'high';
        backdrop.drawImage(resource.images[run.room]!, 0, 0, WORLD.width, WORLD.height);
        // Mounted objects receive a soft silhouette shadow against the wall.
        for (const id of visible) if (!layered(id)) {
          const density = size.ratio * view.scale;
          backdrop.save(); backdrop.shadowColor = '#080e1766'; backdrop.shadowBlur = 5 * density;
          backdrop.shadowOffsetX = 2 * density; backdrop.shadowOffsetY = 3 * density;
          object(backdrop, run, id, time); backdrop.restore();
        }
        sceneryKey = key;
      }
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(scenery, 0, 0); c.restore();
      const layers: { depth: number; paint: () => void }[] = [];
      if (tableDepth !== undefined) layers.push({ depth: tableDepth, paint: () => run.room === 'library' ? table(c, 230, 375, 325, 80) : table(c, 230, 368, 115, 48) });
      for (const id of visible) if (layered(id)) layers.push({ depth: onTable(id) ? tableDepth! : getTarget(id).y + getTarget(id).h, paint: () => object(c, run, id, time) });
      layers.sort((a, b) => a.depth - b.depth);
      for (const layer of layers) if (layer.depth <= run.actor.y) layer.paint();
      const moving = !!run.pending?.path.length;
      const role = moving ? walkClip[Math.floor(phase * walkClip.length) % walkClip.length]! : animationTime < poseUntil ? pose : 'idle';
      shadow(c, run.actor.x, run.actor.y, 31, 8, .65);
      shadow(c, run.actor.x, run.actor.y, 16, 3);
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
      for (const layer of layers) if (layer.depth > run.actor.y) layer.paint();
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
      if (deluxe) atmosphere(run, time, reduced);
      c.drawImage(vignette, 0, 0, WORLD.width, WORLD.height);
      if (debug) for (const f of rooms[run.room].floor) { c.strokeStyle = '#59ffb4'; c.strokeRect(f.x, f.y, f.w, f.h); }
      c.restore();
    },
    dispose() {
      if (disposed) return; disposed = true;
      resource.dispose(); sceneArt.dispose(); canvas.remove();
      for (const buffer of [canvas, scenery, vignette, ...lights.values()]) buffer.width = buffer.height = 0;
      lights.clear();
    },
  };
}
