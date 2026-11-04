import { still, row, frame, type ActorArt, type ArtPack, type Decoration } from './art-pack.ts';
/** Named visual presets combine art/environment, effects and a default interface. */
interface Appearance {
  readonly name: string;
  readonly motif: 'grove' | 'crystal' | 'ruins';
  readonly interface: 'classic' | 'rune' | 'ember' | 'abyss';
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
  | { readonly presentation: 'ember' | 'abyss'; readonly art?: ArtPack }
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
function groveArt(): ArtPack {
  const actor = (y: number, size: number): ActorArt => ({
    clips: { idle: still('grove', [0,y,64,64]), move: row('grove',0,y,64,64,4,.12) },
    anchor: [.5,.5], footprint: [size,size], orientation: 'rotate',
  });
  return { images: { grove: new URL('./art/grove/actors.svg', import.meta.url).href },
    sampling: 'smooth', actors: { keeper: actor(0,40), crawler: actor(64,38), elite: actor(128,72) } };
}
/** New authored cels preserve the Assets cast, not its low-resolution source pixels. */
const paintedActor = (image: string, size: number, idleY = 0, moveY = 256): ActorArt => ({
  clips: { idle: row(image, 0, idleY, 256, 256, 4, .2), move: row(image, 0, moveY, 256, 256, 4, .12) },
  anchor: [.5, .89], footprint: [size, size], orientation: 'mirror',
});
const paintedObject = (x: number, y: number, size: number, anchor: readonly [number, number] = [.5, .89]): Decoration => ({
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
    keeper: paintedActor('keeper', 76),
    crawler: { ...paintedActor('goblins', 58, 0, 0), clips: { idle: still('goblins', [0, 0, 256, 256]), move: row('goblins', 0, 0, 256, 256, 4, .12) } },
    charger: { ...paintedActor('goblins', 64), clips: { idle: still('goblins', [0, 256, 256, 256]), move: row('goblins', 0, 256, 256, 256, 4, .1) } },
    elite: paintedActor('elite', 112),
  },
  objects: {
    gem: paintedObject(0, 256, 19, [.5, .5]),
    halo: paintedObject(256, 256, 30, [.5, .5]),
    shard: paintedObject(512, 256, 26, [.5, .5]),
  },
  environment: {
    plate: frame('ground', [0, 0, 1536, 1024]), tileSize: 32, ground: [],
    perimeter: [paintedObject(0, 0, 112), paintedObject(256, 0, 76), paintedObject(512, 0, 80)],
  },
};
export const themes: Readonly<Record<ThemeId, Theme>> = {
  normal: {
    name: 'Normal', motif: 'grove', interface: 'classic', art: groveArt(),
    palette: { enemy: '#ae676e', elite: '#b75466', halo: '#efdb8b', hit: '#fff4d9', damage: '#ff8a82', background: '#0b171a', floor: '#172e29', boundary: '#708a6c', light: '#f5d58b',
      ground: '#7a9b7440', canopy: '#203d34', spark: '#b7edff', shard: '#d4b7ff', pulse: '#88e0d0', gem: '#9cecaa' },
  },
  assets: emberRuins,
  quality: {
    ...emberRuins, name: 'Ember Ruins · Rekindled', presentation: 'ember', interface: 'ember',
    art: rekindledArt,
    palette: { ...emberRuins.palette, background: '#10191d', floor: '#202a2d', boundary: '#9c9275',
      light: '#ffd494', ground: '#879580', canopy: '#273a3d', enemy: '#cc887e', elite: '#f1aa87',
      spark: '#ffe3a6', halo: '#ffe6ae', shard: '#c7c3ff', pulse: '#ffa578', gem: '#90edbd' },
  },
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
