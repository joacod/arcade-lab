import { prepareImages, type ImageBundle } from '../../engine/browser/images.ts';
import { stageOf } from './game.ts';
import { createPresentation, type CircuitArtwork } from './presentation.ts';
import { afterglowPlates, stationIndicators, validateAfterglowArt } from './quality-art.ts';
import fighters from './art/afterglow/fighters/fighters.webp';
import { qualityFighterAtlas } from './sprite-art.ts';
import streets from './art/afterglow/streets.webp';
import station from './art/afterglow/station.webp';
import repair from './art/afterglow/repair.svg';
import skyline from './art/afterglow/skyline.webp';

function createArtwork(images: ImageBundle): CircuitArtwork {
  return {
    mode: 'quality',
    fighterAtlas: qualityFighterAtlas,
    scenery(ctx, view, run, time, reducedMotion) {
      const stage = stageOf(run);
      const role = stage.environment === 'station' ? 'station' : 'streets';
      const plate = afterglowPlates[role], image = images[role]!;
      const { width, height, ground, x: camera } = view;
      const online = run.finale > 0 || run.status === 'victory';
      const span = 800, finale = stage.encounters.at(-1)!;
      const origin = role === 'station' ? (finale.left + finale.right) / 2 - span / 2 : 0;
      const scale = span / plate.width, facadeHeight = plate.curb * scale;
      const sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, '#101e2a'); sky.addColorStop(1, '#29424a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      // Distant painted rooftops fill the space above the facade on portrait displays.
      const distantSpan = 1600, distantOffset = camera * .18;
      ctx.save(); ctx.globalAlpha = .65;
      for (let tile = Math.floor(distantOffset / distantSpan); tile * distantSpan - distantOffset < width; tile++) {
        ctx.save(); ctx.translate(tile * distantSpan - distantOffset, ground + 24 - 800);
        if (Math.abs(tile % 2) === 1) { ctx.translate(distantSpan, 0); ctx.scale(-1, 1); }
        ctx.drawImage(images.skyline!, 0, 0, distantSpan, 800); ctx.restore();
      }
      ctx.restore();
      // Facade and floor share x and curb anchors. Mirror alternate tiles to join their edges.
      // Only quiet asphalt stretches vertically on tall displays; architecture keeps its proportions.
      for (let tile = Math.floor((camera - origin) / span); tile * span + origin - camera < width; tile++) {
        ctx.save(); ctx.translate(tile * span + origin - camera, 0);
        if (Math.abs(tile % 2) === 1) { ctx.translate(span, 0); ctx.scale(-1, 1); }
        ctx.drawImage(image, 0, 0, plate.width, plate.curb, 0, ground - facadeHeight, span, facadeHeight);
        ctx.drawImage(image, 0, plate.curb, plate.width, plate.height - plate.curb, 0, ground, span,
          Math.max((plate.height - plate.curb) * scale, height - ground));
        if (online && role === 'station') {
          ctx.fillStyle = '#b8ffe1';
          for (const [x,y] of stationIndicators) {
            ctx.beginPath(); ctx.arc(x * scale, ground + (y - plate.curb) * scale, 2, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.restore();
      }
      if (online) {
        ctx.fillStyle = '#a7e7ad16'; ctx.fillRect(0, 0, width, ground);
      }
      if (!reducedMotion && role === 'streets') {
        ctx.strokeStyle = '#bdd6d51c'; ctx.lineWidth = .8; ctx.beginPath();
        for (let i = 0; i < 64; i++) {
          const x = ((i * 137 - time * 65) % width + width) % width, y = (i * 83 + time * 390) % height;
          ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 13);
        }
        ctx.stroke();
      }
    },
    pickup(ctx, pickup, ground) {
      ctx.drawImage(images.repair!, pickup.x - 21, ground + pickup.lane - 38, 42, 42);
    },
  };
}
/** Lazy, atomic image preparation; all frame timing remains with the existing session. */
export async function createQuality(surface: HTMLElement, signal: AbortSignal) {
  const prepared = await prepareImages({ fighters, streets, station, skyline, repair }, signal, validateAfterglowArt);
  try {
    if (signal.aborted) throw new Error('Preparation cancelled');
    const renderer = createPresentation(surface, createArtwork(prepared.images), prepared.images);
    return { ...renderer, dispose() { try { renderer.dispose(); } finally { prepared.dispose(); } } };
  } catch (error) { prepared.dispose(); throw error; }
}
