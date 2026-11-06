import { type ImageDimensions } from '../../engine/browser/images.ts';
export function operatorCel(airborne: boolean, moving: boolean, phase: number, reduced: boolean, aimX: number, aimY: number) {
  const aim = aimY < -.4 ? Math.abs(aimX) < .4 ? 0 : 1 : aimY > .4 ? Math.abs(aimX) < .4 ? 4 : 3 : 2;
  const state = airborne ? 3 : reduced || !moving ? 0 : phase < .5 ? 1 : 2;
  return { aim, state };
}

import type { Environment, Operator } from './content.ts';
import type { Appearance } from './themes.ts';
type Rect = readonly [number, number, number, number];
type Pose = 'idle' | 'stepA' | 'stepB' | 'airborne' | 'recoil';
export type ObjectRole = 'relay' | 'offlineRelay' | 'barrel' | 'supply' | 'supplied' | 'rescue' | 'extraction'
  | 'grenade' | 'structure' | 'brick' | 'armor' | 'damagedBrick' | 'damagedArmor' | 'muzzle' | 'explosion' | 'smoke';
type EnemyRole = 'guard' | 'heavy' | 'bastion';
export interface BlastArtLayout {
  readonly smooth: boolean;
  readonly operators: {
    readonly cell: number;
    readonly rows: Readonly<Record<Operator, Readonly<Record<Exclude<Pose, 'recoil'>, number> & { recoil?: number }>>>;
    readonly draw: Rect;
    readonly origin: readonly [number, number];
    readonly run?: { readonly images: Readonly<Record<Operator, string>>; readonly frames: number };
  };
  readonly enemies: { readonly cell: number; readonly rows: Readonly<Record<EnemyRole, number>>; readonly draw: Readonly<Record<EnemyRole, Rect>> };
  readonly objects: Readonly<Partial<Record<ObjectRole, Rect>>>;
  readonly backdrops?: Readonly<Record<Environment, Rect>>;
}
const roles: readonly ObjectRole[] = ['relay', 'offlineRelay', 'barrel', 'supply', 'supplied', 'rescue', 'extraction',
  'grenade', 'structure', 'brick', 'armor', 'damagedBrick', 'damagedArmor', 'muzzle', 'explosion', 'smoke'];
function objectGrid(cell: number): Readonly<Partial<Record<ObjectRole, Rect>>> {
  return Object.fromEntries(roles.map((role, i) => [role, [i % 4 * cell, Math.floor(i / 4) * cell, cell, cell] as Rect]));
}
const arcadeRows = {
  nova: { idle: 0, stepA: 1, stepB: 2, airborne: 3 },
  bolt: { idle: 4, stepA: 5, stepB: 6, airborne: 7 },
} as const;
const operatorDrawing = { draw: [-20, -45, 48, 48], origin: [9, 32] } as const;
const enemyDrawing = { rows: { guard: 0, heavy: 1, bastion: 2 },
  draw: { guard: [-18, -1, 36, 34], heavy: [-18, -1, 36, 34], bastion: [-36, -10, 72, 64] } } as const;
const run = { images: { nova: 'novaRun', bolt: 'boltRun' }, frames: 6 } as const;
export const blastLayouts: Readonly<Record<Appearance, BlastArtLayout>> = {
  arcade: {
    smooth: false, operators: { ...operatorDrawing, cell: 128, rows: arcadeRows, run },
    enemies: { ...enemyDrawing, cell: 128 }, objects: objectGrid(128),
    backdrops: { harbor: [0, 0, 1536, 512], foundry: [0, 512, 1536, 512] },
  },
  deluxe: {
    smooth: true, operators: { ...operatorDrawing, cell: 192, run, rows: {
      nova: { idle: 0, stepA: 0, stepB: 0, airborne: 2, recoil: 1 },
      bolt: { idle: 3, stepA: 3, stepB: 3, airborne: 5, recoil: 4 },
    } },
    enemies: { ...enemyDrawing, cell: 192 }, objects: objectGrid(192),
    backdrops: { harbor: [0, 0, 2048, 512], foundry: [0, 512, 2048, 512] },
  },
};
/** Semantic observations select a complete drawing through the replaceable local layout. */
export function operatorFrame(layout: BlastArtLayout, operator: Operator, airborne: boolean, moving: boolean,
  phase: number, reduced: boolean, aimX: number, aimY: number, firing: boolean) {
  const { aim, state } = operatorCel(airborne, moving, phase, reduced, aimX, aimY);
  const art = layout.operators, running = art.run && moving && !airborne && !reduced;
  const pose: Pose = airborne ? 'airborne' : firing && !reduced && art.rows[operator].recoil !== undefined ? 'recoil' : (['idle', 'stepA', 'stepB', 'airborne'] as const)[state]!;
  const column = running ? Math.min(art.run!.frames - 1, Math.floor(phase * art.run!.frames)) : aim;
  const row = running ? aim : art.rows[operator][pose]!;
  return { image: running ? art.run!.images[operator] : 'operators', rect: [column * art.cell, row * art.cell, art.cell, art.cell] as Rect };
}

/** Reject missing sheets or out-of-bounds role mappings before activating replacement art. */
export function validateBlastLayout(layout: BlastArtLayout, dimensions: ImageDimensions): string[] {
  const errors: string[] = [];
  function frame(image: string, rect: Rect) {
    const size = dimensions[image], [x, y, width, height] = rect;
    if (!size || !rect.every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0
      || x + width > size.width || y + height > size.height) errors.push(`Invalid ${image} frame`);
  }
  const actors = layout.operators;
  for (const rows of Object.values(actors.rows)) for (const row of Object.values(rows)) {
    frame('operators', [0, row * actors.cell, 5 * actors.cell, actors.cell]);
  }
  if (actors.run) for (const image of Object.values(actors.run.images)) {
    frame(image, [0, 0, actors.run.frames * actors.cell, 5 * actors.cell]);
  }
  for (const row of Object.values(layout.enemies.rows)) {
    frame('enemies', [0, row * layout.enemies.cell, 3 * layout.enemies.cell, layout.enemies.cell]);
  }
  for (const rect of Object.values(layout.objects)) frame('objects', rect);
  for (const rect of Object.values(layout.backdrops ?? {})) frame('backdrop', rect);
  return errors;
}
