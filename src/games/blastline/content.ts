/** Physical dimensions and authored missions. All coordinates are world pixels. */
export const TILE = 24;
export interface Point { x: number; y: number }
export interface Rect extends Point { w: number; h: number }
export type Material = 0 | 1 | 2 | 3; // air, structure, brick, armor
export const materialHealth = [0, 0, 3, 8] as const;
export type Operator = 'nova' | 'bolt';
export const operators = {
  nova: { name: 'Nova', role: 'ASSAULT', speed: 210, interval: .105, damage: 1, tileDamage: 1, speedShot: 1200, radius: 0 },
  bolt: { name: 'Bolt', role: 'DEMOLITION', speed: 192, interval: .62, damage: 5, tileDamage: 5, speedShot: 650, radius: 83 },
} as const;
export const body = { w: 18, h: 30, gravity: 1350, jump: 510, fall: 640, health: 5, lives: 5, grenades: 4 } as const;
export const inputTiming = { fireBuffer: .12 } as const;
export const limits = { projectiles: 96, events: 160, particles: 240, explosions: 160 } as const;
export const enemyTypes = {
  guard: { health: 3, w: 18, h: 30, sight: 390, warning: .35, burst: 3, recovery: 1.7, speedShot: 285, radius: 0 },
  heavy: { health: 12, w: 25, h: 30, sight: 390, warning: .85, burst: 2, recovery: 2.1, speedShot: 235, radius: 48 },
  bastion: { health: 140, w: 58, h: 50, sight: 550, warning: .85, burst: 4, recovery: 2.1, speedShot: 235, radius: 48 },
} as const;
export const fuel = { w: 18, h: 26, health: 2, radius: 104, damage: 9, tileDamage: 7 } as const;
export const relay = { w: 28, h: 32, health: 22 } as const;
export const grenade = { radius: 116, damage: 8, tileDamage: 8, fuse: 1.05 } as const;
export interface EnemyDefinition extends Point { kind: 'guard' | 'heavy' | 'bastion'; patrol: number }
export interface Mission {
  name: string; subtitle: string; columns: number; rows: number;
  terrain: readonly Material[]; start: Point; checkpoints: readonly Point[];
  enemies: readonly EnemyDefinition[]; barrels: readonly Point[]; relays: readonly Point[];
  rescue: Point | null; exit: Rect; signs: readonly (Point & { text: string; sub: string })[];
}
function author(foundry: boolean): Mission {
  const columns = foundry ? 450 : 360, rows = 32;
  const terrain: Material[] = Array(columns * rows).fill(0);
  function fill(x: number, y: number, w: number, h: number, material: Material) {
    for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) terrain[r * columns + c] = material;
  }
  fill(0, 29, columns, 3, 1); // Continuous safe structural route below the destructible surface.
  fill(0, 27, columns, 2, 1);
  fill(0, 0, 1, rows, 1); fill(columns - 1, 0, 1, rows, 1);
  const enemies: EnemyDefinition[] = [], barrels: Point[] = [];
  const at = (c: number, r = 27) => ({ x: c * TILE + 3, y: r * TILE - body.h });
  const camps = foundry ? [23, 58, 94, 130, 168, 205, 242, 279, 316, 350, 384, 415] : [22, 58, 96, 133, 170, 207, 244, 279, 315];
  for (const [i, c] of camps.entries()) {
    // Low cover can be shot open or vaulted. Upper shelves offer optional firing positions.
    fill(c, 25, 2, 2, i % 3 === 2 ? 3 : 2);
    fill(c + 4, 27, 7, 2, 2);
    enemies.push({ ...at(c + 8), kind: foundry && i % 3 === 1 ? 'heavy' : 'guard', patrol: i % 2 ? 36 : 0 });
    barrels.push({ x: (c + 4) * TILE + 12, y: 635 });
    if (i % 2 === 0) barrels.push({ x: (c + 7) * TILE + 12, y: 635 });
    if (i % 3 !== 0 || foundry) {
      fill(c + 10, 23, 6, 1, 2); fill(c + 7, 25, 2, 1, 1);
      enemies.push({ ...at(c + 13, 23), kind: 'guard', patrol: 24 });
      barrels.push({ x: (c + 12) * TILE + 12, y: 539 });
    }
    if (foundry && i % 3 === 0) {
      fill(c + 14, 20, 6, 1, 3); fill(c + 11, 22, 2, 1, 1);
      enemies.push({ ...at(c + 17, 20), kind: 'heavy', patrol: 0 });
      barrels.push({ x: (c + 16) * TILE + 12, y: 467 });
    }
  }
  const relays = (foundry ? [115, 254, 397] : [116, 304]).map((c, i) => ({ x: c * TILE, y: foundry && i < 2 ? 520 + i * 24 : 616 }));
  if (foundry) {
    // Two power decks require a short climb. Structural stairs survive every explosion.
    for (const [c, top] of [[114, 23], [253, 24]] as const) {
      fill(c - 6, 20, 14, 7, 0);
      fill(c, top, 3, 29 - top, 1);
      fill(c - 6, 26, 2, 3, 1); fill(c - 4, 25, 2, 4, 1); fill(c - 2, 24, 2, 5, 1);
      fill(c + 3, 25, 2, 4, 1); fill(c + 5, 26, 2, 3, 1);
    }
  }
  // Objectives and supply posts sit on immutable plinths; damage cannot remove their access.
  const checkpoints = (foundry ? [145, 292, 403] : [144, 267]).map(c => at(c));
  const rescue = foundry ? null : { x: 190 * TILE, y: 618 };
  const exit = { x: (columns - 12) * TILE, y: 568, w: 168, h: 80 };
  if (foundry) {
    enemies.push({ ...at(433), kind: 'bastion', patrol: 0 });
    fill(428, 24, 2, 3, 3); fill(436, 24, 2, 3, 3);
    barrels.push({ x: 431 * TILE, y: 635 }, { x: 434 * TILE, y: 635 });
  }
  return { name: foundry ? 'Foundry Run' : 'Border Station', subtitle: foundry ? 'CUT THE POWER. BREAK THE BASTION.' : 'BREAK IN. BRING BOLT HOME.',
    columns, rows, terrain, start: at(4), checkpoints, enemies, barrels, relays, rescue, exit,
    signs: foundry ? [
      { x: 120, y: 560, text: '02 / FOUNDRY RUN', sub: '3 RELAYS + THE BASTION →' },
      { x: 95 * TILE, y: 470, text: 'TAKE THE HIGH ROAD', sub: 'W + D + J / DIAGONAL FIRE' },
      { x: 411 * TILE, y: 490, text: 'THE BASTION', sub: 'WAIT FOR THE RED CHARGE. KEEP MOVING.' },
    ] : [
      { x: 125, y: 540, text: 'MAKE AN ENTRANCE.', sub: 'A D MOVE / SPACE JUMP / HOLD J FIRE' },
      { x: 29 * TILE, y: 485, text: 'COVER IS TEMPORARY.', sub: 'K THROWS A GRENADE / RED BARRELS CHAIN' },
      { x: 178 * TILE, y: 535, text: 'ONE OF OURS.', sub: 'REACH BOLT / Q SWITCHES OPERATORS' },
    ] };
}
export const missions: readonly Mission[] = [author(false), author(true)];
