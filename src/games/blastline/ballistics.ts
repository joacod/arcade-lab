import { enemyGrenade, type Point } from './content.ts';

/** Committed ballistic arc shared by the firing decision and its warning. */
export function lobVelocity(from: Point, target: Point) {
  const time = enemyGrenade.flight;
  return { vx: (target.x - from.x) / time, vy: (target.y - from.y) / time - enemyGrenade.gravity * time / 2 };
}
export function lobPoint(from: Point, target: Point, time: number): Point {
  const velocity = lobVelocity(from, target);
  return { x: from.x + velocity.vx * time, y: from.y + velocity.vy * time + enemyGrenade.gravity * time * time / 2 };
}
