import { clearing, enemies, weapons } from './content.ts';
import type { GameEvent, RunState } from './game.ts';
import type { Stick } from './browser/input.ts';
import { orbitPosition } from './weapons/halo.ts';
import type { Viewport } from './browser/viewport.ts';

export function createPresentation(ctx: CanvasRenderingContext2D) {
  let effects: Extract<GameEvent, { x: number }>[] = [];
  let facing = -Math.PI / 2;
  let lastX = clearing.arena.width / 2;
  let lastY = clearing.arena.height / 2;
  const { width, height } = clearing.arena;
  const palette = clearing.presentation.palette;

  function circle(x: number, y: number, radius: number, color: string | CanvasGradient) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    reset() { effects = []; facing = -Math.PI / 2; lastX = width / 2; lastY = height / 2; },
    consume(events: readonly GameEvent[]) {
      for (const event of events) if ('x' in event) effects.push(event);
    },
    draw(run: Readonly<RunState>, view: Viewport, cssWidth: number, cssHeight: number,
      ratio: number, stick: Stick | undefined) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      ctx.fillStyle = palette.floor;
      ctx.fillRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, 540);
      glow.addColorStop(0, '#44614455');
      glow.addColorStop(1, '#0c201c55');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Deterministic original ground marks. Decoration never changes collisions.
      for (let i = 0; i < 155; i++) {
        const x = (i * 157 + 29) % width;
        const y = (i * 239 + 53) % height;
        ctx.strokeStyle = i % 3 ? '#67806627' : '#91a17a32';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 3, y); ctx.lineTo(x, y - 5); ctx.lineTo(x + 2, y);
        ctx.stroke();
        if (i % 11 === 0) circle(x + 5, y + 3, 2, '#aaa77b50');
      }

      ctx.strokeStyle = '#9fa88222';
      ctx.lineWidth = 1;
      for (const radius of [67, 92]) {
        ctx.beginPath(); ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = palette.boundary;
      ctx.lineWidth = 3;
      ctx.strokeRect(-1.5, -1.5, width + 3, height + 3);
      ctx.strokeStyle = '#69806b33';
      ctx.strokeRect(-10, -10, width + 20, height + 20);
      for (let x = 24; x < width; x += 48) {
        circle(x, -24, 10 + x % 7, '#284039');
        circle(width - x, height + 25, 11 + x % 9, '#263d35');
      }
      for (let y = 24; y < height; y += 48) {
        circle(-25, y, 12, '#284039'); circle(width + 25, height - y, 13, '#263d35');
      }

      // Warnings are simulation-owned pending entries, not hittable enemies.
      for (const entry of [...run.entries, ...run.enemies.filter(enemy => enemy.entryDelay > 0).map(enemy => ({ ...enemy, remaining: enemy.entryDelay }))]) {
        const progress = 1 - entry.remaining / clearing.round.entryWarning;
        ctx.strokeStyle = '#f1b37d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(entry.x, entry.y, 19 + progress * 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(entry.x - 8, entry.y); ctx.lineTo(entry.x + 8, entry.y);
        ctx.moveTo(entry.x, entry.y - 8); ctx.lineTo(entry.x, entry.y + 8); ctx.stroke();
      }
      effects = effects.filter(effect => run.elapsed - effect.at < clearing.presentation.defeatEffect);
      for (const enemy of run.enemies) {
        const hit = effects.some(effect => effect.type === 'enemy-hit'
          && run.elapsed - effect.at < clearing.presentation.hitFlash
          && effect.enemyId === enemy.id);
        const data = enemies[enemy.kind];
        const angle = Math.atan2(run.player.y - enemy.y, run.player.x - enemy.x);
        ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(angle);
        if (enemy.entryDelay > 0) ctx.globalAlpha = 0.4;
        if (data.elite) ctx.scale(1.7, 1.7);
        circle(0, 4, 13, '#07151266');
        ctx.strokeStyle = hit ? '#ffe5cc' : '#c98c81'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (const side of [-1, 1]) {
          ctx.moveTo(-8, side * 7); ctx.lineTo(-13, side * 13); ctx.lineTo(-2, side * 11);
          ctx.moveTo(4, side * 6); ctx.lineTo(10, side * 12);
        }
        ctx.stroke(); circle(0, 0, 10, hit ? '#ffe5cc' : '#b37870');
        circle(5, -3, 2, '#382a2c'); circle(5, 3, 2, '#382a2c');
        ctx.restore();
        if (data.elite) {
          ctx.fillStyle = '#f1b37d'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(data.name, enemy.x, enemy.y - 32);
        }
        if (enemy.health < data.maxHealth) {
          ctx.fillStyle = '#1b2524'; ctx.fillRect(enemy.x - 11, enemy.y - 20, 22, 3);
          ctx.fillStyle = '#e6a091'; ctx.fillRect(enemy.x - 11, enemy.y - 20, 22 * enemy.health / data.maxHealth, 3);
        }
      }
      for (const gem of run.gems) {
        ctx.save(); ctx.translate(gem.x, gem.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = gem.amount > enemies.crawler.xp ? '#e6b1ff' : '#8cdbab';
        ctx.fillRect(-4, -4, 8, 8); ctx.restore();
      }
      for (const slot of run.loadout) if (weapons[slot.base].behavior === 'orbit') {
        const at = orbitPosition(run, slot);
        ctx.strokeStyle = '#efdb8b55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(run.player.x, run.player.y, weapons[slot.base].radius, 0, Math.PI * 2); ctx.stroke();
        circle(at.x, at.y, weapons[slot.base].hitRadius, '#efdb8b');
      }
      for (const projectile of run.projectiles) {
        ctx.strokeStyle = projectile.weapon === 'shard' ? '#c9b6ff' : '#99dcf0'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(projectile.x - projectile.dx * 12, projectile.y - projectile.dy * 12);
        ctx.lineTo(projectile.x, projectile.y); ctx.stroke();
        circle(projectile.x, projectile.y, weapons[projectile.weapon].hitRadius, projectile.chainLimit > 1 ? '#73f6ff' : projectile.weapon === 'shard' ? '#c9b6ff' : '#c3f1ff');
      }
      for (const effect of effects) {
        const age = run.elapsed - effect.at;
        const duration = effect.type === 'enemy-defeated' ? clearing.presentation.defeatEffect
          : effect.type === 'pulse' ? clearing.presentation.pulseFlash
          : effect.type === 'shot' ? clearing.presentation.shotFlash : clearing.presentation.hitFlash;
        if (age >= duration) continue;
        ctx.save(); ctx.globalAlpha = 1 - age / duration;
        ctx.strokeStyle = effect.type === 'player-hit' ? '#ff8a82'
          : effect.type === 'enemy-defeated' ? '#efbb9f' : '#c3f1ff';
        ctx.lineWidth = effect.type === 'player-hit' ? 4 : 2;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.type === 'pulse' ? effect.radius : 8 + age / duration * 21, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      const { x, y } = run.player;
      if (x !== lastX || y !== lastY) facing = Math.atan2(y - lastY, x - lastX);
      lastX = x; lastY = y;
      const light = ctx.createRadialGradient(x, y, 5, x, y, 90);
      light.addColorStop(0, '#f5d58b22'); light.addColorStop(1, '#f5d58b00');
      circle(x, y, 90, light);
      circle(x, y + 6, 13, '#09151370');
      ctx.save();
      ctx.translate(x, y); ctx.rotate(facing);
      ctx.fillStyle = '#b6b899';
      ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-7, -10); ctx.lineTo(-7, 10); ctx.closePath(); ctx.fill();
      circle(0, 0, clearing.keeper.radius, effects.some(effect => effect.type === 'player-hit'
        && run.elapsed - effect.at < clearing.presentation.hitFlash) ? '#ffffff' : palette.light);
      circle(3, 0, 4, '#fff0c0');
      ctx.restore();

      if (stick) {
        const dx = stick.tip.x - stick.origin.x;
        const dy = stick.tip.y - stick.origin.y;
        const divisor = Math.max(1, Math.hypot(dx, dy) / 42);
        ctx.strokeStyle = '#f5d58b88'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(stick.origin.x, stick.origin.y, 42, 0, Math.PI * 2); ctx.stroke();
        circle(stick.origin.x + dx / divisor, stick.origin.y + dy / divisor, 12, '#f5d58b99');
      }
    },
  };
}
