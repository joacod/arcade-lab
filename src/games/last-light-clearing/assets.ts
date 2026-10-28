import { prepareImages } from '../../engine/browser/images.ts';
import { validateArtPack, type ArtPack } from './art-pack.ts';

export function prepareAssets(pack: ArtPack, signal: AbortSignal) {
  return prepareImages(pack.images, signal, dimensions => validateArtPack(pack, dimensions));
}
