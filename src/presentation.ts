import { clearing, enemies, weapons } from './content.ts';
import type { GameEvent, RunState } from './game.ts';
import type { Stick } from './browser/input.ts';
import { orbitPosition } from './weapons/halo.ts';
import { edgeCue, type Viewport } from './view.ts';
import { MAX_EFFECTS, visualTiming, type Theme, type SpriteDefinition } from './themes.ts';

export function createPresentation(ctx: CanvasRenderingContext2D, initialTheme: Theme) {
  let theme = initialTheme, image: HTMLImageElement | undefined;
  let effects: Extract<GameEvent, { x: number }>[] = [];
  let facing = -Math.PI / 2;
  let lastX = clearing.arena.width / 2;
  let lastY = clearing.arena.height / 2;
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
  function sprite(definition: SpriteDefinition, fallbackRadius: number, color: string) {
    if (!image) {
      circle(0, 0, fallbackRadius, color);
      circle(fallbackRadius * 0.4, 0, 3, color === theme.palette.light ? '#fff0c0' : '#301c32');
      return;
    }
    const [sx, sy, sw, sh] = definition.frame, [ax, ay] = definition.anchor;
    ctx.drawImage(image, sx, sy, sw, sh, -ax * definition.scale, -ay * definition.scale,
      sw * definition.scale, sh * definition.scale);
  }

  return {
    setTheme(next: Theme) { theme = next; image = undefined; effects = []; },
    setImage(next: HTMLImageElement | undefined) { image = next; },
    reset() { effects = []; facing = -Math.PI / 2; lastX = width / 2; lastY = height / 2; },
    consume(events: readonly GameEvent[]) {
      for (const event of events) if ('x' in event) effects.push(event);
      if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS);
    },
    draw(run: Readonly<RunState>, view: Viewport, cssWidth: number, cssHeight: number,
      ratio: number, stick: Stick | undefined) {
      const palette = theme.palette;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      ctx.fillStyle = palette.floor;
      ctx.fillRect(0, 0, width, height);

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
        const angle = Math.atan2(run.player.y - enemy.y, run.player.x - enemy.x);
        circle(enemy.x, enemy.y + data.radius * 0.65, data.radius + 3, '#030a1666');
        ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(angle);
        if (enemy.entryDelay > 0) ctx.globalAlpha = 0.4;
        sprite(theme.sprites[enemy.kind], data.radius, data.elite ? '#b75466' : '#ae676e');
        if (hit) { ctx.globalAlpha = 0.85; ring(0, 0, data.radius + 2, '#fff4d9', 2); }
        ctx.restore();
        if (data.elite) {
          ctx.fillStyle = '#f1b37d'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(data.name, enemy.x, enemy.y - 32);
        }
        if (enemy.health < data.maxHealth) {
          ctx.fillStyle = '#1b2524'; ctx.fillRect(enemy.x - data.radius, enemy.y - data.radius - 8, data.radius * 2, 3);
          ctx.fillStyle = '#e6a091'; ctx.fillRect(enemy.x - data.radius, enemy.y - data.radius - 8, data.radius * 2 * enemy.health / data.maxHealth, 3);
        }
      }
      for (const gem of run.gems) {
        ctx.save(); ctx.translate(gem.x, gem.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = gem.amount > enemies.crawler.xp ? '#e6b1ff' : palette.gem;
        ctx.fillRect(-4, -4, 8, 8); ctx.restore();
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
      if (x !== lastX || y !== lastY) facing = Math.atan2(y - lastY, x - lastX);
      lastX = x; lastY = y;
      const light = ctx.createRadialGradient(x, y, 5, x, y, 90);
      light.addColorStop(0, palette.light + '22'); light.addColorStop(1, palette.light + '00');
      circle(x, y, 90, light);
      ring(x, y, 19, '#07101c', 3);
      ring(x, y, 19, palette.light, 1);
      if (run.player.shield > 0) ring(x, y, 23, palette.spark, 1.5);
      circle(x, y + 6, 13, '#09151370');
      ctx.save();
      ctx.translate(x, y); ctx.rotate(facing);
      sprite(theme.sprites.keeper, clearing.keeper.radius, palette.light);
      if (effects.some(effect => effect.type === 'player-hit' && run.elapsed - effect.at < visualTiming.hit)) {
        ring(0, 0, 16, '#ffffff', 3);
      }
      ctx.restore();

      // A steady lantern core remains readable at narrow viewport scales.
      circle(x, y, 5, '#fff0c0');
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
