import { prepareImages, type ImageBundle } from '../../engine/browser/images.ts';
import { validateCircuitArt } from './asset-art.ts';
import { stageOf } from './game.ts';
import { arcadeFighterAtlas } from './sprite-art.ts';
import { createPresentation, type CircuitArtwork } from './presentation.ts';
import fighters from './art/fighters/animated.webp';
import skyline from './art/signal-rain/skyline.svg';
import backstreets from './art/signal-rain/backstreets.svg';
import station from './art/signal-rain/station.svg';
import pavement from './art/signal-rain/pavement.svg';
import repair from './art/signal-rain/repair.svg';

function createArtwork(images: ImageBundle): CircuitArtwork {
  return {
    mode: 'arcade',
    fighterAtlas: arcadeFighterAtlas,
    scenery(ctx, view, run, time, reducedMotion) {
      const { width, height, ground, x: camera } = view;
      ctx.fillStyle = '#203d43'; ctx.fillRect(0, 0, width, height);
      const stage = stageOf(run), finale = stage.encounters.at(-1)!;
      const origin = stage.environment === 'station' ? (finale.left + finale.right) / 2 - 640 : 0;
      const tile = (name: string, y: number, h: number, parallax: number) => {
        const offset = camera * parallax - (name === 'skyline' ? 0 : origin);
        const span = 1280;
        for (let i = Math.floor(offset / span); i * span - offset < width; i++) ctx.drawImage(images[name]!, i * span - offset, y, span, h);
      };
      tile('skyline', ground - 480, 320, .18);
      tile(stageOf(run).environment === 'station' ? 'station' : 'backstreets', ground - 400, 400, 1);
      tile('pavement', ground, Math.max(320, height - ground), 1);
      if (run.finale > 0 || run.status === 'victory') {
        ctx.fillStyle = '#9ae6ab24'; ctx.fillRect(0, 0, width, ground);
      }
      if (!reducedMotion && stageOf(run).environment !== 'station') {
        ctx.strokeStyle = '#dbe2bc33'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 72; i++) {
          const x = ((i * 137.3 - time * 75) % width + width) % width, y = (i * 83.7 + time * 400) % height;
          ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16);
        }
        ctx.stroke();
      }
    },
    pickup(ctx, pickup, ground) {
      ctx.drawImage(images.repair!, pickup.x - 21, ground + pickup.lane - 38, 42, 42);
    },
  };
}
export async function createArcade(surface: HTMLElement, signal: AbortSignal) {
  const prepared = await prepareImages({ fighters, skyline, backstreets, station, pavement, repair }, signal, validateCircuitArt);
  try {
    if (signal.aborted) throw new Error('Preparation cancelled');
    const renderer = createPresentation(surface, createArtwork(prepared.images), prepared.images);
    return { ...renderer, dispose() { try { renderer.dispose(); } finally { prepared.dispose(); } } };
  } catch (error) { prepared.dispose(); throw error; }
}
