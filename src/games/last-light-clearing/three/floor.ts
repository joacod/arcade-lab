/** Original, deterministic garden paving. Cached once per presentation, never run randomness. */
export function createGardenFloor(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(1.6, 1.6);
  let seed = 713;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  ctx.fillStyle = '#152d32'; ctx.fillRect(0, 0, 960, 640);
  // Broad worn slabs, with bevels and hairline cracks rather than high-frequency noise.
  for (let row = -1; row < 12; row++) for (let col = -1; col < 13; col++) {
    const x = col * 86 + (row % 2) * 43, y = row * 62;
    const light = 17 + random() * 5;
    ctx.fillStyle = `hsl(184 22% ${light}%)`;
    ctx.beginPath(); ctx.roundRect(x + 1, y + 1, 83, 59, 5); ctx.fill();
    ctx.strokeStyle = '#57736c38'; ctx.lineWidth = 0.8; ctx.stroke();
    if (random() > 0.45) {
      ctx.strokeStyle = '#0b22286b'; ctx.beginPath(); ctx.moveTo(x + 12, y + 1);
      ctx.lineTo(x + 21, y + 15); ctx.lineTo(x + 17, y + 24); ctx.stroke();
    }
  }
  // Low-contrast root networks and botanical rosettes stay flat and traversable.
  for (let i = 0; i < 38; i++) {
    const x = random() * 960, y = random() * 640, angle = random() * Math.PI * 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const shade = ctx.createRadialGradient(0, 0, 3, 0, 0, 54);
    shade.addColorStop(0, '#3d74624a'); shade.addColorStop(1, '#18353800');
    ctx.fillStyle = shade; ctx.fillRect(-54, -54, 108, 108);
    ctx.strokeStyle = '#4e8d7e45'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-65, 16); ctx.bezierCurveTo(-32, -25, 22, 28, 72, -18); ctx.stroke();
    for (let j = 0; j < 7; j++) {
      ctx.save(); ctx.rotate(j * Math.PI * 2 / 7);
      ctx.fillStyle = j % 2 ? '#416e6448' : '#6b8d7040';
      ctx.beginPath(); ctx.ellipse(12, 0, 12, 3.2, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  const shade = ctx.createRadialGradient(480, 320, 60, 480, 320, 550);
  shade.addColorStop(0, '#80b5a019'); shade.addColorStop(0.65, '#0b18221a'); shade.addColorStop(1, '#080f2466');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, 960, 640);
  // An astrolabe-like sanctuary seal: broken gold rings, petals and radial runes.
  ctx.save(); ctx.translate(480, 320);
  for (const radius of [72, 80, 139, 145, 221]) {
    ctx.strokeStyle = radius < 150 ? '#a99b6855' : '#819c7b23'; ctx.lineWidth = radius === 139 ? 2 : 0.7;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 48; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 24);
    ctx.strokeStyle = '#c7b98660'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(147, 0); ctx.lineTo(i % 4 ? 151 : 159, 0); ctx.stroke();
    if (i % 4 === 0) {
      ctx.strokeStyle = '#83a79535'; ctx.beginPath(); ctx.ellipse(108, 0, 27, 8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  return canvas;
}
