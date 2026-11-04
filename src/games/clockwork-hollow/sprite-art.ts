export function hollowSpriteImages(mode: 'normal' | 'quality') {
  return mode === 'normal' ? {
    keeper: new URL('./art/bellgarden/keeper-normal.svg',import.meta.url).href,
    beetle: new URL('./art/bellgarden/beetle-normal.svg',import.meta.url).href,
    objects: new URL('./art/bellgarden/objects-normal.svg',import.meta.url).href,
  } : {
    keeper: new URL('./art/bellgarden/keeper-quality.svg',import.meta.url).href,
    beetle: new URL('./art/bellgarden/beetle-quality.svg',import.meta.url).href,
    objects: new URL('./art/bellgarden/objects-quality.svg',import.meta.url).href,
  };
}
