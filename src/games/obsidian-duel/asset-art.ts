import type { ImageDimensions } from '../../engine/browser/images.ts';
import { duelClips, type AnimationSample } from './animation.ts';

/** Whole-body cels share a fixed ground pivot and pack consecutively, eight per row. */
export const foundryCell = { width: 320, height: 224, pivotX: 144, pivotY: 208, columns: 8 } as const;
export const foundryClips = Object.keys(duelClips) as (keyof typeof duelClips)[];
export const foundrySheets = { stage: [1600, 896], nera: [2560, 2240], kael: [2560, 2240], effects: [512, 128] } as const;
export function foundryFrame(sample: AnimationSample): readonly [number, number, number, number] {
  const count = duelClips[sample.clip], frame = sample.clip === 'walk' || sample.clip === 'idle'
    ? Math.floor(sample.frame) % count : Math.min(count - 1, Math.max(0, Math.round(sample.frame)));
  const index = foundryClips.slice(0, foundryClips.indexOf(sample.clip)).reduce((sum, clip) => sum + duelClips[clip], 0) + frame;
  return [index % foundryCell.columns * foundryCell.width, Math.floor(index / foundryCell.columns) * foundryCell.height, foundryCell.width, foundryCell.height];
}
export function validateFoundryArt(dimensions: ImageDimensions): string[] {
  return Object.entries(foundrySheets).flatMap(([name, [width, height]]) =>
    dimensions[name]?.width === width && dimensions[name]?.height === height ? [] : [`Invalid Eclipse Foundry ${name} dimensions`]);
}
