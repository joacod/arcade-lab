import { TILE, materialHealth, type Material, type Mission, type Rect, type Point } from './content.ts';
import { overlaps } from '../collision.ts';
export interface Terrain { columns: number; rows: number; material: Material[]; health: number[]; revision: number }
export function createTerrain(mission: Pick<Mission, 'columns' | 'rows' | 'terrain'>): Terrain {
  return { columns: mission.columns, rows: mission.rows, material: [...mission.terrain], health: mission.terrain.map(m => materialHealth[m]), revision: 0 };
}
export function indexAt(t: Terrain, c: number, r: number): number {
  return c >= 0 && r >= 0 && c < t.columns && r < t.rows ? r * t.columns + c : -1;
}
export function solidAt(t: Terrain, x: number, y: number): boolean {
  const i = indexAt(t, Math.floor(x / TILE), Math.floor(y / TILE));
  return i >= 0 && t.material[i] !== 0;
}
export function tileRect(t: Terrain, i: number): Rect { return { x: i % t.columns * TILE, y: Math.floor(i / t.columns) * TILE, w: TILE, h: TILE }; }
export function damageTile(t: Terrain, i: number, amount: number): boolean {
  if (i < 0 || i >= t.material.length || !Number.isFinite(amount) || amount <= 0 || (t.material[i] ?? 0) < 2) return false;
  t.health[i] = Math.max(0, t.health[i]! - amount); t.revision++;
  if (t.health[i] === 0) { t.material[i] = 0; return true; }
  return false;
}
export function forTiles(t: Terrain, area: Rect, visit: (i: number, rect: Rect) => void) {
  const left = Math.max(0, Math.floor(area.x / TILE)), right = Math.min(t.columns - 1, Math.floor((area.x + area.w) / TILE));
  const top = Math.max(0, Math.floor(area.y / TILE)), bottom = Math.min(t.rows - 1, Math.floor((area.y + area.h) / TILE));
  for (let r = top; r <= bottom; r++) for (let c = left; c <= right; c++) {
    const i = r * t.columns + c; if (t.material[i]) visit(i, { x: c * TILE, y: r * TILE, w: TILE, h: TILE });
  }
}
/** Exact slab intersection for a segment, including starts inside a rectangle. */
export function segmentRect(a: Point, b: Point, rect: Rect, padding = 0): number | undefined {
  let enter = 0, leave = 1;
  for (const axis of ['x', 'y'] as const) {
    const lo = rect[axis] - padding, hi = rect[axis] + (axis === 'x' ? rect.w : rect.h) + padding, d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-10) { if (a[axis] < lo || a[axis] > hi) return; }
    else {
      const t1 = (lo - a[axis]) / d, t2 = (hi - a[axis]) / d;
      enter = Math.max(enter, Math.min(t1, t2)); leave = Math.min(leave, Math.max(t1, t2));
      if (enter > leave) return;
    }
  }
  return enter;
}
/** Test every occupied tile in the bounded swept AABB, selecting the earliest contact. */
export function traceTerrain(t: Terrain, a: Point, b: Point, padding = 0): { time: number; index: number } | undefined {
  let hit: { time: number; index: number } | undefined;
  forTiles(t, { x: Math.min(a.x, b.x) - padding, y: Math.min(a.y, b.y) - padding, w: Math.abs(b.x - a.x) + padding * 2, h: Math.abs(b.y - a.y) + padding * 2 }, (index, rect) => {
    const time = segmentRect(a, b, rect, padding);
    if (time !== undefined && (!hit || time < hit.time)) hit = { time, index };
  });
  return hit;
}
export interface Body extends Rect { vx: number; vy: number; grounded: boolean }
/** Swept leading edges, evaluated against this step's mutable grid. Support is never cached. */
export function moveBody(t: Terrain, actor: Body, dt: number) {
  const oldX = actor.x, oldY = actor.y, dx = actor.vx * dt, dy = actor.vy * dt;
  let x = oldX + dx;
  forTiles(t, { x: Math.min(oldX, x) - 1, y: oldY, w: actor.w + Math.abs(dx) + 2, h: actor.h - 1e-7 }, (_, s) => {
    if (oldY + actor.h <= s.y || oldY >= s.y + s.h) return;
    if (dx > 0 && oldX + actor.w <= s.x + 1e-7 && x + actor.w >= s.x) x = Math.min(x, s.x - actor.w);
    if (dx < 0 && oldX >= s.x + s.w - 1e-7 && x <= s.x + s.w) x = Math.max(x, s.x + s.w);
  });
  actor.x = Math.max(TILE, Math.min(t.columns * TILE - TILE - actor.w, x));
  if (Math.abs(actor.x - (oldX + dx)) > 1e-7) actor.vx = 0;
  let y = oldY + dy; actor.grounded = false;
  forTiles(t, { x: actor.x, y: Math.min(oldY, y) - 1, w: actor.w - 1e-7, h: actor.h + Math.abs(dy) + 2 }, (_, s) => {
    if (actor.x + actor.w <= s.x || actor.x >= s.x + s.w) return;
    if (dy >= 0 && oldY + actor.h <= s.y + 1e-7 && y + actor.h >= s.y) { y = Math.min(y, s.y - actor.h); actor.grounded = true; }
    if (dy < 0 && oldY >= s.y + s.h - 1e-7 && y <= s.y + s.h) { y = Math.max(y, s.y + s.h); actor.vy = 0; }
  });
  actor.y = y; if (actor.grounded) actor.vy = 0;
}
export function circleTouchesRect(point: Point, radius: number, rect: Rect): boolean {
  const dx = point.x - Math.max(rect.x, Math.min(rect.x + rect.w, point.x));
  const dy = point.y - Math.max(rect.y, Math.min(rect.y + rect.h, point.y));
  return dx * dx + dy * dy <= radius * radius;
}
export function bodyClear(t: Terrain, rect: Rect): boolean {
  let clear = true; forTiles(t, rect, (_, tile) => { if (overlaps(rect, tile)) clear = false; }); return clear;
}
