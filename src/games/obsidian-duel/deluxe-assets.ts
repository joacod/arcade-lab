import { prepareImages } from '../../engine/browser/images.ts';
import { validateSanctumArt } from './deluxe-art.ts';
import stage from './art/moonfall-sanctum/stage.webp';
import effects from './art/moonfall-sanctum/effects.png';
import nera from './art/moonfall-sanctum/nera.png';
import kael from './art/moonfall-sanctum/kael.png';
export { createSanctumDrawing } from './deluxe-presentation.ts';

// Independent detailed artwork uses the same semantic timing and cosmetic ground pivots.
export const sanctumImages = { stage, nera, kael, effects };
export function prepareSanctum(signal: AbortSignal) {
  return prepareImages(sanctumImages, signal, validateSanctumArt);
}
