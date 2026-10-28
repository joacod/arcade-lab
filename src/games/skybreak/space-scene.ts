import type { FlightTheme } from './themes.ts';

const noise = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
/** Expensive nebula gradients and the planet are painted once per appearance. */
export function createSpaceScene(theme: FlightTheme) {
  const backdrop = document.createElement('canvas'); backdrop.width = 480; backdrop.height = 1100;
  const ctx = backdrop.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  const b = ctx, p = theme.palette, rift = theme.scene === 'rift';
  b.fillStyle = p.background; b.fillRect(0, 0, 480, 1100);
  for (let i = 0; i < 12; i++) {
    const x = noise(i + 10) * 700 - 110, y = noise(i + 20) * 1100;
    const glow = b.createRadialGradient(x, y, 0, x, y, 150 + noise(i) * 130);
    glow.addColorStop(0, `${i % 2 ? p.nebula : p.haze}88`); glow.addColorStop(1, `${p.background}00`);
    b.fillStyle = glow; b.fillRect(0, 0, 480, 1100);
  }
  // A distant planet stays off the central combat corridor.
  const x = rift ? 460 : 42, y = rift ? 245 : 210, radius = rift ? 145 : 182;
  const halo = b.createRadialGradient(x, y, radius - 4, x, y, radius + 24);
  halo.addColorStop(0, `${p.atmosphere}65`); halo.addColorStop(1, `${p.atmosphere}00`);
  b.fillStyle = halo; b.fillRect(0, 0, 480, 1100);
  b.save(); b.beginPath(); b.arc(x, y, radius, 0, Math.PI * 2); b.clip();
  const planet = b.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  planet.addColorStop(0, p.atmosphere); planet.addColorStop(0.28, p.planet); planet.addColorStop(0.85, p.background);
  b.fillStyle = planet; b.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  b.translate(x, y); b.rotate(-0.35);
  for (let i = 0; i < 22; i++) {
    b.fillStyle = i % 3 ? `${p.haze}66` : `${p.atmosphere}22`;
    b.beginPath(); b.ellipse(0, i * 18 - 190, radius * 1.1, 4 + noise(i) * 12, 0, 0, Math.PI * 2); b.fill();
  }
  b.restore();
  b.strokeStyle = `${p.atmosphere}20`; b.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    b.beginPath(); b.ellipse(x, y, radius + 38 + i * 22, radius * 0.32 + i * 12, -0.35, 0, Math.PI * 2); b.stroke();
  }
  return {
    draw(c: CanvasRenderingContext2D, time: number) {
      c.drawImage(backdrop, 0, -Math.sin(time * 0.014) * 22 - 30);
      for (let i = 0; i < 145; i++) {
        const depth = i % 3, speed = [7, 17, 34][depth]!;
        const x = noise(i + 100) * 480, y = (noise(i + 500) * 860 + time * speed) % 860 - 30;
        c.fillStyle = depth === 2 ? '#e0f0ff99' : `${p.atmosphere}55`;
        c.fillRect(x, y, depth === 2 ? 1.7 : 1, depth === 2 ? 3.5 : 1);
      }
      if (rift) {
        for (let i = 0; i < 10; i++) {
          const x = noise(i + 30) * 480, y = (i * 137 + time * 24) % 1200 - 180;
          c.save(); c.translate(x, y); c.rotate(i * 1.2 + time * 0.015);
          c.beginPath();
          for (let j = 0; j < 7; j++) {
            const angle = j / 7 * Math.PI * 2, r = 8 + noise(i * 10 + j) * 12;
            if (j) c.lineTo(Math.cos(angle) * r, Math.sin(angle) * r); else c.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          c.closePath(); c.fillStyle = '#392835'; c.fill(); c.strokeStyle = '#b4796c44'; c.stroke();
          c.beginPath(); c.moveTo(-4, -10); c.lineTo(7, -3); c.lineTo(3, 8); c.stroke(); c.restore();
        }
      } else {
        // Orbital stations pass at the edges, never masquerading as targets.
        for (let i = 0; i < 2; i++) {
          const x = i ? 460 : 12, y = (i * 620 + time * 13) % 1400 - 200;
          c.save(); c.translate(x, y); c.rotate(i ? -0.4 : 0.3); c.globalAlpha = 0.45;
          c.strokeStyle = '#7386a0'; c.fillStyle = '#182a43'; c.lineWidth = 2;
          c.beginPath(); c.arc(0, 0, 66, 0, Math.PI * 2); c.stroke();
          c.fillRect(-11, -90, 22, 180); c.strokeRect(-11, -90, 22, 180);
          for (const side of [-1, 1]) {
            c.fillStyle = '#243c5b'; c.fillRect(side * 48 - 16, -44, 32, 88);
            c.strokeStyle = '#6c9bc066';
            for (let n = -32; n <= 32; n += 16) { c.beginPath(); c.moveTo(side * 48 - 14, n); c.lineTo(side * 48 + 14, n); c.stroke(); }
          }
          c.restore();
        }
      }
    },
    dispose() { backdrop.width = backdrop.height = 1; },
  };
}
