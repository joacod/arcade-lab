import { prepareImages, type ImageBundle } from '../../engine/browser/images.ts';
import { validateCircuitArt } from './asset-art.ts';
import { stageOf } from './game.ts';
import { createPresentation, type CircuitArtwork } from './presentation.ts';
import fighters from './art/fighters/fighters.png';
import skyline from './art/signal-rain/skyline.svg';
import backstreets from './art/signal-rain/backstreets.svg';
import station from './art/signal-rain/station.svg';
import pavement from './art/signal-rain/pavement.svg';
import repair from './art/signal-rain/repair.svg';

function createArtwork(images: ImageBundle): CircuitArtwork {
  return {
    scenery(ctx, view, run, time, reducedMotion) {
      const { width, height, ground, x: camera } = view;
      ctx.fillStyle = '#203d43'; ctx.fillRect(0, 0, width, height);
      const tile = (name: string, y: number, h: number, parallax: number) => {
        const offset = camera * parallax;
        for (let i = Math.floor(offset / 960); i * 960 - offset < width; i++) ctx.drawImage(images[name]!, i * 960 - offset, y, 960, h);
      };
      tile('skyline', ground - 360, 320, .18);
      tile(stageOf(run).environment === 'station' ? 'station' : 'backstreets', ground - 270, 270, .78);
      tile('pavement', ground, Math.max(240, height - ground), 1);
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
    pickup(ctx, pickup, ground, time) {
      ctx.drawImage(images.repair!, pickup.x - 21, ground + pickup.lane - 38 + Math.sin(time * 3) * 2, 42, 42);
    },
  };
}
export async function createAssets(surface: HTMLElement, signal: AbortSignal) {
  const prepared = await prepareImages({ fighters, skyline, backstreets, station, pavement, repair }, signal, validateCircuitArt);
  try {
    if (signal.aborted) throw new Error('Preparation cancelled');
    const renderer = createPresentation(surface, createArtwork(prepared.images), prepared.images);
    return { ...renderer, dispose() { try { renderer.dispose(); } finally { prepared.dispose(); } } };
  } catch (error) { prepared.dispose(); throw error; }
}
