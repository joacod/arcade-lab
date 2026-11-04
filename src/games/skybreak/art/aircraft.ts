import type { FlightArt, FlightSprite } from '../art-pack.ts';
const normalSprite = (image: string, width: number, height: number, footprint: FlightSprite['footprint']): FlightSprite =>
  ({ image, rect: [0, 0, width, height], footprint, frames: 6, stride: width, seconds: .09, rotation: 0 });
const normal = {
  fighter: new URL('./aircraft/normal-fighter.svg', import.meta.url).href,
  scout: new URL('./aircraft/normal-scout.svg', import.meta.url).href,
  raider: new URL('./aircraft/normal-raider.svg', import.meta.url).href,
  gunship: new URL('./aircraft/normal-gunship.svg', import.meta.url).href,
  interceptor: new URL('./aircraft/normal-interceptor.svg', import.meta.url).href,
  flagship: new URL('./aircraft/normal-flagship.svg', import.meta.url).href,
};
const fleets = {
  assets: new URL('./coastal-sortie/assets-fleet.png', import.meta.url).href,
  quality: new URL('./coastal-sortie/quality-fleet.png', import.meta.url).href,
};
export function aircraftArt(mode: 'normal' | keyof typeof fleets): FlightArt {
  if (mode === 'normal') return { images: normal, actors: {
    player: normalSprite('fighter', 64, 80, [56, 70]), straight: normalSprite('scout', 64, 64, [48, 62]),
    crossing: normalSprite('raider', 64, 64, [66, 58]), swoop: normalSprite('gunship', 64, 64, [78, 64]),
    interceptor: normalSprite('interceptor', 64, 64, [48, 68]),
  }, flagship: normalSprite('flagship', 336, 168, [336, 168]) };
  const cell = mode === 'quality' ? 256 : 96;
  const sprite = (index: number, size: number): FlightSprite => ({
    image: 'fleet', rect: [index % 4 * cell, Math.floor(index / 4) * cell, cell, cell],
    footprint: [size, size], frames: 1, stride: 0, seconds: .09, rotation: 0,
  });
  return { images: { fleet: fleets[mode], fortress: mode === 'quality'
    ? new URL('./coastal-sortie/quality-fortress.png', import.meta.url).href
    : new URL('./coastal-sortie/assets-fortress.png', import.meta.url).href }, actors: {
    player: sprite(0, 72), straight: sprite(1, 62), crossing: sprite(2, 78), swoop: sprite(3, 88), interceptor: sprite(4, 72),
  }, flagship: { image: 'fortress', rect: [0, 0, mode === 'quality' ? 768 : 288, mode === 'quality' ? 256 : 96],
    footprint: [408, 136], frames: 1, stride: 0, seconds: .09, rotation: 0 }, objects: {
    power: sprite(6, 44), spread: sprite(7, 44), repair: sprite(8, 44),
    nacelle: sprite(9, 84), reactor: sprite(10, 64), cloud: sprite(11, 96),
  } };
}
