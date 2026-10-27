import { row, still, type ActorArt, type Decoration, type ArtPack } from '../art-pack.ts';
import type { Theme } from '../themes.ts';
const actor = (id: number, size: number): ActorArt => ({
  clips: { idle: row(`idle${id}`, 0, 0, 32, 32, 4, 0.18), move: row(`move${id}`, 0, 0, 32, 32, 4, 0.11) },
  footprint: [size, size], anchor: [0.5, 0.73], orientation: 'mirror',
});
const prop = (rect: readonly [number, number, number, number], footprint: readonly [number, number]): Decoration => ({
  clip: still('terrain', rect), footprint, anchor: [0.5, 0.5],
});
export function createMosslight(images: ArtPack['images']): Theme {
  return {
    name: 'Mosslight', motif: 'grove', interface: 'rune',
    art: {
      images,
      sampling: 'nearest', actors: { keeper: actor(1, 52), crawler: actor(7, 44), elite: actor(8, 70) },
      environment: {
        tileSize: 32, groundOpacity: 0.55,
        border: prop([448, 64, 16, 16], [32, 32]),
        ground: [{ clip: still('terrain', [192, 448, 16, 16]), footprint: [32, 32], anchor: [0, 0] },
          { clip: still('terrain', [208, 448, 16, 16]), footprint: [32, 32], anchor: [0, 0] }],
        perimeter: [prop([432, 32, 16, 16], [40, 40]), prop([128, 48, 32, 32], [56, 56]),
          prop([240, 368, 32, 64], [40, 80]),
          { clip: row('fire', 0, 64, 32, 32, 5, 0.12), footprint: [48, 48], anchor: [0.5, 0.5] }],
      },
    },
    palette: { enemy: '#ae676e', elite: '#b75466', halo: '#efdb8b', hit: '#fff4d9', damage: '#ff8a82', shard: '#d7c0ff', background: '#262339', floor: '#405332', boundary: '#a49ac2', canopy: '#504669',
      ground: '#a4bf6540', light: '#ffe4b5', spark: '#fff1b5', pulse: '#a7f7db', gem: '#98fff4' },
  };
}
