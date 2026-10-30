import { movement as m, type LevelId, type Rect, type Vent } from './content.ts';
import type { Player } from './game.ts';
import type { KeeperPose } from './animation.ts';
import type { HollowView } from './presentation.ts';
import { themes } from './themes.ts';

const TAU = Math.PI * 2;
const district = {
  aqueduct: { ...themes.quality.districts.aqueduct, copper: '#af8559' },
  emberworks: { ...themes.quality.districts.emberworks, copper: '#c18b64' },
  belfry: { ...themes.quality.districts.belfry, copper: '#b9a279' },
} as const;

/** Original code-native copper, mineral and glass artwork. The session owns its lifetime. */
export function createLumenDrawing(context: CanvasRenderingContext2D) {
  let c = context;
  let tiles: HTMLCanvasElement[] = [], cachedDistrict: LevelId | undefined;
  function gradient(x: number, y: number, w: number, h: number, colors: readonly string[]) {
    const g = c.createLinearGradient(x, y, x + w, y + h);
    colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
    return g;
  }
  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient, radius = 0) {
    c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, w, h, radius); c.fill();
  }
  function ellipse(x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
    c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
  }
  function line(x: number, y: number, xx: number, yy: number, color: string, width = 1) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke();
  }
  function ring(x: number, y: number, r: number, color: string, width = 1) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  }
  function light(x: number, y: number, r: number, color: string, opacity = '50') {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color + opacity); g.addColorStop(1, color + '00');
    ellipse(x, y, r, r, g);
  }
  function leaf(x: number, y: number, length: number, angle: number, color: string) {
    c.save(); c.translate(x, y); c.rotate(angle);
    c.fillStyle = gradient(0, -length / 3, 0, length * .6, [color, '#102e33']);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(length * .35, -length * .45, length * .85, -length * .3, length, 0);
    c.bezierCurveTo(length * .7, length * .2, length * .2, length * .3, 0, 0); c.fill();
    line(0, 0, length * .86, 0, '#a0cc9d30'); c.restore();
  }
  function fern(x: number, y: number, length: number, flip = 1) {
    c.save(); c.translate(x, y); c.scale(flip, 1);
    c.strokeStyle = '#6e9b7b'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(5, -length * .6, length * .35, -length); c.stroke();
    for (let j = 1; j < 9; j++) {
      const t = j / 9, xx = length * .35 * t * t, yy = -length * t, size = length * .28 * (1 - t) + 2;
      leaf(xx, yy, size, -.3, '#568d79'); leaf(xx, yy, size * .8, -2.5, '#407268');
    }
    c.restore();
  }
  function wheel(x: number, y: number, radius: number, time: number, color: string) {
    c.save(); c.translate(x, y); c.rotate(time);
    ring(0, 0, radius, '#0a202b', 22); ring(0, 0, radius, color, 12); ring(0, 0, radius - 14, color, 2);
    ring(0, 0, radius * .57, color, 3);
    for (let i = 0; i < 16; i++) {
      c.save(); c.rotate(i * TAU / 16);
      box(radius - 13, -7, 26, 14, color, 2);
      box(radius - 8, -5, 19, 3, '#b9c5a755', 1);
      line(14, 0, radius - 14, 0, color, 5);
      line(radius * .57, 2, radius * .82, 23, color, 2); c.restore();
    }
    for (let i = 0; i < 64; i++) {
      const a = i * TAU / 64;
      ellipse(Math.cos(a) * (radius - 2), Math.sin(a) * (radius - 2), 1.7, 1.7, '#c4c2a388');
    }
    ellipse(0, 0, 20, 20, '#102832'); ring(0, 0, 17, color, 4); ellipse(-3, -3, 5, 5, '#9bc3ac');
    c.restore();
  }
  function arch(x: number, y: number, w: number, h: number, color: string, width: number) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath();
    c.moveTo(x, y + h); c.lineTo(x, y + w * .5);
    c.bezierCurveTo(x, y + w * .2, x + w * .28, y + w * .09, x + w * .5, y);
    c.bezierCurveTo(x + w * .72, y + w * .09, x + w, y + w * .2, x + w, y + w * .5);
    c.lineTo(x + w, y + h); c.stroke();
  }
  function releaseTiles() { for (const tile of tiles) tile.width = tile.height = 1; tiles = []; cachedDistrict = undefined; }
  function architecture(id: LevelId) {
    if (cachedDistrict === id) return;
    releaseTiles();
    const p = district[id];
    try {
      for (let layer = 0; layer < 2; layer++) {
        const tile = document.createElement('canvas'); tile.width = 1024; tile.height = 900; tiles.push(tile);
        const ctx = tile.getContext('2d'); if (!ctx) throw new Error('Lumen architecture could not be drawn.');
        c = ctx;
        if (layer === 0) {
          for (let i = 0; i < 5; i++) {
            const x = i * 236 - 80, top = 100 + i % 3 * 67;
            box(x, top, 164, 800, gradient(x, top, 164, 0, ['#102a36', p.middle, '#152d3a']));
            arch(x + 22, top + 35, 120, 740, p.deep, 18);
            for (let j = 0; j < 5; j++) line(x, top + 100 + j * 120, x + 164, top + 100 + j * 120, p.deep, 3);
            for (let j = 0; j < 4; j++) {
              arch(x + 50, top + 75 + j * 146, 64, 102, p.light + '25', 2);
              line(x + 82, top + 85 + j * 146, x + 82, top + 174 + j * 146, p.light + '18', 1);
            }
            if (id === 'belfry') { line(x + 82, top - 60, x + 82, top, p.copper, 2); ellipse(x + 82, top - 65, 4, 4, p.copper); }
          }
        } else {
          for (let i = 0; i < 2; i++) {
            const x = i * 512 + 30;
            arch(x, 35, 452, 900, p.deep, 42);
            arch(x - 18, 18, 488, 900, '#55757755', 3);
            arch(x + 12, 51, 428, 900, p.copper + '55', 2);
            // Crown voussoirs and inset tracery belong to the quiet middle layer.
            for (let j = 0; j < 15; j++) {
              const a = Math.PI + j * Math.PI / 14, xx = x + 226 + Math.cos(a) * 222, yy = 255 + Math.sin(a) * 207;
              line(xx, yy, xx + Math.cos(a) * 18, yy + Math.sin(a) * 18, p.copper + '44', 2);
            }
            for (const xx of [x, x + 452]) {
              box(xx - 20, 340, 40, 560, gradient(xx - 20, 0, 40, 0, [p.deep, p.stone, p.deep]));
              for (let j = 0; j < 6; j++) box(xx - 25, 370 + j * 94, 50, 7, '#77908a44', 2);
              line(xx - 7, 345, xx - 7, 900, '#b5c5ad20', 2);
              line(xx + 9, 345, xx + 9, 900, '#020f1d66', 2);
            }
            if (id === 'aqueduct') { fern(x + 20, 505, 150); fern(x + 435, 380, 110, -1); }
            if (id === 'emberworks') {
              box(x + 135, 240, 160, 460, gradient(x + 135, 0, 160, 0, ['#242834', '#72554f', '#262633']), 70);
              for (let j = 0; j < 4; j++) {
                box(x + 128, 290 + j * 92, 174, 14, '#262633', 4); line(x + 137, 291 + j * 92, x + 291, 291 + j * 92, '#a7806555', 2);
              }
              ellipse(x + 215, 375, 42, 42, '#241f2b'); ring(x + 215, 375, 47, '#9e765a', 6);
              light(x + 215, 375, 95, '#f4a66d', '38');
              for (let j = -2; j <= 2; j++) line(x + 185, 375 + j * 11, x + 245, 375 + j * 11, '#d6a27677', 2);
              line(x + 80, 160, x + 80, 900, '#604d48', 20); line(x + 75, 160, x + 75, 900, '#aa7d5a55', 3);
            }
            if (id === 'belfry') {
              const wx = x + 226, wy = 290;
              light(wx, wy, 190, '#9aabd6', '20'); ellipse(wx, wy, 132, 132, '#1e3049');
              for (let j = 0; j < 12; j++) {
                c.save(); c.translate(wx, wy); c.rotate(j * TAU / 12);
                c.fillStyle = j % 2 ? '#66808c77' : '#8d769266'; c.beginPath(); c.moveTo(10, 0); c.lineTo(106, -23); c.quadraticCurveTo(146, 0, 106, 23); c.closePath(); c.fill();
                line(0, 0, 128, 0, '#a69b7d88', 2); c.restore();
              }
              ring(wx, wy, 135, '#968b7399', 6); ring(wx, wy, 116, '#968b7355', 2); ring(wx, wy, 35, '#c7b39299', 3);
            }
          }
        }
        // Deterministic mineral grain is baked once, rather than regenerated per frame.
        for (let j = 0; j < 1800; j++) {
          const x = (j * 157.37) % 1024, y = (j * 83.13) % 900;
          box(x, y, j % 3 === 0 ? 2 : 1, 1, j % 2 ? '#b7d3bd09' : '#020e1b12');
        }
      }
      cachedDistrict = id;
    } catch (error) { releaseTiles(); throw error; }
    finally { c = context; }
  }
  return {
    scenery(view: HollowView, id: LevelId, time: number, reduced: boolean) {
      architecture(id); const p = district[id], { width: w, height: h } = view;
      box(0, 0, w, h, gradient(0, 0, w * .15, h, [p.sky, p.middle, p.deep]));
      // The light source and distant silhouettes stay behind every physical surface.
      const moonX = w * .78 - view.x * .015;
      light(moonX, 135, 330, p.light, '25'); ellipse(moonX, 135, id === 'belfry' ? 45 : 31, id === 'belfry' ? 45 : 31, '#d6e3cf');
      ellipse(moonX + 11, 127, 30, 30, p.sky);
      for (let i = 0; i < 55; i++) {
        const x = ((i * 131.3 - view.x * .035) % w + w) % w, y = (i * 67.1) % (h * .65);
        ellipse(x, y, i % 9 === 0 ? 1.6 : .7, i % 9 === 0 ? 1.6 : .7, '#d3e3db66');
      }
      for (let layer = 0; layer < 2; layer++) {
        const factor = layer === 0 ? .12 : .32, offset = view.x * factor;
        c.globalAlpha = layer === 0 ? .32 : .64;
        for (let i = Math.floor(offset / 1024); i <= Math.ceil((offset + w) / 1024); i++) c.drawImage(tiles[layer]!, i * 1024 - offset, 20 - view.y * factor, 1024, 900);
        c.globalAlpha = 1;
      }
      if (id === 'aqueduct') {
        const offset = view.x * .24;
        for (let i = Math.floor((offset - 350) / 1350); i <= Math.ceil((offset + w) / 1350); i++) {
          const x = i * 1350 + 600 - offset, y = 395 - view.y * .24;
          c.globalAlpha = .5; wheel(x, y, 205, reduced ? 0 : time * .035, '#718478'); c.globalAlpha = 1;
          light(x, y, 150, p.light, '18');
          // A thin spillway is scenery, never a bright false landing ledge.
          box(x + 184, y - 60, 12, 580, gradient(0, y - 60, 0, 580, ['#a6d9d030', '#a6d9d000']));
        }
      }
      // Broad shafts and a low mist unite layers without covering collision cues.
      c.fillStyle = '#d8e5cb08'; c.beginPath(); c.moveTo(w * .64, 0); c.lineTo(w * .74, 0); c.lineTo(w * .48, h); c.lineTo(w * .06, h); c.fill();
      box(0, h * .73, w, h * .27, gradient(0, h * .73, 0, h * .27, [p.deep + '00', p.deep + 'cc']));
      for (let i = 0; i < 28; i++) {
        const x = ((i * 157 - view.x * .55) % w + w) % w;
        const y = (i * 97.3) % h + (reduced ? 0 : Math.sin(time * .35 + i) * 9);
        ellipse(x, y, 1.1, 1.1, p.light + '66');
      }
      // Hanging botanical silhouettes frame the roof, above the route and its warnings.
      for (let i = Math.floor(view.x * .5 / 600); i <= Math.ceil((view.x * .5 + w) / 600); i++) {
        const x = i * 600 - view.x * .5;
        c.globalAlpha = .72;
        for (let j = 0; j < 7; j++) leaf(x + j * 28, -14 + Math.sin(j) * 13, 58 - j * 3, .65 + j * .16, '#123c3e');
        c.globalAlpha = 1;
      }
    },
    stone(s: Rect, id: LevelId, index: number, view: HollowView) {
      const p = district[id], bottom = Math.min(s.y + s.h, view.y + view.height + 10);
      c.save(); c.beginPath(); c.rect(s.x, s.y, s.w, bottom - s.y); c.clip();
      box(s.x, s.y, s.w, s.h, gradient(s.x, s.y, 0, Math.min(s.h, 260), [p.stone, p.deep]));
      const left = Math.max(s.x, view.x - 90), right = Math.min(s.x + s.w, view.x + view.width + 90);
      for (let row = 0; row < Math.min(10, s.h / 52); row++) {
        const y = s.y + 25 + row * 52;
        if (y < view.y - 55 || y > bottom) continue;
        line(left, y, right, y, '#040f1c88', 2); line(left, y + 2, right, y + 2, '#9bb3a518');
        const offset = row % 2 * 52;
        for (let x = s.x + Math.floor((left - s.x) / 104) * 104 + offset; x < right; x += 104) {
          line(x, y, x, y + 52, '#051a2677', 2);
          line(x + 6, y + 5, x + 97, y + 5, '#9fb5a412');
          line(x + 98, y + 6, x + 98, y + 46, '#020b1744');
          for (let j = 0; j < 5; j++) {
            const xx = x + 12 + (j * 19 + row * 7) % 82, yy = y + 10 + (j * 13 + index * 3) % 33;
            line(xx, yy, xx + 2 + j % 3, yy, '#adc9b21b');
          }
          // Sparse inset ceramic diamonds and copper pins sit below the landing band.
          if ((row + index) % 3 === 0) {
            c.save(); c.translate(x + 52, y + 24); c.rotate(Math.PI / 4);
            box(-10, -10, 20, 20, '#061c29', 2); box(-7, -7, 14, 14, p.copper + '66', 1); box(-3, -3, 6, 6, p.light + '55'); c.restore();
          }
        }
      }
      box(s.x, s.y + 3, s.w, Math.min(17, s.h - 3), gradient(0, s.y + 3, 0, 16, [p.copper, '#483c36', '#8a7758']));
      for (let x = s.x + Math.max(0, Math.floor((left - s.x) / 40)) * 40 + 10; x < right; x += 40) {
        ellipse(x, s.y + 10, 2.3, 2.3, '#10232b'); ellipse(x - .5, s.y + 9, 1, 1, '#f1d5a7');
      }
      box(s.x + 2, s.y, s.w - 4, 3, p.edge); box(s.x, s.y + 3, 3, s.h, '#b2c5af55'); box(s.x + s.w - 4, s.y + 3, 4, s.h, '#030f1b88');
      c.restore();
      if (s.h <= 30) {
        // Under-slung brackets never extend the apparent horizontal landing surface.
        for (const x of [s.x + 14, s.x + s.w - 14]) {
          line(x, s.y + s.h, x, s.y + s.h + 14, '#9b8d6c', 3); line(x, s.y + s.h + 14, s.x + s.w / 2, s.y + s.h + 30, '#476966', 2);
        }
        ellipse(s.x + s.w / 2, s.y + s.h + 31, 4, 4, p.light);
      } else if (index % 3 === 0) {
        fern(s.x + s.w - 8, s.y + 65, 58, -1);
        fern(s.x + 10, s.y + 85, 67);
      }
    },
    keeper(p: Pick<Player, 'x' | 'y' | 'vx' | 'vy' | 'facing' | 'grounded'>, pose: KeeperPose, defeated: boolean, time: number, reduced: boolean, landing: number) {
      const stride = reduced || !p.grounded ? 0 : pose.stride, bob = reduced ? 0 : pose.bob * 1.3;
      c.save(); c.translate(p.x + m.width / 2, p.y + m.height);
      const squash = reduced ? 0 : landing * .12;
      c.scale(p.facing * (1 + squash), 1 - squash); if (defeated) c.rotate(-.4);
      const metal = gradient(-17, 0, 34, 0, ['#725e4f', '#efd5a0', '#ae8b5b', '#5a5149']);
      const spread = p.grounded ? stride * 7 : p.vy < 0 ? 7 : -4;
      for (const side of [-1, 1]) {
        const hip = side * 6, knee = side * 7 + side * spread * .6, foot = side * 7 + side * spread;
        line(hip, -17, knee, -9, '#172e36', 7); line(hip, -17, knee, -9, '#c7ad7e', 3);
        ellipse(knee, -9, 3, 3, '#ead8b1'); line(knee, -9, foot, -3, '#bda477', 4);
        box(foot - 5, -4, 11, 4, '#d2b47a', 2); line(foot - 4, -4, foot + 5, -4, '#fff0c6');
      }
      c.translate(reduced ? 0 : pose.lean * p.facing * 2, -bob);
      // A silk silhouette communicates direction without moving the physical body.
      c.fillStyle = gradient(-34, -39, 34, 16, ['#9b6147', '#e9b466']); c.beginPath(); c.moveTo(-9, -35);
      c.bezierCurveTo(-22, -36, -25, -28, -37 - Math.abs(p.vx) * .015, -31 + (reduced ? 0 : Math.sin(time * 9) * 3));
      c.lineTo(-30, -24); c.quadraticCurveTo(-19, -28, -8, -29); c.closePath(); c.fill();
      box(-12, -32, 24, 19, '#09252e', 7); box(-11, -32, 22, 18, metal, 6);
      ellipse(0, -23, 7.5, 7.5, '#183c41'); ring(0, -23, 6, '#e2c58a', 1.5);
      light(0, -23, 19, '#b3f1d3', '70'); ellipse(0, -23, 3.4, 4.6, '#b6f1d2'); ellipse(-1, -24, 1, 2, '#f1fff0');
      for (const side of [-1, 1]) {
        const reach = p.grounded ? 15 : 19, handY = p.grounded ? -18 + stride * side * 5 : p.vy < 0 ? -37 : -23;
        ellipse(side * 12, -28, 3.6, 3.6, '#d6bf94');
        line(side * 12, -27, side * reach, handY, '#243d40', 6); line(side * 12, -27, side * reach, handY, '#c4a574', 3);
        ellipse(side * reach, handY, 3, 3, '#e1cb9f');
      }
      box(-15, -53, 31, 23, '#091e2a', 11); box(-14, -53, 29, 22, metal, 10);
      c.fillStyle = gradient(-12, -48, 25, 12, ['#27515b', '#102c38', '#071b2b']);
      c.beginPath(); c.roundRect(-11, -47, 25, 12, 6); c.fill();
      line(-7, -45, 7, -45, '#9ec8c766', 1.5);
      for (const x of [1, 9]) { light(x, -40, 8, '#b8f6d8', '55'); ellipse(x, -40, 1.7, 2.5, '#d4ffe4'); }
      line(-8, -51, 7, -51, '#fff0c0', 1.5); ellipse(-13, -40, 2.2, 3.4, '#907c60');
      line(-4, -53, -5, -60, '#d1b77e', 2); ellipse(-5, -61, 3, 3, '#c8e3bd');
      box(-12, -33, 26, 4, '#e3af67', 2); c.restore();
    },
    beetle(x: number, y: number, direction: number, alive: boolean, time: number, reduced: boolean) {
      c.save(); c.translate(x, y); c.scale(direction, alive ? 1 : .26);
      const stride = !alive || reduced ? 0 : Math.sin(time * 16) * 3;
      for (let j = -1; j <= 1; j++) {
        line(j * 11, -10, j * 12 - 4, -5, '#b89d75', 3); line(j * 12 - 4, -5, j * 12 - 6, -1 + stride * (j % 2 ? 1 : -1), '#dfc797', 2);
      }
      ellipse(0, -13, 19, 12, gradient(-19, -25, 35, 25, alive ? ['#e7b88b', '#a46958', '#4e3b41'] : ['#898176', '#46454a']));
      ring(-3, -14, 7, '#684c44', 2); line(-8, -19, 2, -9, '#e2b88b', 2);
      box(-12, -26, 23, 4, '#ffdfb4', 2); ellipse(13, -15, 5, 7, '#233843'); ellipse(15, -17, 1.8, 2, '#ffcca3');
      line(17, -19, 21, -25, '#d8b28b', 1.5); ellipse(21, -25, 1.5, 1.5, '#f6d7aa'); c.restore();
    },
    checkpoint(x: number, y: number, lit: boolean) {
      line(x, y + m.height, x, y - 28, '#292f32', 8); line(x - 2, y + m.height, x - 2, y - 28, '#b99c70', 2);
      light(x, y - 27, lit ? 105 : 40, lit ? '#aee7cb' : '#e4c593', lit ? '60' : '25');
      box(x - 13, y - 48, 26, 33, gradient(x - 13, 0, 26, 0, ['#6e6956', '#e5c78d', '#807052']), 6);
      box(x - 9, y - 44, 18, 23, gradient(0, y - 44, 0, 23, lit ? ['#e4ffdb', '#84d0bb', '#477e7a'] : ['#5a6d67', '#233b43']), 4);
      for (const xx of [-4, 4]) line(x + xx, y - 44, x + xx, y - 21, '#c5ac7c', 1.5);
      ellipse(x, y - 14, 18, 3, '#ac916a'); line(x - 18, y - 49, x, y - 59, '#d2b681', 3); line(x, y - 59, x + 18, y - 49, '#d2b681', 3);
      ring(x, y - 62, 4, '#c3aa79', 2);
    },
    vent(vent: Vent, color: string) {
      const y = vent.y + vent.h;
      box(vent.x - 8, y - 8, vent.w + 16, 17, gradient(0, y - 8, 0, 17, ['#e5c493', '#85735a', '#263842']), 3);
      box(vent.x + 2, y - 6, vent.w - 4, 9, '#112831', 2);
      for (let x = vent.x + 6; x < vent.x + vent.w; x += 10) line(x, y - 5, x + 3, y + 2, '#bba77b', 2);
      for (const x of [vent.x - 4, vent.x + vent.w + 4]) {
        ellipse(x, y - 1, 2.5, 2.5, '#2a3438'); ellipse(x - .5, y - 2, 1, 1, '#f1d8a5');
      }
      box(vent.x + vent.w / 2 - 9, y + 4, 18, 4, color, 1);
    },
    thorns(s: Rect) {
      box(s.x - 2, s.y + s.h - 4, s.w + 4, 5, '#442f39');
      const count = Math.ceil(s.w / 15), width = s.w / count;
      for (let i = 0; i < count; i++) {
        const x = s.x + i * width;
        c.fillStyle = gradient(x, s.y, width, s.h, ['#ffe0b9', '#ed9f8b', '#784c50']); c.beginPath();
        c.moveTo(x, s.y + s.h); c.lineTo(x + width * .5, s.y); c.lineTo(x + width, s.y + s.h); c.closePath(); c.fill();
        line(x + width * .5, s.y + 2, x + width * .58, s.y + s.h - 2, '#6c414b', 1);
      }
    },
    bell(goal: Rect, awake: boolean, time: number, reduced: boolean) {
      const x = goal.x + goal.w / 2, bottom = goal.y + goal.h;
      for (const xx of [x - 59, x + 59]) {
        box(xx - 8, goal.y - 64, 16, bottom - goal.y + 64, gradient(xx - 8, 0, 16, 0, ['#364d4d', '#b5ae85', '#304345']), 3);
        for (let j = 0; j < 5; j++) box(xx - 11, goal.y - 30 + j * 36, 22, 5, '#8b8466', 2);
      }
      arch(x - 59, goal.y - 119, 118, 85, '#c5b487', 9); arch(x - 48, goal.y - 106, 96, 70, '#667c70', 2);
      light(x, goal.y + 20, awake ? 230 : 110, '#edce8b', awake ? '65' : '35');
      c.save(); c.translate(x, goal.y - 60); if (awake && !reduced) c.rotate(Math.sin(time * 5) * .18);
      line(0, -24, 0, 20, '#c8b288', 3); ring(0, 17, 9, '#e3c78c', 3);
      c.fillStyle = gradient(-37, 0, 74, 0, ['#69594b', '#d5b47a', '#ffe4a7', '#b18b58', '#5d5146']);
      c.beginPath(); c.moveTo(-37, 83); c.bezierCurveTo(-20, 65, -23, 52, -22, 39); c.bezierCurveTo(-20, 10, 20, 10, 22, 39); c.bezierCurveTo(23, 52, 20, 65, 37, 83); c.closePath(); c.fill();
      ellipse(0, 83, 38, 7, '#6c5542'); ellipse(0, 81, 36, 4, '#f0d49a');
      ring(0, 49, 12, '#806c4c', 2); line(-6, 49, 6, 49, '#ead6a0', 2); line(0, 43, 0, 55, '#ead6a0', 2);
      line(-22, 65, 22, 65, '#816949', 2); line(-23, 68, 23, 68, '#ead2a0', 1); ellipse(0, 91, 6, 8, '#dbc492'); c.restore();
      fern(x + 67, bottom, 84, -1);
    },
    mote(x: number, y: number) {
      light(x, y, 32, '#f4d79c', '35'); c.save(); c.translate(x, y);
      c.fillStyle = gradient(-7, -10, 14, 20, ['#fff6c6', '#d6ad65', '#6f6b57']); c.beginPath(); c.moveTo(0, -10); c.lineTo(7, 0); c.lineTo(0, 10); c.lineTo(-7, 0); c.closePath(); c.fill();
      line(0, -8, 0, 8, '#fff2c2', 1); c.restore();
    },
    dispose: releaseTiles,
  };
}
export type LumenDrawing = ReturnType<typeof createLumenDrawing>;
export type LumenDrawingFactory = typeof createLumenDrawing;
