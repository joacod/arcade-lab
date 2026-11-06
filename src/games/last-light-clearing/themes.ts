import { still, row, frame, type ActorArt, type ArtPack, type Decoration } from './art-pack.ts';
/** Named visual presets combine art/environment, effects and a default interface. */
export interface Theme {
  readonly name: string;
  readonly interface: 'rune' | 'ember';
  readonly palette: {
    readonly background: string; readonly floor: string; readonly boundary: string;
    readonly light: string; readonly ground: string;
    readonly enemy: string; readonly elite: string; readonly halo: string; readonly hit: string; readonly damage: string;
    readonly spark: string; readonly shard: string; readonly pulse: string; readonly gem: string;
  };
  readonly presentation?: 'ember';
  readonly art: ArtPack;
}
function dungeonActor(idleX: number, moveX: number, y: number, w: number, h: number, footprint: readonly [number, number]): ActorArt {
  return { clips: { idle: row('dungeon', idleX, y, w, h, 4, 0.18), move: row('dungeon', moveX, y, w, h, 4, 0.1) },
    anchor: [0.5, 0.78], footprint, orientation: 'mirror' };
}
const stone = (x: number, y: number): Decoration => ({ clip: still('dungeon', [x, y, 16, 16]), footprint: [32, 32], anchor: [0, 0] });
export const emberRuins: Theme = {
  name: 'Ember Ruins', interface: 'rune',
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
    ground: '#88674740', spark: '#ffe5a1', shard: '#bfc8ff', pulse: '#ff9b66', gem: '#87ffb6' },
};
/** Compact painted miniatures register their bodies around the existing gameplay center. */
const paintedActor = (image: string, size: number, stride: number,
  bounds: readonly [number, number, number, number]): ActorArt => ({
  clips: { idle: row(image, 0, 0, 256, 256, 4, .2), move: row(image, 0, 256, 256, 256, 4, .12) },
  anchor: [.5, .64], footprint: [size, size], ground: [.5, 200 / 256], stride,
  visualBounds: [bounds[0] / 256, bounds[1] / 256, bounds[2] / 256, bounds[3] / 256], orientation: 'mirror',
});
const paintedObject = (x: number, y: number, size: number, anchor: readonly [number, number] = [.5, 220 / 256]): Decoration => ({
  clip: still('props', [x, y, 256, 256]), footprint: [size, size], anchor,
});
export const rekindledArt: ArtPack = {
  images: {
    keeper: new URL('./art/rekindled/keeper.webp', import.meta.url).href,
    goblins: new URL('./art/rekindled/goblins.webp', import.meta.url).href,
    elite: new URL('./art/rekindled/elite.webp', import.meta.url).href,
    props: new URL('./art/rekindled/props.webp', import.meta.url).href,
    ground: new URL('./art/rekindled/ground.webp', import.meta.url).href,
  },
  sampling: 'smooth',
  actors: {
    keeper: paintedActor('keeper', 48, 64, [49, 4, 209, 203]),
    crawler: { ...paintedActor('goblins', 32, 32, [49, 7, 213, 202]), clips: { idle: still('goblins', [0, 0, 256, 256]), move: row('goblins', 0, 0, 256, 256, 4, .12) } },
    charger: { ...paintedActor('goblins', 36, 40, [43, 7, 204, 203]), clips: { idle: still('goblins', [0, 256, 256, 256]), move: row('goblins', 0, 256, 256, 256, 4, .1) } },
    elite: paintedActor('elite', 64, 48, [42, 9, 217, 203]),
  },
  objects: {
    gem: paintedObject(0, 256, 16, [.5, .5]),
    halo: paintedObject(256, 256, 22, [.5, .5]),
    shard: paintedObject(512, 256, 16, [.5, .5]),
  },
  environment: {
    plate: frame('ground', [0, 0, 1536, 1024]), tileSize: 32, ground: [],
    perimeter: [paintedObject(0, 0, 80), paintedObject(256, 0, 52), paintedObject(512, 0, 64)],
  },
};
export const themes: Readonly<Record<ThemeId, Theme>> = {
  arcade: emberRuins,
  deluxe: {
    ...emberRuins, name: 'Ember Ruins · Rekindled', presentation: 'ember', interface: 'ember',
    art: rekindledArt,
    palette: { ...emberRuins.palette, background: '#10191d', floor: '#202a2d', boundary: '#9c9275',
      light: '#ffd494', ground: '#879580', enemy: '#cc887e', elite: '#f1aa87',
      spark: '#ffe3a6', halo: '#ffe6ae', shard: '#c7c3ff', pulse: '#ffa578', gem: '#90edbd' },
  },
};
export type ThemeId = 'arcade' | 'deluxe';
export const visualTiming = { hit: 0.16, defeat: 0.4, shot: 0.1, pulse: 0.3, pickup: 0.3 };
export const MAX_EFFECTS = 128;
