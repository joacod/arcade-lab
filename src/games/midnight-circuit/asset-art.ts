import type { ImageDimensions } from '../../engine/browser/images.ts';
/** Complete 256-square cels; four fighter rows and eight semantic poses. */
export const signalRain = {
  fighters: { width: 2048, height: 1024 },
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
