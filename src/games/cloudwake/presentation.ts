import { prepareImages, validateImageDimensions, type PreparedImages } from '../../engine/browser/images.ts';
import type { Appearance } from './themes.ts';
import type { Run, FlightEvent } from './game.ts';
import { flight, viewScale, fragmentShape } from './content.ts';
import { minePosition, passageCenter } from './route.ts';

const urls = {
  courier: new URL('./art/courier.webp', import.meta.url).href,
  pillar: new URL('./art/pillar.webp', import.meta.url).href,
  mine: new URL('./art/mine.webp', import.meta.url).href,
  fragment: new URL('./art/fragment.webp', import.meta.url).href,
  cloud: new URL('./art/cloud.webp', import.meta.url).href,
  sky: new URL('./art/sky.webp', import.meta.url).href,
  checkpoint: new URL('./art/checkpoint.webp', import.meta.url).href,
};
const sizes = { courier: [1024, 1024], pillar: [160, 445], mine: [192, 193], fragment: [192, 287], cloud: [480, 189], sky: [1536, 1024], checkpoint: [1024, 1024] } as const;
/** Whole-cel roles, drawing footprints and anchors are independent of physics. */
const courier = { cell: 512, size: 106, anchorX: .64, anchorY: .59, glide: [0, 3], thrust: [1, 2] } as const;
const beacon = { cell: 512, size: 124, anchorX: .52, anchorY: .48 } as const;
interface Spark { x: number; y: number; vx: number; vy: number; start: number; life: number; color: string }
interface ScorePop { x: number; y: number; start: number; points: number }
interface Viewport { width: number; height: number; ratio: number }

/** Stable world identities keep cloud silhouettes continuous across scroll wraps. */
export function cloudTiles(scroll: number, left: number, right: number, size: number, spacing: number) {
  const tiles = [];
  for (let id = Math.floor((scroll + left - size) / spacing); id <= Math.ceil((scroll + right) / spacing); id++) {
    tiles.push({ id, x: id * spacing - scroll, y: Math.sin(id * 7.2) * 24 });
  }
  return tiles;
}

export function flightView(width: number, height: number) {
  const scale = viewScale(width, height);
  return { scale, width: width / scale, y: (height - flight.height * scale) / 2, x: Math.max(0, width / scale * .2 - flight.playerX) };
}

