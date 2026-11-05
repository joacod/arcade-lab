import { validateImageDimensions, type ImageDimensions } from '../../engine/browser/images.ts';
/** Complete 256-square cels; four fighter rows and twelve semantic poses. */
export const signalRain = {
  fighters: { width: 3072, height: 1024 },
  skyline: { width: 1920, height: 480 },
  backstreets: { width: 1920, height: 600 },
  station: { width: 1920, height: 600 },
  pavement: { width: 1920, height: 480 },
  repair: { width: 64, height: 64 },
} as const;
export function validateCircuitArt(dimensions: ImageDimensions): readonly string[] {
  return validateImageDimensions(dimensions, signalRain);
}
