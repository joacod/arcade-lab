import { prepareImages, type ImageDimensions } from '../../engine/browser/images.ts';

export const reforgedImages = {
  operators: new URL('./art/ember-reforged/operators.png', import.meta.url).href,
  enemies: new URL('./art/ember-reforged/enemies.png', import.meta.url).href,
  objects: new URL('./art/ember-reforged/objects.png', import.meta.url).href,
  backdrop: new URL('./art/ember-reforged/backdrop.webp', import.meta.url).href,
  novaRun: new URL('./art/ember-reforged/nova-run.png', import.meta.url).href,
  boltRun: new URL('./art/ember-reforged/bolt-run.png', import.meta.url).href,
};
export const reforgedSheets = {
  operators: [960, 1152], enemies: [576, 576], objects: [768, 768],
  backdrop: [2048, 1024], novaRun: [1152, 960], boltRun: [1152, 960],
} as const;
export function validateReforgedArt(dimensions: ImageDimensions) {
  return Object.entries(reforgedSheets).flatMap(([key, [width, height]]) =>
    dimensions[key]?.width === width && dimensions[key].height === height ? [] : [`Invalid Ember Reforged ${key}`]);
}
export function prepareEmberReforged(signal: AbortSignal) {
  return prepareImages(reforgedImages, signal, validateReforgedArt);
}
