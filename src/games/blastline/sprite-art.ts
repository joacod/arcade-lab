import type { ImageDimensions } from '../../engine/browser/images.ts';
export const blastImages = {
  operators: new URL('./art/operators.svg',import.meta.url).href,
  enemies: new URL('./art/enemies.svg',import.meta.url).href,
  objects: new URL('./art/objects.svg',import.meta.url).href,
};
export const blastSheets = { operators: [320,512], enemies: [192,192], objects: [512,64] } as const;
export function validateBlastArt(dimensions: ImageDimensions) {
  return Object.entries(blastSheets).flatMap(([key,[width,height]]) => dimensions[key]?.width === width && dimensions[key].height === height ? [] : [`Invalid Blastline ${key}`]);
}
export function operatorCel(airborne: boolean, moving: boolean, phase: number, reduced: boolean, aimX: number, aimY: number) {
  const aim = aimY < -.4 ? Math.abs(aimX) < .4 ? 0 : 1 : aimY > .4 ? Math.abs(aimX) < .4 ? 4 : 3 : 2;
  const state = airborne ? 3 : reduced || !moving ? 0 : phase < .5 ? 1 : 2;
  return { aim, state, runFrame: Math.min(5, Math.floor(phase * 6)) };
}
