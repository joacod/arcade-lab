import { still, row, type ActorArt, type ArtPack, type Decoration } from './art-pack.ts';
/** Named visual presets combine art/environment, effects and a default interface. */
interface Appearance {
  readonly name: string;
  readonly motif: 'grove' | 'crystal' | 'ruins';
  readonly interface: 'classic' | 'rune' | 'glass' | 'abyss';
  readonly palette: {
    readonly background: string; readonly floor: string; readonly boundary: string;
    readonly light: string; readonly ground: string; readonly canopy: string;
    readonly enemy: string; readonly elite: string; readonly halo: string; readonly hit: string; readonly damage: string;
    readonly spark: string; readonly shard: string; readonly pulse: string; readonly gem: string;
  };
}
/** Asset requirements are explicit: procedural worlds never need a dummy atlas. */
export type Theme = Appearance & (
  | { readonly presentation?: undefined; readonly art?: ArtPack }
  | { readonly presentation: 'prism' | 'abyss'; readonly art?: never }
);
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
  palette: { enemy: '#ae676e', elite: '#b75466', halo: '#efdb8b', hit: '#fff4d9', damage: '#ff8a82', background: '#19151b', floor: '#302a2b', boundary: '#92775c', light: '#ffdc8e',
    ground: '#88674740', canopy: '#3a3033', spark: '#ffe5a1', shard: '#bfc8ff', pulse: '#ff9b66', gem: '#87ffb6' },
};
const gardenPalette: Theme['palette'] = { enemy: '#e7809b', elite: '#b285f0', halo: '#ffefb2', hit: '#fff3dc', damage: '#ffa5ae', background: '#080f22', floor: '#18283a', boundary: '#6198ad', light: '#a9fcff',
      ground: '#52788c', canopy: '#324c70', spark: '#fcf0af', shard: '#c8a6ff', pulse: '#7bdcff', gem: '#73ffc7' };
export const themes: Readonly<Record<ThemeId, Theme>> = {
  normal: {
    name: 'Normal', motif: 'grove', interface: 'classic',
    palette: { enemy: '#ae676e', elite: '#b75466', halo: '#efdb8b', hit: '#fff4d9', damage: '#ff8a82', background: '#0b171a', floor: '#172e29', boundary: '#708a6c', light: '#f5d58b',
      ground: '#7a9b7440', canopy: '#203d34', spark: '#b7edff', shard: '#d4b7ff', pulse: '#88e0d0', gem: '#9cecaa' },
  },
  assets: emberRuins,
  quality: { name: 'Prism Garden', motif: 'crystal', presentation: 'prism', interface: 'glass', palette: gardenPalette },
  custom: {
    name: 'Abyssal Bloom', motif: 'crystal', presentation: 'abyss', interface: 'abyss',
    palette: { background: '#020510', floor: '#080f26', boundary: '#337b9c', ground: '#17345e', canopy: '#573cc0',
      light: '#83fff0', enemy: '#8d91ff', elite: '#df8fff', spark: '#9aefff', halo: '#ffc77b',
      pulse: '#4cffe2', shard: '#cbb1ff', gem: '#51eacb', hit: '#f1fffc', damage: '#ff6d9c' },
  },
};
export type ThemeId = 'normal' | 'assets' | 'quality' | 'custom';
export const visualTiming = { hit: 0.16, defeat: 0.4, shot: 0.1, pulse: 0.3, pickup: 0.3 };
export const MAX_EFFECTS = 128;
