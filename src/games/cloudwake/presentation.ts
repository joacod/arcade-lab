import { createImageResource, validateImageDimensions } from '../../engine/browser/images.ts';
import type { Run, FlightEvent } from './game.ts';
import { flight } from './content.ts';
import { minePosition } from './route.ts';

const urls = {
  courier: new URL('./art/courier.webp', import.meta.url).href,
  pillar: new URL('./art/pillar.webp', import.meta.url).href,
  mine: new URL('./art/mine.webp', import.meta.url).href,
  fragment: new URL('./art/fragment.webp', import.meta.url).href,
  cloud: new URL('./art/cloud.webp', import.meta.url).href,
  sky: new URL('./art/sky.webp', import.meta.url).href,
};
const sizes = { courier: [1024, 1024], pillar: [160, 445], mine: [192, 193], fragment: [192, 287], cloud: [480, 189], sky: [1536, 1024] } as const;
/** Whole-cel roles, drawing footprints and anchors are independent of physics. */
const courier = { cell: 512, size: 106, anchorX: .64, anchorY: .59, glide: [0, 3], thrust: [1, 2] } as const;
interface Spark { x: number; y: number; vx: number; vy: number; start: number; life: number; color: string }
interface Viewport { width: number; height: number; ratio: number }

export function flightView(width: number, height: number) {
  const scale = Math.min(width / flight.minimumView, height / flight.height);
  return { scale, width: width / scale, y: (height - flight.height * scale) / 2, x: Math.max(0, width / scale * .2 - flight.playerX) };
}

