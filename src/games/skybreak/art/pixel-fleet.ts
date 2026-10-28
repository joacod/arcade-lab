import type { FlightSprite } from '../art-pack.ts';
import type { FlightTheme } from '../themes.ts';

export interface PixelFleetImages {
  readonly fighter: string; readonly bomber: string; readonly corvette: string;
  readonly scout: string; readonly raider: string; readonly gunship: string; readonly interceptor: string;
}
const sprite = (image: string, rect: FlightSprite['rect'], footprint: FlightSprite['footprint'], frames = 1, stride = 0): FlightSprite =>
  ({ image, rect, footprint, frames, stride, seconds: 0.09, rotation: -Math.PI / 2 });

/** Inspected upstream rectangles, facing right. Rotation makes the player's nose face up. */
export function createPixelFleet(images: PixelFleetImages): Readonly<Record<string, FlightTheme>> {
  const fighter = sprite('fighter', [54, 64, 100, 64], [72, 46], 6, 192);
  const bomber = sprite('bomber', [33, 68, 112, 56], [78, 46], 6, 192);
  const actors = {
    player: fighter,
    straight: sprite('scout', [25, 47, 77, 34], [62, 38]),
    crossing: sprite('raider', [21, 44, 86, 39], [66, 38]),
    swoop: sprite('gunship', [16, 41, 96, 46], [78, 48]),
    interceptor: sprite('interceptor', [11, 33, 105, 61], [68, 43]),
  };
  const flagship = sprite('corvette', [4, 49, 185, 94], [162, 95], 6, 192);
  return {
    starfall: { name: 'Starfall Fleet', scene: 'orbit',
      description: 'A red pixel fighter against a varied enemy fleet, above an ice-blue planetary orbit.',
      palette: { background: '#050916', haze: '#111d38', nebula: '#394477', planet: '#264d73', atmosphere: '#8bcaff',
        accent: '#a8dbff', player: '#e5f7ff', enemy: '#eb9bba', armor: '#4d5d80' },
      art: { images: { ...images }, actors, flagship },
    },
    redshift: { name: 'Redshift Armada', scene: 'rift',
      description: 'Pilot a white bomber through copper nebulae and a drifting asteroid belt.',
      palette: { background: '#110b16', haze: '#331c32', nebula: '#843f4f', planet: '#6a3847', atmosphere: '#ffb98b',
        accent: '#ffc397', player: '#fff0d4', enemy: '#e78bbd', armor: '#77576a' },
      art: { images: { ...images }, actors: { ...actors, player: bomber, straight: actors.crossing, crossing: actors.straight }, flagship },
    },
  };
}
