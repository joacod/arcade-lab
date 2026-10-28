import { prepareImages } from '../../engine/browser/images.ts';
import { validateFlightArt, type FlightArt } from './art-pack.ts';

export function prepareFlightArt(art: FlightArt, signal: AbortSignal) {
  return prepareImages(art.images, signal, dimensions => validateFlightArt(art, dimensions));
}
