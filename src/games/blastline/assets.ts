import { prepareImages, type ImageDimensions } from '../../engine/browser/images.ts';

export const emberImages = {
  operators: new URL('./art/ember-coast/operators.png', import.meta.url).href,
  enemies: new URL('./art/ember-coast/enemies.png', import.meta.url).href,
  objects: new URL('./art/ember-coast/objects.png', import.meta.url).href,
  backdrop: new URL('./art/ember-coast/backdrop.webp', import.meta.url).href,
  novaRun: new URL('./art/ember-coast/nova-run.png', import.meta.url).href,
  boltRun: new URL('./art/ember-coast/bolt-run.png', import.meta.url).href,
};
export const emberSheets = { operators: [640, 1024], enemies: [384, 384], objects: [512, 512], backdrop: [1536, 1024], novaRun: [768, 640], boltRun: [768, 640] } as const;
export function validateEmberArt(dimensions: ImageDimensions) {
  return Object.entries(emberSheets).flatMap(([key, [width, height]]) =>
    dimensions[key]?.width === width && dimensions[key].height === height ? [] : [`Invalid Ember Coast ${key}`]);
}
export function prepareEmberCoast(signal: AbortSignal) {
  return prepareImages(emberImages, signal, validateEmberArt);
}
