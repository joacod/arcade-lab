import type { ImageDimensions } from '../../engine/browser/images.ts';
/** Decoded layouts are cosmetic. Each fighter row has eight independent 64 × 64 parts. */
export const signalRain = {
  fighters: { width: 512, height: 256 },
  skyline: { width: 960, height: 320 },
  backstreets: { width: 960, height: 340 },
  station: { width: 960, height: 340 },
  pavement: { width: 960, height: 240 },
  repair: { width: 64, height: 64 },
} as const;
export function validateCircuitArt(dimensions: ImageDimensions): readonly string[] {
  return Object.entries(signalRain).flatMap(([name, expected]) => {
    const actual = dimensions[name];
    return actual?.width === expected.width && actual.height === expected.height ? [] : [`Signal / Rain: invalid ${name} dimensions`];
  });
}
