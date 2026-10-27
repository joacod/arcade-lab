import { clearing, enemies, weapons } from './content.ts';
import type { GameEvent, RunState } from './game.ts';
import type { Stick } from './browser/input.ts';
import { orbitPosition } from './weapons/halo.ts';
import { edgeCue, type Viewport } from './view.ts';
import { MAX_EFFECTS, visualTiming, type Theme } from './themes.ts';
import { clipFrame, type ActorRole, type Decoration } from './art-pack.ts';
import { actorClip, createAnimationObservations } from './animation.ts';
import type { ImageBundle } from './assets.ts';

export function createPresentation(ctx: CanvasRenderingContext2D, initialTheme: Theme) {
  let theme = initialTheme, images: ImageBundle = {};
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
    const source = images[image];
    if (!source) return;
    const [w, h] = definition.footprint, [ax, ay] = definition.anchor;
    ctx.drawImage(source, sx, sy, sw, sh, -ax * w, -ay * h, w, h);
  }
  function sprite(role: ActorRole, id: string | number, time: number, fallbackRadius: number, color: string, hitAt?: number, attackAt?: number) {
    const art = theme.art.actors[role], observation = observations.get(id);
    const hit = hitAt !== undefined && art.clips.hit && time - hitAt < art.clips.hit.frames.length * art.clips.hit.frameSeconds;
    const attack = attackAt !== undefined && art.clips.attack && time - attackAt < art.clips.attack.frames.length * art.clips.attack.frameSeconds;
    const clip = hit ? art.clips.hit! : attack ? art.clips.attack! : actorClip(art, observation);
    const age = hit ? time - hitAt! : attack ? time - attackAt! : time - observation.since;
    ctx.save();
    if (art.orientation === 'rotate') ctx.rotate(observation.angle);
    else if (art.orientation === 'mirror' && Math.cos(observation.angle) < -0.01) ctx.scale(-1, 1);
    if (!Object.keys(images).length) {
      circle(0, 0, fallbackRadius, color);
      circle(fallbackRadius * 0.4, 0, 3, color === theme.palette.light ? '#fff0c0' : '#301c32');
    } else stamp({ ...art, clip }, age);
    ctx.restore();
  }
  function environment(time: number) {
    const environment = theme.art.environment!;
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
    setAppearance(next: Theme, bundle: ImageBundle) { theme = next; images = bundle; },
    observe(run: Readonly<RunState>) { observations.observe(run); },
    reset(run: Readonly<RunState>) { effects = []; observations.reset(run); },
    consume(events: readonly GameEvent[]) {
      for (const event of events) if ('x' in event) effects.push(event);
      if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS);
    },
    draw(run: Readonly<RunState>, view: Viewport, cssWidth: number, cssHeight: number,
      ratio: number, stick: Stick | undefined) {
      const palette = theme.palette;
      ctx.imageSmoothingEnabled = theme.art.sampling === 'smooth';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      ctx.fillStyle = palette.floor;
      ctx.fillRect(0, 0, width, height);

      if (theme.art.environment) environment(run.elapsed);
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
          if (theme.motif === 'crystal') { ctx.lineTo(x, y + 4); ctx.closePath(); }
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
          if (theme.motif === 'crystal') { ctx.strokeStyle = palette.ground; ctx.stroke(); }
        }
      }

      }
      ctx.strokeStyle = palette.boundary; ctx.lineWidth = 2;
      ctx.strokeRect(-2, -2, width + 4, height + 4);

      // Warnings are simulation-owned pending entries, not hittable enemies.
      for (const entry of [...run.entries, ...run.enemies.filter(enemy => enemy.entryDelay > 0).map(enemy => ({ ...enemy, remaining: enemy.entryDelay }))]) {
        const progress = 1 - entry.remaining / run.round.entryWarning;
        ctx.strokeStyle = '#f1b37d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(entry.x, entry.y, 19 + progress * 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(entry.x - 8, entry.y); ctx.lineTo(entry.x + 8, entry.y);
        ctx.moveTo(entry.x, entry.y - 8); ctx.lineTo(entry.x, entry.y + 8); ctx.stroke();
      }
      effects = effects.filter(effect => run.elapsed - effect.at < visualTiming.defeat);
      for (const enemy of run.enemies) {
        const hit = effects.some(effect => effect.type === 'enemy-hit'
          && run.elapsed - effect.at < visualTiming.hit
          && effect.enemyId === enemy.id);
        const data = enemies[enemy.kind];
        circle(enemy.x, enemy.y + data.radius * 0.65, theme.art.sampling === 'nearest' ? data.radius * 0.8 : data.radius + 3, '#030a1666');
        ctx.save(); ctx.translate(enemy.x, enemy.y);
        if (enemy.entryDelay > 0) ctx.globalAlpha = 0.4;
        sprite(data.elite ? 'elite' : 'crawler', enemy.id, run.elapsed, data.radius, data.elite ? '#b75466' : '#ae676e',
          effects.findLast(effect => effect.type === 'enemy-hit' && effect.enemyId === enemy.id)?.at);
        if (hit) { ctx.globalAlpha = 0.85; ring(0, 0, data.radius + 2, '#fff4d9', 2); }
        ctx.restore();
        if (data.elite) {
          ctx.fillStyle = '#f1b37d'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
          const art = theme.art.actors.elite;
          ctx.fillText(data.name, enemy.x, enemy.y - Math.max(32, art.footprint[1] * art.anchor[1] + 8));
        }
        if (enemy.health < data.maxHealth) {
          const art = theme.art.actors[data.elite ? 'elite' : 'crawler'];
          const barY = enemy.y - Math.max(data.radius + 8, art.footprint[1] * art.anchor[1] + 3);
          ctx.fillStyle = '#1b2524'; ctx.fillRect(enemy.x - data.radius, barY, data.radius * 2, 3);
          ctx.fillStyle = '#e6a091'; ctx.fillRect(enemy.x - data.radius, barY, data.radius * 2 * enemy.health / data.maxHealth, 3);
        }
      }
      for (const gem of run.gems) {
        ctx.save(); ctx.translate(gem.x, gem.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = gem.amount > enemies.crawler.xp ? '#e6b1ff' : palette.gem;
        ctx.strokeStyle = '#182b34'; ctx.lineWidth = 2;
        ctx.fillRect(-5, -5, 10, 10); ctx.strokeRect(-5, -5, 10, 10);
        ctx.fillStyle = '#ecfff1'; ctx.fillRect(-3, -3, 3, 3); ctx.restore();
      }
      for (const slot of run.loadout) if (weapons[slot.base].behavior === 'orbit') {
        const at = orbitPosition(run, slot);
        ctx.strokeStyle = '#efdb8b55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(run.player.x, run.player.y, weapons[slot.base].radius, 0, Math.PI * 2); ctx.stroke();
        circle(at.x, at.y, weapons[slot.base].hitRadius + 3, '#111c29');
        circle(at.x, at.y, weapons[slot.base].hitRadius, palette.light);
      }
      for (const projectile of run.projectiles) {
        if (projectile.weapon === 'shard') {
          ctx.save(); ctx.translate(projectile.x, projectile.y); ctx.rotate(Math.atan2(projectile.dy, projectile.dx));
          ctx.fillStyle = palette.shard;
          ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -4); ctx.lineTo(-2, 0); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
          ctx.restore(); continue;
        }
        ctx.strokeStyle = palette.spark; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(projectile.x - projectile.dx * 12, projectile.y - projectile.dy * 12);
        ctx.lineTo(projectile.x, projectile.y); ctx.stroke();
        circle(projectile.x, projectile.y, weapons[projectile.weapon].hitRadius, projectile.chainLimit > 1 ? '#73f6ff' : palette.spark);
      }
      for (const effect of effects) {
        const age = run.elapsed - effect.at;
        const duration = effect.type === 'pickup' ? visualTiming.pickup : effect.type === 'enemy-defeated' ? visualTiming.defeat
          : effect.type === 'pulse' ? visualTiming.pulse
          : effect.type === 'shot' ? visualTiming.shot : visualTiming.hit;
        if (age >= duration) continue;
        ctx.save(); ctx.globalAlpha = 1 - age / duration;
        ctx.strokeStyle = effect.type === 'player-hit' ? '#ff8a82'
          : effect.type === 'enemy-defeated' ? '#efbb9f' : effect.type === 'pickup' ? palette.gem : effect.type === 'pulse' ? palette.pulse : palette.spark;
        ctx.lineWidth = effect.type === 'player-hit' ? 4 : 2;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.type === 'pulse' ? effect.radius : 8 + age / duration * 21, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      const { x, y } = run.player;
      const light = ctx.createRadialGradient(x, y, 5, x, y, 90);
      light.addColorStop(0, palette.light + '22'); light.addColorStop(1, palette.light + '00');
      circle(x, y, 90, light);
      ring(x, y, 19, '#07101c', 3);
      ring(x, y, 19, palette.light, 1);
      if (run.player.shield > 0) ring(x, y, 23, palette.spark, 1.5);
      circle(x, y + 6, 13, '#09151370');
      ctx.save();
      ctx.translate(x, y);
      sprite('keeper', 'keeper', run.elapsed, clearing.keeper.radius, palette.light,
        effects.findLast(effect => effect.type === 'player-hit')?.at, effects.findLast(effect => effect.type === 'shot')?.at);
      if (effects.some(effect => effect.type === 'player-hit' && run.elapsed - effect.at < visualTiming.hit)) {
        ring(0, 0, 16, '#ffffff', 3);
      }
      ctx.restore();

      // A steady lantern core remains readable at narrow viewport scales.
      if (theme.art.sampling === 'smooth') circle(x, y, 5, '#fff0c0');
      // Screen overlays share CSS coordinates with movement gestures, never world zoom.
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const warnings = [...run.entries, ...run.enemies.filter(enemy => enemy.entryDelay > 0 || enemies[enemy.kind].elite)];
      for (const warning of warnings) {
        const cue = edgeCue(view, { width: cssWidth, height: cssHeight }, warning);
        if (!cue) continue;
        const elite = enemies[warning.kind].elite;
        ctx.save(); ctx.translate(cue.x, cue.y); ctx.rotate(cue.angle);
        ctx.fillStyle = elite ? '#ffb4ac' : '#f1b37d';
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (elite) {
          ctx.fillStyle = '#ffcfbf'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('ELITE', Math.max(36, Math.min(cssWidth - 36, cue.x)), cue.y + 20);
        }
      }
      if (stick) {
        const dx = stick.tip.x - stick.origin.x;
        const dy = stick.tip.y - stick.origin.y;
        const divisor = Math.max(1, Math.hypot(dx, dy) / stick.radius);
        ctx.strokeStyle = '#f5d58b88'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(stick.origin.x, stick.origin.y, stick.radius, 0, Math.PI * 2); ctx.stroke();
        circle(stick.origin.x + dx / divisor, stick.origin.y + dy / divisor, stick.radius * 2 / 7, '#f5d58b99');
      }
    },
  };
}
