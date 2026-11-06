import { coastalTiles } from './scenery.ts';
import { flight, fortress, waves, type Pattern } from './content.ts';
import { bossLanes, enemyCharge, type Boss, type Enemy, type FlightEvent, type Point, type Run } from './game.ts';
import { flightFrame, type FlightSprite } from './art-pack.ts';
import type { ImageBundle } from '../../engine/browser/images.ts';
import type { FlightTheme } from './themes.ts';
import type { FlightPresentation, FlightSize } from './flight-presentation.ts';

export function flightView(width: number, height: number) {
  const scale = Math.min(width / flight.width, height / flight.height);
  return { scale, x: (width - flight.width * scale) / 2, y: (height - flight.height * scale) / 2 };
}
const noise = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
export function createPresentation(surface: HTMLElement, theme: FlightTheme,
  { images = {} as ImageBundle } = {}): FlightPresentation {
  const canvas = document.createElement('canvas'); canvas.className = 'skybreak-canvas'; canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  const c = ctx;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  surface.append(canvas);
  let visualTime = 0;
  let particles: Particle[] = [], lastTime = 0, width = 0, height = 0, damageFlash = 0;
  let lastRecharge = 0, rollReadyAt = -Infinity;
  const flashes = new Map<number | 'boss', number>();
  function sprite(art: FlightSprite) {
    const image = images[art.image];
    if (!image) return;
    const [, y, w, h] = art.rect, [width, height] = art.footprint;
    c.save(); c.rotate(art.rotation); c.imageSmoothingEnabled = theme.finish === 'painted'; c.imageSmoothingQuality = 'high';
    c.drawImage(image, flightFrame(art, visualTime, motion.matches), y, w, h, -width / 2, -height / 2, width, height);
    c.restore();
  }
  function plane(x: number, y: number, kind: Pattern | 'player', bank = 0, roll = 0, shadow = false, flash = false) {
    c.save(); c.translate(x, y);
    if (kind !== 'player') c.rotate(Math.PI);
    if (!motion.matches) {
      c.scale(roll ? Math.cos(roll * Math.PI * 3) * 0.75 : 1 - Math.abs(bank) * 0.12, 1);
      c.rotate(bank * 0.12);
    }
    if (shadow) { c.globalAlpha = theme.finish === 'painted' ? 0.22 : 0.16; c.filter = 'brightness(0)'; }
    const art = theme.art.actors[kind];
    if (art) {
      // A compact halo signals damage without replacing the aircraft silhouette.
      if (flash) { c.shadowColor = '#ffffff'; c.shadowBlur = 12; }
      sprite(art); c.restore(); return;
    }
    c.restore();
  }
  let coastalTile: HTMLCanvasElement | undefined;
  function ocean(time: number) {
    const backdrop = images.backdrop;
    if (backdrop) {
      const tileHeight = 480 * theme.scenery.height / theme.scenery.width;
      if (!coastalTile) {
        // Fade only the incoming edge: the preceding tile supplies opaque water underneath.
        coastalTile = document.createElement('canvas'); coastalTile.width = theme.scenery.width; coastalTile.height = theme.scenery.height;
        const tile = coastalTile.getContext('2d')!;
        tile.imageSmoothingEnabled = theme.finish === 'painted';
        tile.drawImage(backdrop, 0, 0);
        if (theme.scenery.overlap) {
          tile.globalCompositeOperation = 'destination-in';
          const fade = tile.createLinearGradient(0, 0, 0, theme.scenery.overlap * theme.scenery.width / 480);
          fade.addColorStop(0, '#0000'); fade.addColorStop(1, '#000');
          tile.fillStyle = fade; tile.fillRect(0, 0, coastalTile.width, coastalTile.height);
        }
      }
      c.fillStyle = theme.palette.sea[0]; c.fillRect(0, 0, 480, 800);
      c.imageSmoothingEnabled = theme.finish === 'painted'; c.imageSmoothingQuality = 'high';
      for (const y of coastalTiles(time, theme.scenery.speed, tileHeight, theme.scenery.overlap)) {
        c.drawImage(coastalTile, 0, theme.finish === 'pixel' ? Math.round(y) : y, 480, tileHeight);
      }
      // Clouds pass faster than the coast, confined to the margins beneath combat cues.
      for (let i = 0; i < 4; i++) {
        c.save();
        c.translate(i % 2 ? 474 : 6, (i * 311 + time * 156) % 1250 - 200);
        c.scale(2.5, 1.6); c.globalAlpha = theme.finish === 'painted' ? 0.16 : 0.12;
        sprite(theme.art.objects.cloud); c.restore();
      }
      return;
    }
  }
  function drawEnemyCharge(enemy: Enemy, player: Point) {
    const charge = enemyCharge(enemy, player);
    if (charge === undefined) return;
    c.save(); c.translate(enemy.x, enemy.y + 20);
    c.rotate(-Math.atan2(player.x - enemy.x, player.y - enemy.y));
    // Three spreading muzzles for bombers, two narrow muzzles for interceptors.
    const muzzles = enemy.pattern === 'swoop' ? [-12, 0, 12] : [-7, 7];
    c.lineWidth = 1.5; c.strokeStyle = '#ffd49e';
    if (!motion.matches) { c.shadowColor = '#ff9b59'; c.shadowBlur = 4 + charge * 7; }
    for (const x of muzzles) {
      c.fillStyle = '#102638'; c.fillRect(x - 3, 3, 6, 10);
      c.strokeRect(x - 3, 3, 6, 10);
      c.fillStyle = '#ffd49e'; c.fillRect(x - 2, 12 - charge * 8, 4, 1 + charge * 8);
    }
    c.restore();
  }
  function drawRollReadiness(run: Run) {
    const p = run.player, ready = p.recharge <= 0;
    if (lastRecharge > 0 && ready) rollReadyAt = run.elapsed;
    lastRecharge = p.recharge;
    if (run.elapsed <= 0 || run.status === 'defeat' || run.status === 'victory') return;
    const x = Math.max(34, Math.min(flight.width - 34, p.x)), y = p.y > 720 ? p.y - 49 : p.y + 43;
    const progress = 1 - Math.min(1, p.recharge / flight.evade.recharge);
    c.save(); c.translate(x, y);
    c.fillStyle = '#061b2aee'; c.fillRect(-24, -4, 48, 17);
    c.fillStyle = '#507581'; c.fillRect(-20, -1, 40, 3);
    c.fillStyle = ready ? '#baffec' : '#83c5cf'; c.fillRect(-20, -1, progress * 40, 3);
    c.font = 'bold 8px monospace'; c.textAlign = 'center';
    c.fillText(ready ? 'ROLL READY' : 'ROLL', 0, 10);
    const sinceReady = run.elapsed - rollReadyAt;
    if (ready && !motion.matches && sinceReady < 0.7) {
      c.strokeStyle = `rgba(186, 255, 236, ${1 - sinceReady / 0.7})`; c.lineWidth = 1.5;
      c.strokeRect(-26 - sinceReady * 7, -6 - sinceReady * 4, 52 + sinceReady * 14, 21 + sinceReady * 8);
    }
    c.restore();
  }
  function drawFortress(b: Boss) {
    const dead = b.health <= 0;
    if (b.charge > 0 && !dead) {
      c.save();
      const pulse = motion.matches ? 0.35 : 0.35 + Math.sin(b.age * 16) * 0.12;
      c.strokeStyle = `rgba(255, 169, 125, ${pulse})`; c.fillStyle = '#ffb17c13'; c.lineWidth = 1.5;
      c.setLineDash([8, 10]);
      if (b.attack === 'lanes') {
        for (const x of bossLanes(b)) { c.fillRect(x - 13, b.y + 48, 26, 800); c.strokeRect(x - 13, b.y + 48, 26, 800); }
      } else if (b.attack === 'aim') {
        for (const side of [-1, 1]) {
          c.beginPath(); c.moveTo(b.x + side * 88, b.y + 20); c.lineTo(b.aimX, b.aimY); c.stroke();
        }
        c.beginPath(); c.arc(b.aimX, b.aimY, 22, 0, Math.PI * 2); c.stroke();
      } else {
        for (const angle of b.phase === 2 ? [-0.84, 0, 0.84] : [-0.63, 0, 0.63]) {
          c.beginPath(); c.moveTo(b.x, b.y + 45); c.lineTo(b.x + Math.sin(angle) * 700, b.y + Math.cos(angle) * 700); c.stroke();
        }
      }
      c.restore();
    }
    c.save(); c.translate(b.x, b.y);
    if (dead) { if (!motion.matches) c.translate(Math.sin(b.defeated * 45) * 4, b.defeated * 9); c.globalAlpha = Math.max(0, 1 - b.defeated / fortress.defeatDuration); }
    // Appearance owns the hull; the same animated weak points and warnings stay readable above it.
    {
      c.fillStyle = '#00152335'; c.beginPath(); c.ellipse(12, 30, 168, 70, 0, 0, Math.PI * 2); c.fill();
      {
        c.save(); c.rotate(Math.PI);
        if (flashes.has('boss')) { c.shadowColor = '#ffffff'; c.shadowBlur = 12; }
        sprite(theme.art.flagship); c.restore();
      }
    }
    for (const side of [-1, 1]) {
      const x = side * 88, y = 16 + Math.sin(b.age * 2) * 8;
      c.save(); c.translate(x, y);
      sprite(theme.art.objects.nacelle);
      c.fillStyle = dead ? '#ffbb75' : '#7aeadd'; c.shadowColor = c.fillStyle; c.shadowBlur = 14;
      if (theme.finish === 'painted') {
        const reactor = c.createRadialGradient(-5, -6, 1, 0, 0, 19);
        reactor.addColorStop(0, '#effff9'); reactor.addColorStop(0.38, '#9af9e5');
        reactor.addColorStop(0.72, dead ? '#ffbb75' : '#35aeb7'); reactor.addColorStop(1, '#102d3d');
        c.fillStyle = reactor;
      }
      c.save();
      c.globalAlpha *= 0.16;
      c.beginPath(); c.arc(0, 0, 17, 0, Math.PI * 2); c.fill(); c.restore(); c.shadowBlur = 0;
      c.strokeStyle = '#15334d'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 23, b.age * side * 3, b.age * side * 3 + 4.5); c.stroke();
      c.fillStyle = '#ffb576'; c.fillRect(-7, 40, 14, motion.matches ? 10 : 10 + Math.sin(b.age * 29) * 5); c.restore();
      c.strokeStyle = '#aec8c177'; c.lineWidth = 2; c.beginPath(); c.moveTo(side * 44, -21); c.lineTo(side * 143, 0); c.stroke();
    }
    c.fillStyle = dead || b.phase === 2 ? '#ffae85' : '#b2fff2'; c.shadowColor = c.fillStyle; c.shadowBlur = 18;
    c.beginPath(); c.arc(0, 10, 28, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    { c.save(); c.translate(0, 10); sprite(theme.art.objects.reactor); c.restore(); }
    if (dead && !motion.matches) for (let i = 0; i < 9; i++) {
      const age = (b.defeated + i * 0.19) % 0.7, x = noise(i + Math.floor(b.defeated * 4)) * 260 - 130, y = noise(i + 30) * 90 - 40;
      c.globalAlpha = (1 - age / 0.7) * Math.max(0, 1 - b.defeated / fortress.defeatDuration);
      c.fillStyle = i % 2 ? '#ffe9ab' : '#ff8259'; c.beginPath(); c.arc(x, y, 8 + age * 34, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  return {
    element: canvas,
    prepare: () => Promise.resolve(),
    reset() { particles = []; lastTime = 0; damageFlash = 0; lastRecharge = 0; rollReadyAt = -Infinity; flashes.clear(); },
    consume(events: readonly FlightEvent[]) {
      for (const event of events) {
        if (event.type === 'hit' && event.target !== undefined) flashes.set(event.target, 0.09);
        if (!['hit', 'explosion', 'life', 'evade', 'pickup', 'boss-break', 'damage'].includes(event.type)) continue;
        if (event.type === 'damage') damageFlash = 0.24;
        const count = motion.matches ? 0 : event.type === 'boss-break' ? 60 : event.type === 'hit' ? 4 : 14;
        for (let i = 0; i < count; i++) {
          const angle = noise(i + event.x) * Math.PI * 2, speed = 35 + noise(i + event.y) * 110;
          const life = event.type === 'boss-break' ? 1.6 : event.type === 'hit' ? 0.18 : 0.6;
          particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life, max: life, size: event.type === 'hit' ? 3 : 6,
            color: event.type === 'pickup' ? '#caff9c' : event.type === 'evade' ? '#9cffff' : i % 2 ? '#ffe7ac' : '#ff8a55' });
        }
      }
      particles = particles.slice(-180);
    },
    draw(run: Run, size: FlightSize, attractTime?: number) {
      const w = Math.round(size.width * size.ratio), h = Math.round(size.height * size.ratio);
      if (width !== w || height !== h) { canvas.width = width = w; canvas.height = height = h; }
      c.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
      c.clearRect(0, 0, size.width, size.height);
      c.fillStyle = theme.palette.background; c.fillRect(0, 0, size.width, size.height);
      const view = flightView(size.width, size.height);
      c.translate(view.x, view.y); c.scale(view.scale, view.scale);
      c.save(); c.beginPath(); c.rect(0, 0, 480, 800); c.clip();
      visualTime = motion.matches ? 0 : attractTime ?? run.elapsed;
      ocean(visualTime);
      if (motion.matches) { particles = []; damageFlash = 0; }
      const dt = Math.max(0, run.elapsed - lastTime); lastTime = run.elapsed;
      for (const [id, life] of flashes) {
        if (life <= dt) flashes.delete(id); else flashes.set(id, life - dt);
      }
      for (const e of run.enemies) {
        const bank = e.pattern === 'crossing' ? e.side * 0.5 : e.pattern === 'swoop' ? e.side * Math.cos(e.age * 1.8) * 0.7 : 0;
        plane(e.x + 10, e.y + 18, e.pattern, bank, 0, true); plane(e.x, e.y, e.pattern, bank, 0, false, flashes.has(e.id));
        drawEnemyCharge(e, run.player);
      }
      if (run.boss) drawFortress(run.boss);
      for (const item of run.pickups) {
        const color = item.kind === 'power' ? '#ffcf70' : item.kind === 'spread' ? '#d6aaff' : '#a9f3b5';
        c.save(); c.translate(item.x, item.y); if (!motion.matches) c.rotate(Math.sin(item.age * 3) * 0.1);
        sprite(theme.art.objects[item.kind]);
        c.fillStyle = color; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText(item.kind.toUpperCase(), 0, 32); c.restore();
      }
      drawRollReadiness(run);
      for (const b of run.bullets) {
        c.fillStyle = b.owner === 'player' ? '#a8ffff33' : '#ff8c6933'; c.beginPath(); c.arc(b.x, b.y, b.radius + 4, 0, Math.PI * 2); c.fill();
        c.fillStyle = b.owner === 'player' ? '#c1ffff' : '#ffd48e';
        if (b.owner === 'player') c.fillRect(b.x - 2, b.y - 11, 4, 17);
        else { c.beginPath(); c.arc(b.x, b.y, b.radius, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#ee7058'; c.lineWidth = 2; c.stroke(); }
      }
      const p = run.player;
      if (run.status !== 'defeat') {
        plane(p.x + 10, p.y + 18, 'player', p.bank, p.roll, true);
        c.save(); if (p.immunity > 0) c.globalAlpha = motion.matches ? 0.65 : Math.floor(run.elapsed * 12) % 2 ? 0.4 : 1;
        plane(p.x, p.y, 'player', p.bank, p.roll); c.restore();
        if (p.roll > 0 || p.immunity > 0) {
          c.strokeStyle = p.roll ? '#a4ffff' : '#a4ffff66'; c.lineWidth = p.roll ? 3 : 1;
          c.beginPath(); c.ellipse(p.x, p.y, 35, 44, 0, 0, Math.PI * 2); c.stroke();
        }
        // Small central cockpit is also the collision reference.
        c.fillStyle = '#fff5bf'; c.beginPath(); c.arc(p.x, p.y, 3, 0, Math.PI * 2); c.fill();
      }
      for (const particle of particles) {
        particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt;
        c.globalAlpha = Math.max(0, particle.life / particle.max); c.fillStyle = particle.color;
        c.beginPath(); c.arc(particle.x, particle.y, particle.size * Math.max(0, particle.life / particle.max) + 0.5, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      damageFlash = Math.max(0, damageFlash - dt);
      if (damageFlash > 0) {
        const vignette = c.createRadialGradient(240, 420, 100, 240, 420, 500);
        vignette.addColorStop(0, '#ff705000'); vignette.addColorStop(1, `rgba(255, 85, 65, ${damageFlash * 1.5})`);
        c.fillStyle = vignette; c.fillRect(0, 0, 480, 800);
      }
      particles = particles.filter(p => p.life > 0);
      if (run.boss && run.boss.age < fortress.entrance) {
        c.textAlign = 'center'; c.font = 'bold 22px monospace'; c.fillStyle = '#ffcf9e'; c.fillText('IRON TEMPEST', 240, 320);
        c.font = '11px monospace'; c.fillText('BREAK THE GLOWING REACTORS', 240, 345);
      }
      if (run.boss && run.boss.health <= 0) {
        c.textAlign = 'center'; c.font = 'bold 20px monospace'; c.fillStyle = '#cdffe8'; c.fillText('FORTRESS DOWN', 240, 350);
      }
      const wave = waves[run.nextWave - 1];
      if (wave && run.elapsed - wave.at < 2.2) {
        c.textAlign = 'center'; c.font = '600 11px monospace'; c.fillStyle = '#a6e9e2'; c.fillText(`FORMATION ${String(run.nextWave).padStart(2, '0')} / ${wave.label.toUpperCase()}`, 240, 90);
      }
      c.restore();
      c.strokeStyle = '#73c7c233'; c.lineWidth = 1; c.strokeRect(0, 0, 480, 800);
    },
    dispose() { if (coastalTile) { coastalTile.width = coastalTile.height = 1; coastalTile = undefined; } particles = []; flashes.clear(); images = {}; canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
