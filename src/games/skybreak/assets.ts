import { prepareImages, type ImageDimensions } from '../../engine/browser/images.ts';
import { validateFlightArt } from './art-pack.ts';
import type { FlightTheme } from './themes.ts';

export function flightImages(theme: FlightTheme) {
  return { ...theme.art?.images, ...(theme.scenery ? { backdrop: theme.scenery.url } : {}) };
}
export function validateFlightImages(theme: FlightTheme, dimensions: ImageDimensions) {
  return [
    ...(theme.art ? validateFlightArt(theme.art, dimensions) : []),
    ...(theme.scenery && (dimensions.backdrop?.width !== theme.scenery.width || dimensions.backdrop.height !== theme.scenery.height)
      ? ['Invalid coastal scenery dimensions.'] : []),
  ];
}
export function prepareFlightImages(theme: FlightTheme, signal: AbortSignal) {
  return prepareImages(flightImages(theme), signal, dimensions => validateFlightImages(theme, dimensions));
}
