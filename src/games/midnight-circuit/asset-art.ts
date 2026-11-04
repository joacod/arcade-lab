import type { ImageDimensions } from '../../engine/browser/images.ts';
/** Complete 256-square cels; four fighter rows and eight semantic poses. */
export const signalRain = {
  fighters: { width: 2048, height: 1024 },
  skyline: { width: 1920, height: 480 },
  backstreets: { width: 1920, height: 600 },
  station: { width: 1920, height: 600 },
  pavement: { width: 1920, height: 480 },
  repair: { width: 64, height: 64 },
} as const;
export function validateCircuitArt(dimensions: ImageDimensions): readonly string[] {
  return Object.entries(signalRain).flatMap(([name, expected]) => {
    const actual = dimensions[name];
    return actual?.width === expected.width && actual.height === expected.height ? [] : [`Signal / Rain: invalid ${name} dimensions`];
  });
}
