import type { FlightArt, FlightSprite } from '../art-pack.ts';
const fleets = {
  arcade: new URL('./coastal-sortie/assets-fleet.png', import.meta.url).href,
  deluxe: new URL('./coastal-sortie/quality-fleet.png', import.meta.url).href,
};
export function aircraftArt(mode: keyof typeof fleets): FlightArt {
  const cell = mode === 'deluxe' ? 256 : 96;
  const sprite = (index: number, size: number): FlightSprite => ({
    image: 'fleet', rect: [index % 4 * cell, Math.floor(index / 4) * cell, cell, cell],
    footprint: [size, size], frames: 1, stride: 0, seconds: .09, rotation: 0,
  });
  return { images: { fleet: fleets[mode], fortress: mode === 'deluxe'
    ? new URL('./coastal-sortie/quality-fortress.png', import.meta.url).href
    : new URL('./coastal-sortie/assets-fortress.png', import.meta.url).href }, actors: {
    player: sprite(0, 72), straight: sprite(1, 62), crossing: sprite(2, 78), swoop: sprite(3, 88), interceptor: sprite(4, 72),
  }, flagship: { image: 'fortress', rect: [0, 0, mode === 'deluxe' ? 768 : 288, mode === 'deluxe' ? 256 : 96],
    footprint: [408, 136], frames: 1, stride: 0, seconds: .09, rotation: 0 }, objects: {
    power: sprite(6, 44), spread: sprite(7, 44), repair: sprite(8, 44),
    nacelle: sprite(9, 84), reactor: sprite(10, 64), cloud: sprite(11, 96),
  } };
}
