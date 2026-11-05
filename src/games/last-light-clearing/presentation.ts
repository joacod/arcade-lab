import { clearing, enemies, weapons } from './content.ts';
import type { GameEvent, RunState } from './game.ts';
import { orbitPosition } from './weapons/halo.ts';
import type { Viewport } from './view.ts';
import type { WorldPresentation, DisplaySize } from './world-presentation.ts';
import { MAX_EFFECTS, visualTiming, type Theme } from './themes.ts';
import { validateArtPack, clipFrame, type ActorRole, type Decoration } from './art-pack.ts';
import { actorAnimation, createAnimationObservations } from './animation.ts';
import { createImageResource, type ImageBundle } from '../../engine/browser/images.ts';
import type { createEmberScene } from './ember-scene.ts';
import { haloLights } from './weapon-stats.ts';

export function createPresentation(theme: Theme, images: ImageBundle = {}, createScene?: typeof createEmberScene): WorldPresentation {
  const artPack = theme.art;
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  const quality = theme.presentation === 'ember';
  canvas.dataset.renderer = quality ? 'ember' : 'canvas';
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is required to play.');
  const ctx = context;
  if (quality && !createScene) throw new Error('Ember scenery must be prepared before activation.');
  const ember = createScene?.(images, artPack!.environment!);
  const baseline = artPack && !Object.keys(images).length ? createImageResource(artPack.images, d => validateArtPack(artPack,d)) : undefined;
  const gemArt = artPack?.objects?.gem ? undefined : createImageResource({gem:new URL('./art/grove/gem.svg',import.meta.url).href}, d => d.gem?.width === 32 && d.gem.height === 32 ? [] : ['Invalid XP gem']);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let size: DisplaySize = { width: 1, height: 1, ratio: 1 };
  const observations = createAnimationObservations();
  let effects: Extract<GameEvent, { x: number }>[] = [];
  const { width, height } = clearing.arena;

  function circle(x: number, y: number, radius: number, color: string | CanvasGradient) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function ring(x: number, y: number, radius: number, color: string, lineWidth: number) {
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
  }
  function stamp(definition: Decoration, time: number) {
    const { image, rect: [sx, sy, sw, sh] } = clipFrame(definition.clip, time);
    const source = images[image] ?? baseline?.images[image];
    if (!source) return;
    const [w, h] = definition.footprint, [ax, ay] = definition.anchor;
    ctx.drawImage(source, sx, sy, sw, sh, -ax * w, -ay * h, w, h);
  }
  function sprite(role: ActorRole, id: string | number, time: number, fallbackRadius: number, color: string, hitAt?: number, attackAt?: number) {
    const observation = observations.get(id);
    if (!artPack) return;
    const art = artPack.actors[role] ?? artPack.actors.crawler;
    const { clip, age } = actorAnimation(art, observation, time, hitAt, attackAt);
    ctx.save();
    if (art.orientation === 'rotate') ctx.rotate(observation.angle);
    else if (art.orientation === 'mirror' && Math.cos(observation.angle) < -0.01) ctx.scale(-1, 1);
    if (!Object.keys(images).length && !Object.keys(baseline?.images ?? {}).length) {
      circle(0, 0, fallbackRadius, color);
      circle(fallbackRadius * 0.4, 0, 3, theme.palette.hit);
    } else stamp({ ...art, clip }, quality && reducedMotion.matches ? 0 : age);
    ctx.restore();
  }
  function drawKeeper(run: Readonly<RunState>) {
    const palette = theme.palette;
    const { x, y } = run.player;
    const light = ctx.createRadialGradient(x, y, 5, x, y, 90);
    light.addColorStop(0, palette.light + '22'); light.addColorStop(1, palette.light + '00');
    circle(x, y, 90, light);
    if (!quality) { ring(x, y, 19, '#07101c', 3); ring(x, y, 19, palette.light, 1); }
    if (run.player.shield > 0) ring(x, y, 23, palette.spark, 1.5);
    if (ember) ember.shadow(ctx, x, y + 6, 13);
    else circle(x, y + 6, 13, '#09151370');
    ctx.save();
    ctx.translate(x, y);
    if (quality) { ctx.shadowColor = '#ffca7b60'; ctx.shadowBlur = 8; }
    sprite('keeper', 'keeper', run.elapsed, clearing.keeper.radius, palette.light,
      effects.findLast(effect => effect.type === 'player-hit')?.at, effects.findLast(effect => effect.type === 'shot')?.at);
    if (effects.some(effect => effect.type === 'player-hit' && run.elapsed - effect.at < visualTiming.hit)) {
      ring(0, 0, 16, palette.hit, 3);
    }
    ctx.restore();

    // A steady lantern core remains readable at narrow viewport scales.
    if (!quality && artPack?.sampling !== 'nearest') circle(x, y, 5, palette.light);
  }
  function environment(time: number) {
    const environment = artPack!.environment!;
    const { tileSize, ground, perimeter } = environment;
    ctx.save();
    ctx.globalAlpha = environment.groundOpacity ?? 1;
    ctx.beginPath(); ctx.rect(0, 0, width, height); ctx.clip();
    for (let y = 0; y < height; y += tileSize) for (let x = 0; x < width; x += tileSize) {
      const hash = ((x / tileSize) * 31 + (y / tileSize) * 17) % 29;
      const tile = ground[hash < 3 ? (hash + 1) % ground.length : 0]!;
      ctx.save(); ctx.translate(x, y); stamp(tile, time); ctx.restore();
    }
    ctx.restore();
    if (environment.border) {
      const border = environment.border, [w, h] = border.footprint, [ax, ay] = border.anchor;
      for (let x = 0; x < width; x += w) for (const y of [-h * (1 - ay), height + h * ay]) {
        ctx.save(); ctx.translate(x + w * ax, y); stamp(border, time); ctx.restore();
      }
      for (let y = 0; y < height; y += h) for (const x of [-w * (1 - ax), width + w * ax]) {
        ctx.save(); ctx.translate(x, y + h * ay); stamp(border, time); ctx.restore();
      }
    }
    // Every substantial prop's complete rectangle remains outside the traversable arena.
    for (let i = 0; i < Math.max(width, height); i += 64) {
      const item = perimeter[(i / 64) % perimeter.length];
      if (!item) continue;
      const [w, h] = item.footprint, [ax, ay] = item.anchor;
      const positions = [];
      if (i < width) positions.push([i + 24, -8 - h * (1 - ay)], [width - i - 24, height + 8 + h * ay]);
      if (i < height) positions.push([-8 - w * (1 - ax), i + 24], [width + 8 + w * ax, height - i - 24]);
      for (const [x, y] of positions) {
        ctx.save(); ctx.translate(x!, y!); stamp(item, time + i * 0.01); ctx.restore();
      }
    }
  }

  return {
    canvas,
    prepare: () => Promise.all([baseline?.prepare(), gemArt?.prepare()]).then(() => {}),
    resize(next: DisplaySize) {
      size = { width: next.width, height: next.height, ratio: next.ratio };
      const w = Math.round(size.width * size.ratio), h = Math.round(size.height * size.ratio);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    },
    dispose() { ember?.dispose(); baseline?.dispose(); gemArt?.dispose(); canvas.remove(); canvas.width = canvas.height = 1; effects = []; },
    observe(run: Readonly<RunState>) { observations.observe(run); },
    reset(run: Readonly<RunState>) { effects = []; observations.reset(run); },
    consume(events: readonly GameEvent[]) {
      for (const event of events) if ('x' in event) effects.push(event);
      if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS);
    },
    draw(run: Readonly<RunState>, view: Viewport) {
      const { width: cssWidth, height: cssHeight, ratio } = size;
      const palette = theme.palette;
      ctx.imageSmoothingEnabled = artPack?.sampling !== 'nearest';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      ctx.fillStyle = palette.floor;
      ctx.fillRect(0, 0, width, height);

      if (ember) ember.ground(ctx, reducedMotion.matches ? 0 : run.elapsed);
      else if (artPack?.environment) environment(run.elapsed);
      else {
        const glow = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, 540);
        glow.addColorStop(0, palette.boundary + '25');
        glow.addColorStop(1, palette.background + '99');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // Deterministic original ground marks. Decoration never changes collisions.
        for (let i = 0; i < 155; i++) {
          const x = (i * 157 + 29) % width;
          const y = (i * 239 + 53) % height;
          ctx.strokeStyle = palette.ground;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x - 3, y); ctx.lineTo(x, y - (theme.motif === 'grove' ? 5 : 9)); ctx.lineTo(x + 3, y);
          ctx.stroke();
          if (i % 11 === 0) circle(x + 5, y + 3, 2, palette.ground);
        }

        ctx.strokeStyle = '#9fa88222';
        ctx.lineWidth = 1;
        for (const radius of [67, 92]) {
          ctx.beginPath(); ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = palette.boundary;
      ctx.lineWidth = 3;
      ctx.strokeRect(-1.5, -1.5, width + 3, height + 3);
      ctx.strokeStyle = palette.boundary + '44';
      ctx.strokeRect(-10, -10, width + 20, height + 20);
      for (let x = 24; x < width; x += 48) {
        circle(x, -24, 10 + x % 7, palette.canopy);
        circle(width - x, height + 25, 11 + x % 9, palette.canopy);
      }
      for (let y = 24; y < height; y += 48) {
        circle(-25, y, 12, palette.canopy); circle(width + 25, height - y, 13, palette.canopy);
      }

      // Border silhouettes frame the arena without covering its playable area.
      for (let i = 0; i < 24; i++) {
        for (const edgeY of [-42, height + 42]) {
          const atX = 14 + i * 41, size = 15 + i % 4 * 3;
          ctx.fillStyle = i % 2 ? palette.canopy : palette.background;
          ctx.beginPath(); ctx.moveTo(atX - size, edgeY + 12);
          ctx.lineTo(atX - size * 0.6, edgeY - 9); ctx.lineTo(atX, edgeY - size);
          ctx.lineTo(atX + size, edgeY + 12); ctx.closePath(); ctx.fill();
        }
      }

      }
      if (!quality) { ctx.strokeStyle = palette.boundary; ctx.lineWidth = 2; ctx.strokeRect(-2, -2, width + 4, height + 4); }

      // Warnings are simulation-owned pending entries, not hittable enemies.
      for (const entry of [...run.entries, ...run.enemies.filter(enemy => enemy.entryDelay > 0).map(enemy => ({ ...enemy, remaining: enemy.entryDelay }))]) {
        const progress = 1 - entry.remaining / run.round.entryWarning;
        ctx.strokeStyle = palette.elite; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(entry.x, entry.y, 19 + progress * 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(entry.x - 8, entry.y); ctx.lineTo(entry.x + 8, entry.y);
        ctx.moveTo(entry.x, entry.y - 8); ctx.lineTo(entry.x, entry.y + 8); ctx.stroke();
      }
      effects = effects.filter(effect => run.elapsed - effect.at < visualTiming.defeat);
      let keeperDrawn = false;
      for (const enemy of quality ? [...run.enemies].sort((a, b) => a.y - b.y) : run.enemies) {
        if (quality && !keeperDrawn && enemy.y > run.player.y) { drawKeeper(run); keeperDrawn = true; }
        const hit = effects.some(effect => effect.type === 'enemy-hit'
          && run.elapsed - effect.at < visualTiming.hit
          && effect.enemyId === enemy.id);
        const data = enemies[enemy.kind];
        if (ember) ember.shadow(ctx, enemy.x, enemy.y + 5, data.radius);
        else circle(enemy.x, enemy.y + data.radius * 0.65, artPack?.sampling === 'nearest' ? data.radius * 0.8 : data.radius + 3, '#030a1666');
        ctx.save(); ctx.translate(enemy.x, enemy.y);
        if (enemy.entryDelay > 0) ctx.globalAlpha = 0.4;
        sprite(data.elite ? 'elite' : enemy.kind === 'charger' ? 'charger' : 'crawler', enemy.id, run.elapsed, data.radius, data.elite ? palette.elite : palette.enemy,
          effects.findLast(effect => effect.type === 'enemy-hit' && effect.enemyId === enemy.id)?.at);
        if (hit) { ctx.globalAlpha = 0.85; ring(0, 0, data.radius + 2, palette.hit, 2); }
        ctx.restore();
        if (data.elite) {
          ctx.fillStyle = palette.elite; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
          const art = artPack?.actors.elite;
          ctx.fillText(data.name, enemy.x, enemy.y - Math.max(32, art ? art.footprint[1] * art.anchor[1] + 8 : 0));
        }
        if (enemy.health < data.maxHealth) {
          const art = artPack?.actors[data.elite ? 'elite' : enemy.kind === 'charger' && artPack.actors.charger ? 'charger' : 'crawler'];
          const barY = enemy.y - Math.max(data.radius + 8, art ? art.footprint[1] * art.anchor[1] + 3 : 0);
          ctx.fillStyle = '#1b2524'; ctx.fillRect(enemy.x - data.radius, barY, data.radius * 2, 3);
          ctx.fillStyle = palette.damage; ctx.fillRect(enemy.x - data.radius, barY, data.radius * 2 * enemy.health / data.maxHealth, 3);
        }
      }
      if (quality && !keeperDrawn) drawKeeper(run);
      ember?.atmosphere(ctx, run, reducedMotion.matches);
      for (const gem of run.gems) {
        ember?.light(ctx, gem.x, gem.y, 18, palette.gem, .45);
        if (artPack?.objects?.gem) {
          ctx.save(); ctx.translate(gem.x, gem.y); stamp(artPack.objects.gem, run.elapsed); ctx.restore();
        } else {
          const image = gemArt?.images.gem;
          if (image) ctx.drawImage(image, gem.x - 7, gem.y - 7, 14, 14);
        }
      }
      for (const slot of run.loadout) if (weapons[slot.base].behavior === 'orbit') {
        ctx.strokeStyle = palette.halo + '55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(run.player.x, run.player.y, weapons[slot.base].radius, 0, Math.PI * 2); ctx.stroke();
        for (let index = 0; index < haloLights(slot.rank); index++) {
          const at = orbitPosition(run, slot, index);
          ember?.light(ctx, at.x, at.y, 28, palette.halo, .9);
          if (artPack?.objects?.halo) {
            ctx.save(); ctx.translate(at.x, at.y); stamp(artPack.objects.halo, run.elapsed); ctx.restore();
          } else {
            circle(at.x, at.y, weapons[slot.base].hitRadius + 3, '#111c29');
            circle(at.x, at.y, weapons[slot.base].hitRadius, palette.halo);
          }
        }
      }
      for (const projectile of run.projectiles) {
        ember?.light(ctx, projectile.x, projectile.y, 24, projectile.weapon === 'shard' ? palette.shard : palette.spark, .8);
        if (projectile.weapon === 'shard') {
          ctx.save(); ctx.translate(projectile.x, projectile.y); ctx.rotate(Math.atan2(projectile.dy, projectile.dx));
          if (artPack?.objects?.shard) stamp(artPack.objects.shard, run.elapsed);
          else { ctx.fillStyle = palette.shard; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -4); ctx.lineTo(-2, 0); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill(); }
          ctx.restore(); continue;
        }
        const arc = projectile.chainLimit > 1;
        ctx.strokeStyle = arc ? palette.shard : palette.spark; ctx.lineWidth = arc ? 4 : 3;
        ctx.beginPath(); ctx.moveTo(projectile.x - projectile.dx * 12, projectile.y - projectile.dy * 12);
        if (arc) ctx.lineTo(projectile.x - projectile.dx * 6 - projectile.dy * 4, projectile.y - projectile.dy * 6 + projectile.dx * 4);
        ctx.lineTo(projectile.x, projectile.y); ctx.stroke();
        circle(projectile.x, projectile.y, weapons[projectile.weapon].hitRadius, arc ? palette.shard : palette.spark);
      }
      for (const effect of effects) {
        const age = run.elapsed - effect.at;
        const duration = effect.type === 'pickup' ? visualTiming.pickup : effect.type === 'enemy-defeated' ? visualTiming.defeat
          : effect.type === 'pulse' ? visualTiming.pulse
          : effect.type === 'shot' ? visualTiming.shot : visualTiming.hit;
        if (age >= duration) continue;
        if (ember && !reducedMotion.matches) {
          ember.light(ctx, effect.x, effect.y, effect.type === 'pulse' ? effect.radius : 32, effect.type === 'pickup' ? palette.gem : palette.pulse, (1 - age / duration) * .75);
          if (effect.type === 'enemy-defeated') for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3 + effect.x;
            const distance = 5 + age * 52;
            ctx.fillStyle = palette.light; ctx.globalAlpha = (1 - age / duration) * .7;
            ctx.fillRect(effect.x + Math.cos(angle) * distance, effect.y + Math.sin(angle) * distance, 2, 2);
          }
          ctx.globalAlpha = 1;
        }
        ctx.save(); ctx.globalAlpha = 1 - age / duration;
        ctx.strokeStyle = effect.type === 'player-hit' ? palette.damage
          : effect.type === 'enemy-defeated' ? palette.enemy : effect.type === 'pickup' ? palette.gem : effect.type === 'pulse' ? palette.pulse : palette.spark;
        ctx.lineWidth = effect.type === 'player-hit' ? 4 : 2;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.type === 'pulse' ? effect.radius : 8 + age / duration * 21, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      if (!quality) drawKeeper(run);
    },
  };
}
