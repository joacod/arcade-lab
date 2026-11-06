import { validateImageDimensions, type ImageDimensions } from '../../engine/browser/images.ts';
import { duelClips, type AnimationSample } from './animation.ts';

/** Whole-body cels share a fixed ground pivot and pack consecutively, eight per row. */
export const foundryCell = { width: 320, height: 224, pivotX: 144, pivotY: 208, columns: 8 } as const;
export const foundryClips = Object.keys(duelClips) as (keyof typeof duelClips)[];
const fighterSheet = [foundryCell.columns * foundryCell.width,
  Math.ceil(Object.values(duelClips).reduce((sum, count) => sum + count, 0) / foundryCell.columns) * foundryCell.height] as const;
export const foundrySheets = { stage: [1600, 896], nera: fighterSheet, kael: fighterSheet, effects: [512, 256] } as const;
export function foundryFrame(sample: AnimationSample): readonly [number, number, number, number] {
  const count = duelClips[sample.clip], frame = sample.clip === 'walk' || sample.clip === 'idle'
    ? Math.floor(sample.frame) % count : Math.min(count - 1, Math.max(0, Math.round(sample.frame)));
  const index = foundryClips.slice(0, foundryClips.indexOf(sample.clip)).reduce((sum, clip) => sum + duelClips[clip], 0) + frame;
  return [index % foundryCell.columns * foundryCell.width, Math.floor(index / foundryCell.columns) * foundryCell.height, foundryCell.width, foundryCell.height];
}
export function validateFoundryArt(dimensions: ImageDimensions): string[] {
  return validateImageDimensions(dimensions, foundrySheets);
}
