import { prepareImages } from '../../engine/browser/images.ts';
import { validateFoundryArt } from './asset-art.ts';
const stage = new URL('./art/eclipse-foundry/stage.svg', import.meta.url).href;
const nera = new URL('./art/eclipse-foundry/nera.png', import.meta.url).href;
const kael = new URL('./art/eclipse-foundry/kael.png', import.meta.url).href;
const effects = new URL('./art/eclipse-foundry/effects.svg', import.meta.url).href;

export const foundryImages = { stage, nera, kael, effects };
export function prepareFoundry(signal: AbortSignal) {
  return prepareImages(foundryImages, signal, validateFoundryArt);
}