export function createPresentation(surface: HTMLElement, appearance: Appearance = 'arcade') {
  const element = document.createElement('canvas'); element.className = 'cloudwake-canvas'; element.setAttribute('aria-hidden', 'true');
  const context = element.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  const ctx = context;
  const lifetime = new AbortController();
  let art: PreparedImages | undefined, pending: Promise<void> | undefined;
  function prepare(): Promise<void> {
    if (art) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => {
      const pack = appearance === 'deluxe' ? await import('./deluxe-art.ts') : { urls, sizes };
      const prepared = await prepareImages(pack.urls, lifetime.signal, dimensions => validateImageDimensions(dimensions, pack.sizes));
      if (lifetime.signal.aborted) { prepared.dispose(); return; }
      art = prepared;
    })().finally(() => { pending = undefined; });
    return pending;
  }
  const deluxe = appearance === 'deluxe';
  const courierRole = deluxe ? { ...courier, size: 90, anchorX: .58, anchorY: .52 } : courier;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sparks: Spark[] = [];
  const scores: ScorePop[] = [];
  // A gameplay miss ends collection eligibility, not the gem's visible lifetime.
  // Keep its cosmetic image until the actual viewport edge eats it, including
  // the extra space behind the courier on wide displays.
  const missedFragments: { x: number; y: number }[] = [];
  let disposed = false, lastTime = 0, crashTime = -Infinity, checkpointTime = -Infinity, checkpointAt = NaN;
  surface.append(element);
  function reset() { sparks.length = scores.length = missedFragments.length = 0; lastTime = 0; crashTime = checkpointTime = -Infinity; checkpointAt = NaN; }
  function consume(events: readonly FlightEvent[]) {
    for (const event of events) {
      if (event.type === 'fragment-missed') { missedFragments.push({ x: event.x, y: event.y }); continue; }
      if (event.type === 'crash') crashTime = lastTime;
      if (event.type === 'checkpoint') { checkpointTime = lastTime; checkpointAt = event.x; }
      if (event.type === 'pickup' && scores.length < 12) scores.push({ x: event.x, y: event.y, start: lastTime, points: event.points });
      if (motion.matches || event.type === 'checkpoint') continue;
      const count = event.type === 'crash' || event.type === 'shield-hit' ? 22 : 7;
      for (let i = 0; i < count && sparks.length < 90; i++) {
        const angle = i / count * Math.PI * 2;
        sparks.push({ x: event.x, y: event.y, vx: Math.cos(angle) * (40 + i * 4), vy: Math.sin(angle) * (40 + i * 4),
          start: lastTime, life: event.type === 'crash' ? .7 : .45, color: event.type === 'crash' ? '#ffca8b' : '#b1fff2' });
      }
    }
  }
  function draw(run: Run, viewport: Viewport, titleTime?: number, outcomeAge = 0) {
    if (disposed) return;
    const { width, height } = viewport;
    const ratio = Math.min(2, viewport.ratio);
    const backingWidth = Math.max(1, Math.round(width * ratio)), backingHeight = Math.max(1, Math.round(height * ratio));
    if (element.width !== backingWidth || element.height !== backingHeight) { element.width = backingWidth; element.height = backingHeight; }
    const images = art?.images ?? {};
    if (!images.courier) return;
    lastTime = run.elapsed;
    const time = titleTime ?? run.elapsed + Math.min(.8, outcomeAge), decorative = motion.matches ? 0 : time;
    const distance = titleTime !== undefined ? decorative * 38 : run.distance;
    const view = flightView(width, height);
    ctx.reset();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#79bbcd'; ctx.fillRect(0, 0, width, height);
    // Mirrored plates keep the scrolling horizon continuous without a hard seam.
    const skyWidth = Math.max(width, height * 1.5), skyHeight = skyWidth / 1.5;
    const skyOffset = motion.matches ? 0 : distance * .065 * view.scale;
    const tile = Math.floor(skyOffset / skyWidth), scroll = skyOffset % skyWidth;
    for (let i = -1; i < 2; i++) {
      ctx.save(); ctx.translate(i * skyWidth - scroll, (height - skyHeight) / 2);
      if ((tile + i) % 2 !== 0) { ctx.translate(skyWidth, 0); ctx.scale(-1, 1); }
      ctx.drawImage(images.sky!, 0, 0, skyWidth, skyHeight); ctx.restore();
    }
    ctx.setTransform(view.scale * ratio, 0, 0, view.scale * ratio, view.x * view.scale * ratio, view.y * ratio);
    const worldWidth = view.width;
    function drawBeacon(frame: number, x: number, y: number, size: number = beacon.size) {
      ctx.drawImage(images.checkpoint!, frame % 2 * beacon.cell, Math.floor(frame / 2) * beacon.cell, beacon.cell, beacon.cell,
        x - size * beacon.anchorX, y - size * beacon.anchorY, size, size);
    }
    function clouds(rate: number, y: number, alpha: number, size: number, spacing: number) {
      const offset = motion.matches ? 0 : distance * rate;
      ctx.globalAlpha = alpha;
      for (const tile of cloudTiles(offset, -view.x, worldWidth - view.x, size, spacing)) {
        ctx.drawImage(images.cloud!, tile.x, y + tile.y, size, size * .394);
      }
      ctx.globalAlpha = 1;
    }
    clouds(.12, 325, .22, 370, 410);
    clouds(.32, 475, .68, 300, 370);
    for (const passage of run.passages) {
      const x = passage.x - distance;
      if (x > worldWidth + 120 || x + passage.width < -view.x - 120) continue;
      if (passage.pattern === 'breather') {
        const markerX = x + passage.width + flight.radius;
        const markerWorld = passage.x + passage.width + flight.radius;
        const active = passage.cleared;
        const age = active && Math.abs(markerWorld - checkpointAt) < 90 ? time - checkpointTime : Infinity;
        // One opening, one bloom, then the steady crystal. The pulse cel is not a loop.
        const frame = !active ? 0 : motion.matches || age >= .48 ? 2 : age < .16 ? 1 : 3;
        ctx.fillStyle = active ? '#9cf6e230' : '#ffdf9820';
        ctx.beginPath(); ctx.ellipse(markerX, 108, 30, 34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = !active || motion.matches ? 1 : .9 + Math.sin(time * 2.2) * .1;
        drawBeacon(frame, markerX, 108);
        ctx.globalAlpha = 1;
        if (active && !motion.matches && age < .5) {
          const t = age / .5;
          ctx.strokeStyle = `rgb(177 255 242 / ${Math.max(0, 1 - t)})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(markerX, 108, 16 + t * 34, 18 + t * 26, 0, 0, Math.PI * 2); ctx.stroke();
        }
        continue;
      }
      if (passage.pattern === 'drift') {
        const point = minePosition(passage, run.elapsed);
        ctx.drawImage(images.mine!, point.x - distance - 47, point.y - 47, 94, 94);
      } else {
        const center = passageCenter(passage, run.elapsed), upper = center - passage.gap / 2, lower = center + passage.gap / 2;
        if (passage.pattern === 'rise' || passage.pattern === 'gate' || passage.pattern === 'sway') ctx.drawImage(images.pillar!, x, lower, passage.width, flight.height - lower + 32);
        if (passage.pattern === 'dive' || passage.pattern === 'gate' || passage.pattern === 'sway') {
          ctx.save(); ctx.translate(x + passage.width, upper); ctx.scale(-1, -1);
          ctx.drawImage(images.pillar!, 0, 0, passage.width, upper + 32); ctx.restore();
        }
      }
    }
    function drawFragment(fragment: { x: number; y: number }) {
      const x = fragment.x - distance;
      if (x + fragmentShape.halfWidth < -view.x || x - fragmentShape.halfWidth > worldWidth - view.x) return;
      ctx.globalAlpha = motion.matches ? 1 : .9 + Math.sin(time * 4 + fragment.x) * .1;
      ctx.drawImage(images.fragment!, x - fragmentShape.halfWidth, fragment.y - fragmentShape.halfHeight,
        fragmentShape.halfWidth * 2, fragmentShape.halfHeight * 2);
    }
    for (const fragment of run.fragments) if (!fragment.collected) drawFragment(fragment);
    let retained = 0;
    for (const fragment of missedFragments) {
      if (fragment.x - distance + fragmentShape.halfWidth < -view.x) continue;
      missedFragments[retained++] = fragment; drawFragment(fragment);
    }
    missedFragments.length = retained;
    ctx.globalAlpha = 1;
    const playerX = titleTime !== undefined ? flight.playerX : run.player.x;
    const playerY = titleTime !== undefined ? 280 + Math.sin(decorative * 1.8) * 12 : run.player.y;
    const shieldLeft = run.shieldUntil - run.elapsed;
    if (titleTime === undefined && shieldLeft > 0) {
      const fade = Math.min(1, shieldLeft / .7);
      ctx.globalAlpha = fade; ctx.strokeStyle = '#b8fff2'; ctx.lineWidth = deluxe ? 1.5 : 2;
      const glass = ctx.createRadialGradient(playerX - 20, playerY - 22, 2, playerX - 6, playerY - 5, 48);
      glass.addColorStop(0, '#e6fff92e'); glass.addColorStop(.7, '#a4fff008'); glass.addColorStop(1, '#c5fff940');
      ctx.fillStyle = deluxe ? glass : '#a4fff018';
      ctx.beginPath(); ctx.ellipse(playerX - 7, playerY - (deluxe ? 5 : 0), deluxe ? 48 : 46, deluxe ? 42 : 36, -.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (!motion.matches && run.thrust && run.status === 'active' && titleTime === undefined) {
      ctx.lineCap = 'round'; ctx.strokeStyle = '#bcfff1aa'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const pulse = (time * 95 + i * 23) % 70;
        ctx.globalAlpha = (1 - pulse / 70) * .55;
        ctx.beginPath(); ctx.moveTo(playerX - 28 - pulse, playerY + 10 + i * 4); ctx.lineTo(playerX - 40 - pulse, playerY + 10 + i * 4); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const frames = run.thrust ? courierRole.thrust : courierRole.glide;
    const frame = frames[motion.matches ? 0 : Math.floor(time * (run.thrust ? 9 : 3)) % 2]!;
    ctx.save(); ctx.translate(playerX, playerY);
    const tilt = motion.matches || titleTime !== undefined ? 0 : Math.max(-.19, Math.min(.22, run.player.vy / 1500));
    ctx.rotate(tilt);
    ctx.drawImage(images.courier, frame % 2 * courierRole.cell, Math.floor(frame / 2) * courierRole.cell, courierRole.cell, courierRole.cell,
      -courierRole.size * courierRole.anchorX, -courierRole.size * courierRole.anchorY, courierRole.size, courierRole.size);
    ctx.restore();
    let keep = 0;
    for (const spark of sparks) {
      const age = time - spark.start;
      if (age > spark.life) continue;
      sparks[keep++] = spark;
      ctx.globalAlpha = Math.max(0, 1 - age / spark.life); ctx.fillStyle = spark.color;
      ctx.beginPath(); ctx.arc(spark.x - distance + spark.vx * age, spark.y + spark.vy * age + 45 * age * age, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    sparks.length = keep; ctx.globalAlpha = 1;
    keep = 0;
    for (const score of scores) {
      const age = time - score.start;
      if (age > .75) continue;
      scores[keep++] = score;
      ctx.globalAlpha = Math.max(0, 1 - age / .75); ctx.font = '800 13px system-ui'; ctx.textAlign = 'center';
      const x = score.x - distance, y = score.y - 24 - (motion.matches ? 0 : age * 28);
      ctx.lineWidth = 3; ctx.strokeStyle = '#173c43'; ctx.strokeText(`+${score.points}`, x, y);
      ctx.fillStyle = '#fff1bc'; ctx.fillText(`+${score.points}`, x, y);
    }
    scores.length = keep; ctx.globalAlpha = 1;
    clouds(.85, 558, .95, 340, 305);
    clouds(.6, -104, .75, 380, 380);
    if (run.elapsed < 3.2 && titleTime === undefined && run.status === 'active') {
      ctx.fillStyle = '#123d49d9'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('HOLD TO RISE · SLIDE SIDEWAYS', Math.min(Math.max(playerX + 46, 70), 300), Math.min(Math.max(playerY - 36, 78), 520));
    }
    if (!motion.matches && time - crashTime < .18) {
      ctx.globalAlpha = (1 - (time - crashTime) / .18) * .25; ctx.fillStyle = '#ffecd0'; ctx.fillRect(-view.x, 0, worldWidth, flight.height); ctx.globalAlpha = 1;
    }
  }
  return { element, prepare, draw, consume, reset,
    dispose() { if (disposed) return; disposed = true; lifetime.abort(); art?.dispose(); art = undefined; sparks.length = scores.length = missedFragments.length = 0; element.remove(); element.width = element.height = 0; },
  };
}
