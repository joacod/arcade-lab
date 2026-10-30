import type { ImageDimensions } from '../../engine/browser/images.ts';

/** Columns are independent articulated parts, not sequential animation frames. */
export const foundryParts = { torso: 0, head: 1, arm: 2, gauntlet: 3, thigh: 4, shin: 5, boot: 6, mantle: 7 } as const;
export type FoundryPart = keyof typeof foundryParts;
export const foundrySheets = { stage: [1600, 896], nera: [1024, 160], kael: [1024, 160], effects: [512, 128] } as const;
export function validateFoundryArt(dimensions: ImageDimensions): string[] {
  return Object.entries(foundrySheets).flatMap(([name, [width, height]]) =>
    dimensions[name]?.width === width && dimensions[name]?.height === height ? [] : [`Invalid Eclipse Foundry ${name} dimensions`]);
}
