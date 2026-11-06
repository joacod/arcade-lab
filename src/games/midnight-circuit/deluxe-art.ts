import { deluxeFighterAtlas } from './sprite-art.ts';
import { validateImageDimensions, type ImageDimensions } from '../../engine/browser/images.ts';
/** Inspected rear-curb anchors in the painted source plates, independent of combat geometry. */
export const afterglowPlates = {
  streets: { width: 1774, height: 887, curb: 605 },
  station: { width: 1774, height: 887, curb: 632 },
} as const;
export const afterglowSkyline = { width: 1774, height: 887 } as const;
export function validateAfterglowArt(dimensions: ImageDimensions): readonly string[] {
  return validateImageDimensions(dimensions, { fighters: deluxeFighterAtlas, repair: { width: 64, height: 64 }, skyline: afterglowSkyline, ...afterglowPlates });
}

/** Painted control-panel lamps; restoration overlays follow the same tile transform. */
export const stationIndicators: readonly (readonly [number, number])[] = [
  [745,456], [762,456], [779,456], [1001,456], [1017,456], [1034,456],
  [745,502], [762,502], [779,502], [1001,502], [1017,502], [1034,502],
];
