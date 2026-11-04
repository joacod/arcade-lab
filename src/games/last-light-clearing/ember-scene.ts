import { clipFrame, type ArtPack, type Decoration } from './art-pack.ts';
import { clearing } from './content.ts';
import type { RunState } from './game-state.ts';
import type { ImageBundle } from '../../engine/browser/images.ts';

/** Quality's cached scenery and light stamps. All coordinates remain cosmetic world units. */
export function createEmberScene(images: ImageBundle, environment: NonNullable<ArtPack['environment']>) {
  const { width, height } = clearing.arena;
  const margin = 96;
  const floor = document.createElement('canvas');
  floor.width = width + margin * 2; floor.height = height + margin * 2;
  const context = floor.getContext('2d');
  if (!context) throw new Error('Canvas 2D is required for Ember Ruins.');
  const ctx = context;
  ctx.translate(margin, margin);
  ctx.fillStyle = '#11191c'; ctx.fillRect(-margin, -margin, floor.width, floor.height);
  // Cosmetic variation never consumes the run's random state.
  const noise = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const plate = environment.plate!;
  const source = images[plate.image];
  const [sx, sy, sw, sh] = plate.rect;
  ctx.drawImage(source!, sx, sy, sw, sh, -margin, -margin, width + margin * 2, height + margin * 2);
  // Gentle grading keeps the ground below the sprite and warning values.
  ctx.fillStyle = '#07121930'; ctx.fillRect(-margin, -margin, width + margin * 2, height + margin * 2);
  // The ground continues naturally outside the arena; matching props mark the perimeter.
  const props: { art: Decoration; x: number; y: number; fire: boolean }[] = [];
  for (let i = 0; i < 6; i++) {
    const art = environment.perimeter[i % 3]!;
    const [w, h] = art.footprint;
    props.push({ art, x: 70 + i * 164, y: -6 - h * (1 - art.anchor[1]), fire: i % 3 === 2 });
    props.push({ art, x: width - 70 - i * 164, y: height + 6 + h * art.anchor[1], fire: i % 3 === 2 });
    if (i < 4) {
      props.push({ art, x: -6 - w * (1 - art.anchor[0]), y: 75 + i * 164, fire: i % 3 === 2 });
      props.push({ art, x: width + 6 + w * art.anchor[0], y: height - 75 - i * 164, fire: i % 3 === 2 });
    }
  }
  for (const { art, x, y } of props) {
    const { image, rect: [x0, y0, w0, h0] } = clipFrame(art.clip, 0);
    const [w, h] = art.footprint;
    ctx.drawImage(images[image]!, x0, y0, w0, h0, x - w * art.anchor[0], y - h * art.anchor[1], w, h);
  }
  // Low stone-colored corner cuts communicate the physical edge without a gold frame.
  ctx.strokeStyle = '#b2b5a938'; ctx.lineWidth = 2;
  for (const x of [0, width]) for (const y of [0, height]) {
    ctx.beginPath(); ctx.moveTo(x, y + (y ? -22 : 22)); ctx.lineTo(x, y);
    ctx.lineTo(x + (x ? -22 : 22), y); ctx.stroke();
  }

  const shadow = document.createElement('canvas'); shadow.width = shadow.height = 64;
  const shadowContext = shadow.getContext('2d')!;
  const shade = shadowContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  shade.addColorStop(0, '#02080bc0'); shade.addColorStop(.4, '#02080b70'); shade.addColorStop(1, '#02080b00');
  shadowContext.fillStyle = shade; shadowContext.fillRect(0, 0, 64, 64);
  const lights = new Map<string, HTMLCanvasElement>();
  function light(target: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, opacity = 1) {
    let stamp = lights.get(color);
    if (!stamp) {
      stamp = document.createElement('canvas'); stamp.width = stamp.height = 128;
      const c = stamp.getContext('2d')!;
      const gradient = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, `${color}70`); gradient.addColorStop(.22, `${color}24`); gradient.addColorStop(1, `${color}00`);
      c.fillStyle = gradient; c.fillRect(0, 0, 128, 128); lights.set(color, stamp);
    }
    target.save(); target.globalCompositeOperation = 'screen'; target.globalAlpha *= opacity;
    target.drawImage(stamp, x - radius, y - radius, radius * 2, radius * 2); target.restore();
  }
  return {
    ground(target: CanvasRenderingContext2D, time: number) {
      target.drawImage(floor, -margin, -margin);
      for (const prop of props) if (prop.fire) {
        light(target, prop.x, prop.y - prop.art.footprint[1] * .55, 145, '#ffb45f', .8 + Math.sin(time * 3 + prop.x) * .07);
      }
    },
    atmosphere(target: CanvasRenderingContext2D, run: Readonly<RunState>, reduced: boolean) {
      light(target, run.player.x, run.player.y - 8, 125, '#ffd08a', .7);
      if (reduced) return;
      // A small fixed field of drifting embers. Pause freezes all motion through active time.
      const time = run.elapsed;
      target.save();
      for (let i = 0; i < 32; i++) {
        const x = (noise(i + 44) * width + Math.sin(time * .15 + i) * 10 + width) % width;
        const y = (noise(i + 91) * height - time * (2 + noise(i) * 3) % height + height) % height;
        target.globalAlpha = .2 + .22 * Math.sin(time * .7 + i) ** 2;
        target.fillStyle = i % 4 ? '#edbe7d' : '#9bb9b5'; target.fillRect(x, y, 1, 1.5);
      }
      target.restore();
    },
    light,
    shadow(target: CanvasRenderingContext2D, x: number, y: number, radius: number) {
      target.drawImage(shadow, x - radius * 1.4, y - radius * .5, radius * 2.8, radius);
    },
    dispose() { floor.width = floor.height = shadow.width = shadow.height = 1; for (const stamp of lights.values()) stamp.width = stamp.height = 1; lights.clear(); },
  };
}
