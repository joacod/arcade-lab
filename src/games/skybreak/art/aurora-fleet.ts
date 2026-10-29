import type { FlightSprite } from '../art-pack.ts';
import type { FlightTheme } from '../themes.ts';

const sprite = (image: string, width: number, height: number, footprint: FlightSprite['footprint']): FlightSprite =>
  ({ image, rect: [0, 0, width, height], footprint, frames: 6, stride: width, seconds: 0.09, rotation: 0 });

/** Original north-facing sheets. The renderer turns enemies and the flagship south. */
export const auroraFleet: FlightTheme = {
  name: 'Aurora Fleet', scene: 'orbit',
  palette: { background: '#050916', haze: '#111d38', nebula: '#394477', planet: '#264d73', atmosphere: '#8bcaff',
    accent: '#a8dbff', player: '#e5f7ff', enemy: '#eb9bba', armor: '#4d5d80' },
  art: {
    images: {
      fighter: new URL('./aurora-fleet/fighter.svg', import.meta.url).href,
      scout: new URL('./aurora-fleet/scout.svg', import.meta.url).href,
      raider: new URL('./aurora-fleet/raider.svg', import.meta.url).href,
      gunship: new URL('./aurora-fleet/gunship.svg', import.meta.url).href,
      interceptor: new URL('./aurora-fleet/interceptor.svg', import.meta.url).href,
      flagship: new URL('./aurora-fleet/flagship.svg', import.meta.url).href,
    },
    actors: {
      player: sprite('fighter', 64, 80, [56, 70]),
      straight: sprite('scout', 64, 64, [48, 62]),
      crossing: sprite('raider', 64, 64, [66, 58]),
      swoop: sprite('gunship', 64, 64, [78, 64]),
      interceptor: sprite('interceptor', 64, 64, [48, 68]),
    },
    flagship: sprite('flagship', 336, 168, [336, 168]),
  },
};
