import { clearing, enemies, weapons } from './content.ts';
import type { GameEvent, RunState } from './game.ts';
import { orbitPosition } from './weapons/halo.ts';
import type { Viewport } from './view.ts';
import type { WorldPresentation, DisplaySize } from './world-presentation.ts';
import { MAX_EFFECTS, visualTiming, type Theme } from './themes.ts';
import { actorBounds, clipFrame, type ActorArt, type ActorRole, type Decoration } from './art-pack.ts';
import { actorAnimation, createAnimationObservations } from './animation.ts';
import { createImageResource, type ImageBundle } from '../../engine/browser/images.ts';
import type { createEmberScene } from './ember-scene.ts';
import { haloLights } from './weapon-stats.ts';

export function createPresentation(theme: Theme, images: ImageBundle = {}, createScene?: typeof createEmberScene): WorldPresentation {
  const artPack = theme.art;
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  const deluxe = theme.presentation === 'ember';
  canvas.dataset.renderer = deluxe ? 'ember' : 'canvas';
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is required to play.');
  const ctx = context;
  if (deluxe && !createScene) throw new Error('Ember scenery must be prepared before activation.');
  const ember = createScene?.(images, artPack.environment!);
  const gemArt = artPack.objects?.gem ? undefined : createImageResource({gem:new URL('./art/grove/gem.svg',import.meta.url).href}, d => d.gem?.width === 32 && d.gem.height === 32 ? [] : ['Invalid XP gem']);
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
  function bodyRing(art: ActorArt, color: string, lineWidth: number) {
    const bounds = actorBounds(art);
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
    ctx.beginPath(); ctx.ellipse((bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2,
      (bounds.right - bounds.left) / 2 + 3, (bounds.bottom - bounds.top) / 2 + 3, 0, 0, Math.PI * 2); ctx.stroke();
  }
  function enemyArt(enemy: RunState['enemies'][number]) {
    return enemies[enemy.kind].elite ? artPack.actors.elite
      : enemy.kind === 'charger' ? artPack.actors.charger ?? artPack.actors.crawler : artPack.actors.crawler;
  }
  function stamp(definition: Decoration, time: number) {
    const { image, rect: [sx, sy, sw, sh] } = clipFrame(definition.clip, time);
    const source = images[image];
    if (!source) return;
    const [w, h] = definition.footprint, [ax, ay] = definition.anchor;
    ctx.drawImage(source, sx, sy, sw, sh, -ax * w, -ay * h, w, h);
  }
  function sprite(role: ActorRole, id: string | number, time: number, hitAt?: number, attackAt?: number) {
    const observation = observations.get(id);
    const art = artPack.actors[role] ?? artPack.actors.crawler;
    const { clip, age } = actorAnimation(art, observation, time, hitAt, attackAt);
    ctx.save();
    if (art.orientation === 'rotate') ctx.rotate(observation.angle);
    else if (art.orientation === 'mirror' && Math.cos(observation.angle) < -0.01) ctx.scale(-1, 1);
    stamp({ ...art, clip }, deluxe && reducedMotion.matches ? 0 : age);
    ctx.restore();
  }
  function drawKeeper(run: Readonly<RunState>) {
    const palette = theme.palette;
    const { x, y } = run.player;
    const light = ctx.createRadialGradient(x, y, 5, x, y, 90);
    light.addColorStop(0, palette.light + '22'); light.addColorStop(1, palette.light + '00');
    circle(x, y, 90, light);
    if (!deluxe) { ring(x, y, 19, '#07101c', 3); ring(x, y, 19, palette.light, 1); }
    const art = artPack.actors.keeper;
    if (run.player.shield > 0 && !deluxe) ring(x, y, 23, palette.spark, 1.5);
    if (!ember) circle(x, y + 6, 13, '#09151370');
    ctx.save();
    ctx.translate(x, y);
    if (deluxe && run.player.shield > 0) bodyRing(art, palette.spark, 1.5);
    sprite('keeper', 'keeper', run.elapsed,
      effects.findLast(effect => effect.type === 'player-hit')?.at, effects.findLast(effect => effect.type === 'shot')?.at);
    if (effects.some(effect => effect.type === 'player-hit' && run.elapsed - effect.at < visualTiming.hit)) {
      if (deluxe) bodyRing(art, palette.hit, 2);
      else ring(0, 0, 16, palette.hit, 3);
    }
    ctx.restore();

  }
  function drawHalos(run: Readonly<RunState>, behind: boolean) {
    const palette = theme.palette;
    for (const slot of run.loadout) if (weapons[slot.base].behavior === 'orbit') {
      for (let index = 0; index < haloLights(slot.rank); index++) {
        const at = orbitPosition(run, slot, index);
        if (deluxe && (at.y < run.player.y) !== behind) continue;
        ember?.light(ctx, at.x, at.y, 20, palette.halo, .6);
        if (artPack.objects?.halo) {
          ctx.save(); ctx.translate(at.x, at.y); stamp(artPack.objects.halo, run.elapsed); ctx.restore();
        } else {
          circle(at.x, at.y, weapons[slot.base].hitRadius + 3, '#111c29');
          circle(at.x, at.y, weapons[slot.base].hitRadius, palette.halo);
        }
      }
    }
  }
  function environment(time: number) {
    const environment = artPack.environment!;
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
    prepare: () => gemArt?.prepare() ?? Promise.resolve(),
    resize(next: DisplaySize) {
      size = { width: next.width, height: next.height, ratio: next.ratio };
      const w = Math.round(size.width * size.ratio), h = Math.round(size.height * size.ratio);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    },
    dispose() { ember?.dispose(); gemArt?.dispose(); canvas.remove(); canvas.width = canvas.height = 1; effects = []; },
    observe(run: Readonly<RunState>) { observations.observe(run); },
    reset(run: Readonly<RunState>) { effects = []; observations.reset(run); },
    consume(events: readonly GameEvent[]) {
      for (const event of events) if ('x' in event) effects.push(event);
      if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS);
    },
    draw(run: Readonly<RunState>, view: Viewport) {
      const { width: cssWidth, height: cssHeight, ratio } = size;
      const palette = theme.palette;
      ctx.imageSmoothingEnabled = artPack.sampling !== 'nearest';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      ctx.fillStyle = palette.floor;
      ctx.fillRect(0, 0, width, height);

      if (ember) ember.ground(ctx, reducedMotion.matches ? 0 : run.elapsed);
      else if (artPack.environment) environment(run.elapsed);
      if (!deluxe) { ctx.strokeStyle = palette.boundary; ctx.lineWidth = 2; ctx.strokeRect(-2, -2, width + 4, height + 4); }

      // Warnings are simulation-owned pending entries, not hittable enemies.
      for (const entry of [...run.entries, ...run.enemies.filter(enemy => enemy.entryDelay > 0).map(enemy => ({ ...enemy, remaining: enemy.entryDelay }))]) {
        const progress = 1 - entry.remaining / run.round.entryWarning;
        ctx.strokeStyle = palette.elite; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(entry.x, entry.y, 19 + progress * 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(entry.x - 8, entry.y); ctx.lineTo(entry.x + 8, entry.y);
        ctx.moveTo(entry.x, entry.y - 8); ctx.lineTo(entry.x, entry.y + 8); ctx.stroke();
      }
      effects = effects.filter(effect => run.elapsed - effect.at < visualTiming.defeat);
      // Range tracks stay on the floor; rear spell bodies pass behind the Keeper.
      for (const slot of run.loadout) if (weapons[slot.base].behavior === 'orbit') {
        ctx.strokeStyle = palette.halo + '55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(run.player.x, run.player.y, weapons[slot.base].radius, 0, Math.PI * 2); ctx.stroke();
      }
      if (deluxe) drawHalos(run, true);
      const keeperGround = run.player.y + actorBounds(artPack.actors.keeper).groundY;
      if (ember) {
        const ground = actorBounds(artPack.actors.keeper);
        ember.shadow(ctx, run.player.x + ground.groundX, keeperGround, 11);
        for (const enemy of run.enemies) {
          const ground = actorBounds(enemyArt(enemy));
          ember.shadow(ctx, enemy.x + ground.groundX, enemy.y + ground.groundY, enemies[enemy.kind].radius * .8);
        }
      }
      let keeperDrawn = false;
      for (const enemy of deluxe ? [...run.enemies].sort((a, b) =>
        a.y + actorBounds(enemyArt(a)).groundY - b.y - actorBounds(enemyArt(b)).groundY) : run.enemies) {
        const art = enemyArt(enemy), bounds = actorBounds(art);
        if (deluxe && !keeperDrawn && enemy.y + bounds.groundY > keeperGround) { drawKeeper(run); keeperDrawn = true; }
        const hit = effects.some(effect => effect.type === 'enemy-hit'
          && run.elapsed - effect.at < visualTiming.hit
          && effect.enemyId === enemy.id);
        const data = enemies[enemy.kind];
        if (!ember) circle(enemy.x, enemy.y + data.radius * 0.65, artPack.sampling === 'nearest' ? data.radius * 0.8 : data.radius + 3, '#030a1666');
        ctx.save(); ctx.translate(enemy.x, enemy.y);
        if (enemy.entryDelay > 0) ctx.globalAlpha = 0.4;
        sprite(data.elite ? 'elite' : enemy.kind === 'charger' ? 'charger' : 'crawler', enemy.id, run.elapsed,
          effects.findLast(effect => effect.type === 'enemy-hit' && effect.enemyId === enemy.id)?.at);
        if (hit) { ctx.globalAlpha = 0.85;
          if (deluxe) bodyRing(art, palette.hit, 1.5);
          else ring(0, 0, data.radius + 2, palette.hit, 2);
        }
        ctx.restore();
        if (data.elite) {
          ctx.fillStyle = palette.elite; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(data.name, enemy.x, enemy.y + (deluxe ? bounds.top - 12 : -Math.max(32, art.footprint[1] * art.anchor[1] + 8)));
        }
        if (enemy.health < data.maxHealth) {
          const barY = enemy.y + (deluxe ? bounds.top - 7 : -Math.max(data.radius + 8, art.footprint[1] * art.anchor[1] + 3));
          ctx.fillStyle = '#1b2524'; ctx.fillRect(enemy.x - data.radius, barY, data.radius * 2, 3);
          ctx.fillStyle = palette.damage; ctx.fillRect(enemy.x - data.radius, barY, data.radius * 2 * enemy.health / data.maxHealth, 3);
        }
      }
      if (deluxe && !keeperDrawn) drawKeeper(run);
      ember?.atmosphere(ctx, run, reducedMotion.matches);
      for (const gem of run.gems) {
        ember?.light(ctx, gem.x, gem.y, 18, palette.gem, .45);
        if (artPack.objects?.gem) {
          ctx.save(); ctx.translate(gem.x, gem.y); stamp(artPack.objects.gem, run.elapsed); ctx.restore();
        } else {
          const image = gemArt?.images.gem;
          if (image) ctx.drawImage(image, gem.x - 7, gem.y - 7, 14, 14);
        }
      }
      drawHalos(run, false);
      for (const projectile of run.projectiles) {
        ember?.light(ctx, projectile.x, projectile.y, 24, projectile.weapon === 'shard' ? palette.shard : palette.spark, .8);
        if (projectile.weapon === 'shard') {
          ctx.save(); ctx.translate(projectile.x, projectile.y); ctx.rotate(Math.atan2(projectile.dy, projectile.dx));
          if (artPack.objects?.shard) stamp(artPack.objects.shard, run.elapsed);
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
        if (deluxe && (effect.type === 'enemy-hit' || effect.type === 'player-hit')) continue;
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

      if (!deluxe) drawKeeper(run);
    },
  };
}
