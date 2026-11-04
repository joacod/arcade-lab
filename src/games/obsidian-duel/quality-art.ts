import type { ImageDimensions } from '../../engine/browser/images.ts';
import { foundrySheets } from './asset-art.ts';

export const sanctumSheets = { stage: [1600, 896], nera: foundrySheets.nera, kael: foundrySheets.kael, effects: [768, 768] } as const;
/** Each effect's authored contact point, relative to its 384-square cell. */
export const sanctumEffects = [
  { x: 0, y: 0, pivotX: 300, pivotY: 199 },
  { x: 384, y: 0, pivotX: 247, pivotY: 199 },
  { x: 0, y: 384, pivotX: 188, pivotY: 186 },
  { x: 384, y: 384, pivotX: 192, pivotY: 186 },
] as const;
/** The painted Crescent heel's contact point, relative to its fighter's ground pivot. */
export const sanctumHeelContact = { x: 116, z: 134 } as const;
export function validateSanctumArt(dimensions: ImageDimensions): string[] {
  return Object.entries(sanctumSheets).flatMap(([name, [width, height]]) =>
    dimensions[name]?.width === width && dimensions[name]?.height === height ? [] : [`Invalid Moonfall Sanctum ${name} dimensions`]);
}
