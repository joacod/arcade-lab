import { prepareImages } from '../../engine/browser/images.ts';
import { validateFoundryArt } from './asset-art.ts';
import stage from './art/eclipse-foundry/stage.svg';
import nera from './art/eclipse-foundry/nera.png';
import kael from './art/eclipse-foundry/kael.png';
import effects from './art/eclipse-foundry/effects.svg';

export const foundryImages = { stage, nera, kael, effects };
export function prepareFoundry(signal: AbortSignal) {
  return prepareImages(foundryImages, signal, validateFoundryArt);
}
