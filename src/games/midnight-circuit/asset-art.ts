import { validateImageDimensions, type ImageDimensions } from '../../engine/browser/images.ts';
import { arcadeFighterAtlas } from './sprite-art.ts';
/** Complete 256-square cels, including eight-frame walking clips. */
export const signalRain = {
  fighters: arcadeFighterAtlas,
  skyline: { width: 1920, height: 480 },
  backstreets: { width: 1920, height: 600 },
  station: { width: 1920, height: 600 },
  pavement: { width: 1920, height: 480 },
  repair: { width: 64, height: 64 },
} as const;
export function validateCircuitArt(dimensions: ImageDimensions): readonly string[] {
  return validateImageDimensions(dimensions, signalRain);
}
