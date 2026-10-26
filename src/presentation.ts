import { clearing } from './content.ts';
import type { RunState } from './game.ts';
import type { Stick } from './browser/input.ts';
import type { Viewport } from './browser/viewport.ts';

export function createPresentation(ctx: CanvasRenderingContext2D) {
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
    reset() { facing = -Math.PI / 2; lastX = width / 2; lastY = height / 2; },
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
      circle(0, 0, clearing.keeper.radius, palette.light);
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
