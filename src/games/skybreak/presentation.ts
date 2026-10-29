import { flight, fortress, waves, type Pattern } from './content.ts';
import { bossLanes, enemyCharge, type Boss, type Enemy, type FlightEvent, type Point, type Run } from './game.ts';
import { flightFrame, type FlightSprite } from './art-pack.ts';
import type { ImageBundle } from '../../engine/browser/images.ts';
import type { FlightTheme } from './themes.ts';
import { createSpaceScene } from './space-scene.ts';
import type { FlightPresentation, FlightSize } from './flight-presentation.ts';

export function flightView(width: number, height: number) {
  const scale = Math.min(width / flight.width, height / flight.height);
  return { scale, x: (width - flight.width * scale) / 2, y: (height - flight.height * scale) / 2 };
}
const noise = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
export function createPresentation(surface: HTMLElement, theme: FlightTheme,
  { overlay = false, images = {} as ImageBundle } = {}): FlightPresentation {
  const canvas = document.createElement('canvas'); canvas.className = 'skybreak-canvas'; canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  const c = ctx;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  surface.append(canvas);
  const space = !overlay && theme.scene !== 'ocean' ? createSpaceScene(theme) : undefined;
  let visualTime = 0;
  let particles: Particle[] = [], lastTime = 0, width = 0, height = 0, damageFlash = 0;
  let lastRecharge = 0, rollReadyAt = -Infinity;
  const flashes = new Map<number | 'boss', number>();
  function sprite(art: FlightSprite) {
    const image = images[art.image];
    if (!image) return;
    const [, y, w, h] = art.rect, [width, height] = art.footprint;
    c.save(); c.rotate(art.rotation); c.imageSmoothingEnabled = false;
    c.drawImage(image, flightFrame(art, visualTime, motion.matches), y, w, h, -width / 2, -height / 2, width, height);
    c.restore();
  }
  function polygon(points: number[], fill: string, stroke = '#092f47') {
    c.beginPath(); c.moveTo(points[0]!, points[1]!);
    for (let i = 2; i < points.length; i += 2) c.lineTo(points[i]!, points[i + 1]!);
    c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke();
  }
  function plane(x: number, y: number, kind: Pattern | 'player', bank = 0, roll = 0, shadow = false, flash = false) {
    if (overlay) return;
    c.save(); c.translate(x, y);
    if (kind !== 'player') c.rotate(Math.PI);
    if (!motion.matches) {
      c.scale(roll ? Math.cos(roll * Math.PI * 3) * 0.75 : 1 - Math.abs(bank) * 0.12, 1);
      c.rotate(bank * 0.12);
    }
    if (shadow) { c.globalAlpha = 0.2; c.translate(9, 16); }
    const art = theme.art?.actors[kind];
    if (art) {
      if (shadow) { c.restore(); return; }
      // Sprites carry their engine animation; a compact halo signals damage without replacing their silhouette.
      if (flash) { c.shadowColor = '#ffffff'; c.shadowBlur = 12; }
      sprite(art); c.restore(); return;
    }
    if (theme.scene !== 'ocean') {
      if (shadow) { c.restore(); return; }
      const span = kind === 'swoop' ? 34 : kind === 'interceptor' ? 19 : 27;
      const color = flash ? '#ffffff' : kind === 'player' ? theme.palette.player : theme.palette.enemy;
      c.fillStyle = `${theme.palette.accent}66`; c.shadowColor = theme.palette.accent; c.shadowBlur = 10;
      c.beginPath(); c.ellipse(0, 28, 5, motion.matches ? 9 : 10 + Math.sin(visualTime * 30) * 3, 0, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
      polygon([-span, 22, -span + 4, -3, -10, -8, 0, -35, 10, -8, span - 4, -3, span, 22, 9, 13, 5, 23, -5, 23, -9, 13], color, theme.palette.accent);
      polygon([-6, 8, 0, -20, 6, 8, 0, 18], '#142238', theme.palette.accent);
      c.fillStyle = theme.palette.accent; c.fillRect(-span + 5, 2, 3, 12); c.fillRect(span - 8, 2, 3, 12);
      c.restore(); return;
    }
    const base = flash ? '#ffffff' : shadow ? '#031c31' : kind === 'player' ? '#eaf6e9' : kind === 'interceptor' ? '#ffb9a7' : kind === 'crossing' ? '#eeb963' : kind === 'swoop' ? '#bdafdf' : '#f17c67';
    const dark = shadow ? '#031c31' : kind === 'player' ? '#269ab2' : '#723f55';
    if (!shadow) {
      c.fillStyle = kind === 'player' ? '#7ce4de55' : '#ffffff15';
      for (const side of [-1, 1]) { c.fillRect(side * 13 - 1, 24, 2, 36); }
    }
    const span = kind === 'swoop' ? 33 : kind === 'interceptor' ? 18 : kind === 'crossing' ? 22 : 28;
    polygon([-span, 8, -span + 3, 0, -7, -11, -4, -28, 0, -34, 4, -28, 7, -11, span - 3, 0, span, 8, 7, 5, 5, 21, 13, 27, 13, 31, 0, 28, -13, 31, -13, 27, -5, 21, -7, 5], base);
    if (!shadow) {
      polygon([-4, -11, 0, -18, 4, -11, 3, 8, -3, 8], '#163c57', '#93e6e0');
      c.fillStyle = dark; c.fillRect(-span + 5, 2, 12, 4); c.fillRect(span - 17, 2, 12, 4);
      c.fillStyle = '#ffce74'; c.fillRect(-3, 16, 6, 10);
      c.strokeStyle = '#d4ffff99'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -28); c.lineTo(12, -28); c.stroke();
    }
    c.restore();
  }
  function ocean(time: number) {
    const gradient = c.createLinearGradient(0, 0, 480, 800);
    gradient.addColorStop(0, '#083953'); gradient.addColorStop(0.5, '#09516b'); gradient.addColorStop(1, '#082f50');
    c.fillStyle = gradient; c.fillRect(0, 0, 480, 800);
    // Long currents and short glints move at distinct depths. Pure cosmetic coordinates.
    for (let i = 0; i < 95; i++) {
      const x = noise(i + 5) * 480, y = (noise(i + 120) * 920 + time * (22 + noise(i) * 24)) % 920 - 60;
      c.strokeStyle = i % 3 ? '#81d4db18' : '#a4f0e839'; c.lineWidth = i % 3 ? 1 : 2;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 12, y + 3, x + 18 + noise(i + 7) * 27, y); c.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = [44, 425, 110, 385, 40][i]!, y = ((i * 273 + time * 45) % 1400) - 260;
      c.save(); c.translate(x, y); c.rotate(i * 1.7);
      c.fillStyle = '#3ba8ad40'; c.beginPath(); c.ellipse(0, 0, 66, 103, 0, 0, Math.PI * 2); c.fill();
      polygon([-40, -44, -18, -85, 12, -78, 37, -30, 32, 24, 5, 76, -26, 58, -47, 12], '#c1ba83', '#8fe0d14d');
      polygon([-30, -40, -12, -69, 10, -61, 26, -23, 20, 22, 2, 62, -24, 38, -34, 5], '#357e6d', '#27685e');
      for (let tree = 0; tree < 6; tree++) {
        c.fillStyle = tree % 2 ? '#4d9680' : '#256757'; c.beginPath();
        c.arc(noise(i * 9 + tree) * 40 - 20, noise(tree + i * 7) * 90 - 45, 8, 0, Math.PI * 2); c.fill();
      }
      if (i === 1) { c.fillStyle = '#9ab9b0'; c.fillRect(12, 0, 54, 9); c.fillStyle = '#345864'; c.fillRect(36, -2, 12, 13); }
      c.restore();
    }
    // Sparse translucent cloud banks drift above the water.
    for (let i = 0; i < 4; i++) {
      const x = noise(i + 40) * 530 - 25, y = (i * 330 + time * 68) % 1300 - 220;
      c.fillStyle = '#d1edf00b';
      for (let j = 0; j < 4; j++) { c.beginPath(); c.ellipse(x + j * 25, y + Math.sin(j) * 12, 45, 25, -0.3, 0, Math.PI * 2); c.fill(); }
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
    if (!overlay) {
      c.fillStyle = '#00152355'; c.beginPath(); c.ellipse(12, 30, 168, 70, 0, 0, Math.PI * 2); c.fill();
      if (theme.art?.flagship) {
        c.save(); c.rotate(Math.PI);
        if (flashes.has('boss')) { c.shadowColor = '#ffffff'; c.shadowBlur = 12; }
        sprite(theme.art.flagship); c.restore();
      } else {
        polygon([-168, 12, -155, -18, -56, -50, -23, -82, 23, -82, 56, -50, 155, -18, 168, 12, 112, 35, 43, 19, 25, 68, -25, 68, -43, 19, -112, 35], flashes.has('boss') ? '#ecffff' : theme.palette.armor, '#b1c5c6');
        polygon([-43, -38, -17, -65, 17, -65, 43, -38, 28, 38, 0, 60, -28, 38], '#18364e', '#8aa7b3');
      }
    }
    if (theme.scene !== 'ocean') {
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
        c.fillStyle = `${theme.palette.accent}88`; c.fillRect(side * (116 + i * 9) - 2, -4 + i * 3, 3, 14);
      }
    }
    for (const side of [-1, 1]) {
      const x = side * 88, y = 16 + Math.sin(b.age * 2) * 8;
      c.save(); c.translate(x, y);
      if (!overlay) polygon([-25, -40, 25, -40, 30, 20, 16, 42, -16, 42, -30, 20], '#243b51', '#8ba4b7');
      c.fillStyle = dead ? '#ffbb75' : '#7aeadd'; c.shadowColor = c.fillStyle; c.shadowBlur = 14;
      if (overlay) {
        const reactor = c.createRadialGradient(-5, -6, 1, 0, 0, 19);
        reactor.addColorStop(0, '#effff9'); reactor.addColorStop(0.38, '#9af9e5');
        reactor.addColorStop(0.72, dead ? '#ffbb75' : '#35aeb7'); reactor.addColorStop(1, '#102d3d');
        c.fillStyle = reactor;
      }
      c.beginPath(); c.arc(0, 0, 17, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
      c.strokeStyle = '#15334d'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 23, b.age * side * 3, b.age * side * 3 + 4.5); c.stroke();
      c.fillStyle = '#ffb576'; c.fillRect(-7, 40, 14, motion.matches ? 10 : 10 + Math.sin(b.age * 29) * 5); c.restore();
      c.strokeStyle = '#aec8c177'; c.lineWidth = 2; c.beginPath(); c.moveTo(side * 44, -21); c.lineTo(side * 143, 0); c.stroke();
    }
    c.fillStyle = dead || b.phase === 2 ? '#ffae85' : '#b2fff2'; c.shadowColor = c.fillStyle; c.shadowBlur = 18;
    c.beginPath(); c.arc(0, 10, 28, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    polygon([-15, -9, 15, -9, 20, 25, 0, 39, -20, 25], '#19344d', '#ddfff3');
    c.fillStyle = '#ffe3a7'; c.fillRect(-3, 0, 6, 22);
    if (dead && !motion.matches) for (let i = 0; i < 9; i++) {
      const age = (b.defeated + i * 0.19) % 0.7, x = noise(i + Math.floor(b.defeated * 4)) * 260 - 130, y = noise(i + 30) * 90 - 40;
      c.globalAlpha = (1 - age / 0.7) * Math.max(0, 1 - b.defeated / fortress.defeatDuration);
      c.fillStyle = i % 2 ? '#ffe9ab' : '#ff8259'; c.beginPath(); c.arc(x, y, 8 + age * 34, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  return {
    element: canvas,
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
      if (!overlay) { c.fillStyle = theme.palette.background; c.fillRect(0, 0, size.width, size.height); }
      const view = flightView(size.width, size.height);
      c.translate(view.x, view.y); c.scale(view.scale, view.scale);
      c.save(); c.beginPath(); c.rect(0, 0, 480, 800); c.clip();
      visualTime = motion.matches ? 0 : attractTime ?? run.elapsed;
      if (space) space.draw(c, visualTime); else if (!overlay) ocean(visualTime);
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
        c.fillStyle = '#06273e'; c.strokeStyle = color; c.lineWidth = 2;
        c.shadowColor = color; c.shadowBlur = 14;
        c.beginPath(); c.roundRect(-18, -18, 36, 36, 9); c.fill(); c.stroke(); c.shadowBlur = 0;
        c.strokeStyle = color; c.lineWidth = 3; c.beginPath();
        if (item.kind === 'repair') { c.moveTo(-9, 0); c.lineTo(9, 0); c.moveTo(0, -9); c.lineTo(0, 9); }
        else if (item.kind === 'power') { for (const y of [-5, 5]) { c.moveTo(-8, y + 3); c.lineTo(0, y - 4); c.lineTo(8, y + 3); } }
        else { for (const x of [-10, 0, 10]) { c.moveTo(x, 8); c.lineTo(x * 0.4, -7); } }
        c.stroke(); c.fillStyle = color; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText(item.kind.toUpperCase(), 0, 32); c.restore();
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
    dispose() { particles = []; flashes.clear(); images = {}; space?.dispose(); canvas.remove(); canvas.width = canvas.height = 1; },
  };
}