export function createPresentation(surface: HTMLElement) {
  const element = document.createElement('canvas'); element.className = 'cloudwake-canvas'; element.setAttribute('aria-hidden', 'true');
  const context = element.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  const ctx = context;
  const art = createImageResource(urls, dimensions => validateImageDimensions(dimensions, sizes));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sparks: Spark[] = [];
  let disposed = false, lastTime = 0, crashTime = -Infinity, rewardTime = -Infinity;
  surface.append(element);
  function reset() { sparks.length = 0; lastTime = 0; crashTime = rewardTime = -Infinity; }
  function consume(events: readonly FlightEvent[]) {
    for (const event of events) {
      if (event.type === 'crash') crashTime = lastTime;
      if (event.type === 'reward') rewardTime = lastTime;
      if (motion.matches || event.type === 'reward') continue;
      const count = event.type === 'crash' ? 22 : 7;
      for (let i = 0; i < count && sparks.length < 90; i++) {
        const angle = i / count * Math.PI * 2;
        sparks.push({ x: event.x, y: event.y, vx: Math.cos(angle) * (40 + i * 4), vy: Math.sin(angle) * (40 + i * 4),
          start: lastTime, life: event.type === 'crash' ? .7 : .45, color: event.type === 'crash' ? '#ffca8b' : '#b1fff2' });
      }
    }
  }
  function draw(run: Run, viewport: Viewport, titleTime?: number, outcomeAge = 0) {
    if (disposed) return;
    const { width, height, ratio } = viewport;
    const backingWidth = Math.max(1, Math.round(width * ratio)), backingHeight = Math.max(1, Math.round(height * ratio));
    if (element.width !== backingWidth || element.height !== backingHeight) { element.width = backingWidth; element.height = backingHeight; }
    const images = art.images;
    if (!images.courier) return;
    lastTime = run.elapsed;
    const time = titleTime ?? run.elapsed + Math.min(.8, outcomeAge), decorative = motion.matches ? 0 : time;
    const distance = titleTime !== undefined ? decorative * 38 : run.distance;
    const view = flightView(width, height);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
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
    function clouds(rate: number, y: number, alpha: number, size: number, spacing: number) {
      const offset = motion.matches ? 0 : distance * rate % spacing;
      ctx.globalAlpha = alpha;
      for (let i = -2; i < worldWidth / spacing + 2; i++) {
        ctx.drawImage(images.cloud!, i * spacing - offset, y + Math.sin(i * 7.2) * 24, size, size * .394);
      }
      ctx.globalAlpha = 1;
    }
    clouds(.12, 325, .22, 370, 410);
    clouds(.32, 475, .68, 300, 370);
    ctx.strokeStyle = '#edf6df55'; ctx.lineWidth = 1; ctx.setLineDash([9, 16]);
    ctx.beginPath(); ctx.moveTo(-view.x, flight.ceiling); ctx.lineTo(worldWidth, flight.ceiling);
    ctx.moveTo(-view.x, flight.floor); ctx.lineTo(worldWidth, flight.floor); ctx.stroke(); ctx.setLineDash([]);
    for (const passage of run.passages) {
      const x = passage.x - distance;
      if (x > worldWidth + 120 || x + passage.width < -view.x - 120 || passage.pattern === 'breather') continue;
      if (passage.pattern === 'drift') {
        const point = minePosition(passage, run.elapsed);
        ctx.drawImage(images.mine!, point.x - distance - 47, point.y - 47, 94, 94);
      } else {
        const upper = passage.center - passage.gap / 2, lower = passage.center + passage.gap / 2;
        if (passage.pattern === 'rise' || passage.pattern === 'gate') ctx.drawImage(images.pillar!, x, lower, passage.width, flight.height - lower + 32);
        if (passage.pattern === 'dive' || passage.pattern === 'gate') {
          ctx.save(); ctx.translate(x + passage.width, upper); ctx.scale(-1, -1);
          ctx.drawImage(images.pillar!, 0, 0, passage.width, upper + 32); ctx.restore();
        }
      }
    }
    for (const fragment of run.fragments) {
      const x = fragment.x - distance;
      if (x < -40 || x > worldWidth || fragment.collected) continue;
      ctx.globalAlpha = motion.matches ? 1 : .9 + Math.sin(time * 4 + fragment.x) * .1;
      ctx.drawImage(images.fragment!, x - 10, fragment.y - 16, 20, 30);
    }
    ctx.globalAlpha = 1;
    const playerY = titleTime !== undefined ? 280 + Math.sin(decorative * 1.8) * 12 : run.player.y;
    if (!motion.matches && run.thrust && run.status === 'active' && titleTime === undefined) {
      ctx.lineCap = 'round'; ctx.strokeStyle = '#bcfff1aa'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const pulse = (time * 95 + i * 23) % 70;
        ctx.globalAlpha = (1 - pulse / 70) * .55;
        ctx.beginPath(); ctx.moveTo(flight.playerX - 28 - pulse, playerY + 10 + i * 4); ctx.lineTo(flight.playerX - 40 - pulse, playerY + 10 + i * 4); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const frames = run.thrust ? courier.thrust : courier.glide;
    const frame = frames[motion.matches ? 0 : Math.floor(time * (run.thrust ? 9 : 3)) % 2]!;
    ctx.save(); ctx.translate(flight.playerX, playerY);
    const tilt = motion.matches || titleTime !== undefined ? 0 : Math.max(-.19, Math.min(.22, run.player.vy / 1500));
    ctx.rotate(tilt);
    ctx.drawImage(images.courier, frame % 2 * courier.cell, Math.floor(frame / 2) * courier.cell, courier.cell, courier.cell,
      -courier.size * courier.anchorX, -courier.size * courier.anchorY, courier.size, courier.size);
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
    clouds(.85, 558, .95, 340, 305);
    clouds(.6, -104, .75, 380, 380);
    if (run.elapsed < 2.8 && titleTime === undefined) {
      ctx.fillStyle = '#123d49d9'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('HOLD TO RISE · RELEASE TO FALL', flight.playerX + 55, 285);
    }
    if (time - rewardTime < 1.3) {
      ctx.fillStyle = '#173c43'; ctx.font = '700 16px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('CLEAR SKIES · 5 PASSAGES', worldWidth / 2 - view.x, 80);
    }
    if (!motion.matches && time - crashTime < .18) {
      ctx.globalAlpha = (1 - (time - crashTime) / .18) * .25; ctx.fillStyle = '#ffecd0'; ctx.fillRect(-view.x, 0, worldWidth, flight.height); ctx.globalAlpha = 1;
    }
  }
  return { prepare: art.prepare, draw, consume, reset,
    dispose() { if (disposed) return; disposed = true; art.dispose(); sparks.length = 0; element.remove(); element.width = element.height = 0; },
  };
}
