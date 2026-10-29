import type { Pattern } from './content.ts';

export type AircraftRole = Pattern | 'player';
/** Visual frame rectangles and horizontal sheet stride, independent of collision bodies. */
export interface FlightSprite {
  readonly image: string;
  readonly rect: readonly [number, number, number, number];
  readonly frames: number;
  readonly stride: number;
  readonly seconds: number;
  readonly footprint: readonly [number, number];
  readonly rotation: number;
}
export interface FlightArt {
  readonly images: Readonly<Record<string, string>>;
  readonly actors: Readonly<Record<AircraftRole, FlightSprite>>;
  readonly flagship?: FlightSprite;
}
export function validateFlightArt(art: FlightArt, dimensions: Readonly<Record<string, { width: number; height: number }>>) {
  const errors: string[] = [];
  for (const [role, sprite] of Object.entries({ ...art.actors, ...(art.flagship ? { flagship: art.flagship } : {}) })) {
    const image = dimensions[sprite.image], [x, y, w, h] = sprite.rect;
    const values = [...sprite.rect, sprite.frames, sprite.stride, sprite.seconds, ...sprite.footprint, sprite.rotation];
    if (values.some(value => !Number.isFinite(value)) || x < 0 || y < 0 || w <= 0 || h <= 0 ||
      !Number.isInteger(sprite.frames) || sprite.frames < 1 || sprite.stride < 0 || sprite.seconds <= 0 || sprite.footprint.some(value => value <= 0)) {
      errors.push(`${role}: invalid sprite definition`); continue;
    }
    if (!image || x + (sprite.frames - 1) * sprite.stride + w > image.width || y + h > image.height) errors.push(`${role}: frames exceed ${sprite.image}`);
  }
  return errors;
}
export function flightFrame(sprite: FlightSprite, time: number, reducedMotion: boolean) {
  return sprite.rect[0] + (reducedMotion ? 0 : Math.floor(Math.max(0, time) / sprite.seconds) % sprite.frames) * sprite.stride;
}
