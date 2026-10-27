import { still, row, type ActorArt, type ArtPack, type Decoration } from './art-pack.ts';
import type { InterfaceSkin } from './interface.ts';
import localAppearances from './local-appearances.ts';
/** Named visual presets combine art/environment, effects and a default interface. */
export interface Theme {
  readonly presentation?: 'prism' | 'pixel-garden';
  readonly name: string;
  readonly motif: 'grove' | 'crystal' | 'ruins';
  readonly art?: ArtPack;
  readonly interface: InterfaceSkin;
  readonly palette: {
    readonly background: string; readonly floor: string; readonly boundary: string;
    readonly light: string; readonly ground: string; readonly canopy: string;
    readonly spark: string; readonly shard: string; readonly pulse: string; readonly gem: string;
  };
}
function staticActor(x: number, size: number, footprint: number): ActorArt {
  const clip = still('actors', [x, 0, size, size]);
  return { clips: { idle: clip, move: clip }, anchor: [0.5, 0.5], footprint: [footprint, footprint], orientation: 'rotate' };
}
function dungeonActor(idleX: number, moveX: number, y: number, w: number, h: number, footprint: readonly [number, number]): ActorArt {
  return { clips: { idle: row('dungeon', idleX, y, w, h, 4, 0.18), move: row('dungeon', moveX, y, w, h, 4, 0.1) },
    anchor: [0.5, 0.78], footprint, orientation: 'mirror' };
}
const stone = (x: number, y: number): Decoration => ({ clip: still('dungeon', [x, y, 16, 16]), footprint: [32, 32], anchor: [0, 0] });
export const emberRuins: Theme = {
  name: 'Ember Ruins', motif: 'ruins', interface: 'rune',
  art: {
    images: { dungeon: new URL('./art/ember-ruins/dungeon.png', import.meta.url).href }, sampling: 'nearest',
    actors: {
      keeper: dungeonActor(128, 192, 68, 16, 28, [25, 44]),
      crawler: dungeonActor(368, 432, 40, 16, 16, [29, 29]),
      elite: dungeonActor(16, 144, 428, 32, 36, [56, 63]),
    },
    environment: {
      tileSize: 32, groundOpacity: 0.55,
      border: { clip: still('dungeon', [32, 16, 16, 16]), footprint: [32, 32], anchor: [0.5, 0.5] },
      ground: [stone(16, 64), stone(32, 64), stone(48, 64), stone(16, 80)],
      perimeter: [
        { clip: still('dungeon', [80, 80, 16, 48]), footprint: [28, 84], anchor: [0.5, 0.5] },
        { clip: row('dungeon', 64, 16, 16, 16, 3, 0.14), footprint: [40, 40], anchor: [0.5, 0.5] },
        { clip: still('dungeon', [48, 32, 16, 16]), footprint: [40, 40], anchor: [0.5, 0.5] },
        { clip: still('dungeon', [288, 408, 16, 24]), footprint: [32, 48], anchor: [0.5, 0.5] },
      ],
    },
  },
  palette: { background: '#19151b', floor: '#302a2b', boundary: '#92775c', light: '#ffdc8e',
    ground: '#88674740', canopy: '#3a3033', spark: '#ffe5a1', shard: '#bfc8ff', pulse: '#ff9b66', gem: '#87ffb6' },
};
export const themes: Readonly<Record<string, Theme>> = {
  woodland: {
    name: 'Lanternwood', motif: 'grove', interface: 'classic',
    art: { images: { actors: new URL('./art/woodland.svg', import.meta.url).href }, sampling: 'smooth',
      actors: { keeper: staticActor(0, 64, 32), crawler: staticActor(64, 64, 32), elite: staticActor(128, 64, 48) } },
    palette: { background: '#0b171a', floor: '#172e29', boundary: '#708a6c', light: '#f5d58b',
      ground: '#7a9b7440', canopy: '#203d34', spark: '#b7edff', shard: '#d4b7ff', pulse: '#88e0d0', gem: '#9cecaa' },
  },
  moonglass: {
    name: 'Moonglass', motif: 'crystal', interface: 'glass',
    art: { images: { actors: new URL('./art/moonglass.svg', import.meta.url).href }, sampling: 'smooth',
      actors: { keeper: staticActor(0, 80, 32), crawler: staticActor(80, 80, 32), elite: staticActor(160, 80, 48) } },
    palette: { background: '#111329', floor: '#202645', boundary: '#7b8ec4', light: '#b6e8ff',
      ground: '#a8b9ef40', canopy: '#30345a', spark: '#b9f6ff', shard: '#ffb8df', pulse: '#bca7ff', gem: '#8eeadf' },
  },
  ember: emberRuins,
  prism: {
    name: 'Prism Garden', motif: 'crystal', presentation: 'prism', interface: 'glass',
    palette: { background: '#080f22', floor: '#18283a', boundary: '#6198ad', light: '#a9fcff',
      ground: '#52788c', canopy: '#324c70', spark: '#fcf0af', shard: '#c8a6ff', pulse: '#7bdcff', gem: '#73ffc7' },
  },
  'ember-garden': { ...emberRuins, name: 'Ember Conservatory', presentation: 'pixel-garden', interface: 'glass' },
  ...localAppearances,
};
export type ThemeId = string;
export const visualTiming = { hit: 0.16, defeat: 0.4, shot: 0.1, pulse: 0.3, pickup: 0.3 };
export const MAX_EFFECTS = 128;
