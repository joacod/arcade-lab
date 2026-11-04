import type { ImageDimensions } from '../../engine/browser/images.ts';
/** Inspected rear-curb anchors in the painted source plates, independent of combat geometry. */
export const afterglowPlates = {
  streets: { width: 1774, height: 887, curb: 605 },
  station: { width: 1774, height: 887, curb: 586 },
} as const;
export const afterglowSkyline = { width: 1774, height: 887 } as const;
export function validateAfterglowArt(dimensions: ImageDimensions): readonly string[] {
  return Object.entries({ fighters: { width: 2048, height: 1024 }, repair: { width: 64, height: 64 }, skyline: afterglowSkyline, ...afterglowPlates })
    .flatMap(([name, expected]) => dimensions[name]?.width === expected.width && dimensions[name]?.height === expected.height
      ? [] : [`Afterglow: invalid ${name} dimensions`]);
}
