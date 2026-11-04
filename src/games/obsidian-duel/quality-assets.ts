import { prepareImages } from '../../engine/browser/images.ts';
import { validateSanctumArt } from './quality-art.ts';
import stage from './art/moonfall-sanctum/stage.webp';
import effects from './art/moonfall-sanctum/effects.png';
import nera from './art/eclipse-foundry/nera.png';
import kael from './art/eclipse-foundry/kael.png';
export { createSanctumDrawing } from './quality-presentation.ts';

// Both treatments use the same complete painted characters and semantic cel contract.
export const sanctumImages = { stage, nera, kael, effects };
export function prepareSanctum(signal: AbortSignal) {
  return prepareImages(sanctumImages, signal, validateSanctumArt);
}
