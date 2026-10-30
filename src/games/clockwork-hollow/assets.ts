import { prepareImages } from '../../engine/browser/images.ts';
import { validateBellgardenArt } from './asset-art.ts';
import keeper from './art/bellgarden/keeper.svg';
import beetle from './art/bellgarden/beetle.svg';
import objects from './art/bellgarden/objects.svg';
import terrain from './art/bellgarden/terrain.svg';
import aqueductFar from './art/bellgarden/aqueduct-far.svg';
import aqueductNear from './art/bellgarden/aqueduct-near.svg';
import emberworksFar from './art/bellgarden/emberworks-far.svg';
import emberworksNear from './art/bellgarden/emberworks-near.svg';
import belfryFar from './art/bellgarden/belfry-far.svg';
import belfryNear from './art/bellgarden/belfry-near.svg';

export const bellgardenImages = { keeper, beetle, objects, terrain,
  'aqueduct-far': aqueductFar, 'aqueduct-near': aqueductNear,
  'emberworks-far': emberworksFar, 'emberworks-near': emberworksNear,
  'belfry-far': belfryFar, 'belfry-near': belfryNear };
export function prepareBellgarden(signal: AbortSignal) {
  return prepareImages(bellgardenImages, signal, validateBellgardenArt);
}
