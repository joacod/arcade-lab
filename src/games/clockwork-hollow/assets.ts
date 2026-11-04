import { prepareImages } from '../../engine/browser/images.ts';
import { validateBellgardenArt } from './asset-art.ts';
const keeper = new URL('./art/bellgarden/keeper.svg', import.meta.url).href;
const beetle = new URL('./art/bellgarden/beetle.svg', import.meta.url).href;
const objects = new URL('./art/bellgarden/objects.svg', import.meta.url).href;
const terrain = new URL('./art/bellgarden/terrain.svg', import.meta.url).href;
const aqueductFar = new URL('./art/bellgarden/aqueduct-far.svg', import.meta.url).href;
const aqueductNear = new URL('./art/bellgarden/aqueduct-near.svg', import.meta.url).href;
const emberworksFar = new URL('./art/bellgarden/emberworks-far.svg', import.meta.url).href;
const emberworksNear = new URL('./art/bellgarden/emberworks-near.svg', import.meta.url).href;
const belfryFar = new URL('./art/bellgarden/belfry-far.svg', import.meta.url).href;
const belfryNear = new URL('./art/bellgarden/belfry-near.svg', import.meta.url).href;

export const bellgardenImages = { keeper, beetle, objects, terrain,
  'aqueduct-far': aqueductFar, 'aqueduct-near': aqueductNear,
  'emberworks-far': emberworksFar, 'emberworks-near': emberworksNear,
  'belfry-far': belfryFar, 'belfry-near': belfryNear };
export function prepareBellgarden(signal: AbortSignal) {
  return prepareImages(bellgardenImages, signal, validateBellgardenArt);
}
