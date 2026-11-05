import { validateImageDimensions, type ImageDimensions } from '../../engine/browser/images.ts';
import { foundrySheets } from './asset-art.ts';

export const sanctumSheets = { stage: [1600, 896], nera: foundrySheets.nera, kael: foundrySheets.kael, effects: [1536, 768] } as const;
/** Each effect's authored contact point, relative to its 384-square cell. */
export const sanctumEffects = [
  { x: 0, y: 0, pivotX: 352, pivotY: 192 },
  { x: 384, y: 0, pivotX: 192, pivotY: 192 },
  { x: 768, y: 0, pivotX: 192, pivotY: 192 },
  { x: 1152, y: 0, pivotX: 192, pivotY: 192 },
  { x: 0, y: 384, pivotX: 192, pivotY: 192 },
  { x: 384, y: 384, pivotX: 352, pivotY: 192 },
  { x: 768, y: 384, pivotX: 192, pivotY: 192 },
  { x: 1152, y: 384, pivotX: 192, pivotY: 192 },
] as const;
export function validateSanctumArt(dimensions: ImageDimensions): string[] {
  return validateImageDimensions(dimensions, sanctumSheets);
}
