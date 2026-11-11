import { fragmentShape, pickupHull } from './content.ts';
interface Point { x: number; y: number }
const diamond = [
  { x: 0, y: -fragmentShape.halfHeight }, { x: fragmentShape.halfWidth, y: 0 },
  { x: 0, y: fragmentShape.halfHeight }, { x: -fragmentShape.halfWidth, y: 0 },
];
const axes = [pickupHull, diamond].flatMap(polygon => polygon.map((point, i) => {
  const next = polygon[(i + 1) % polygon.length]!;
  return { x: point.y - next.y, y: next.x - point.x };
}));
const intervals = axes.map(axis => {
  const body = pickupHull.map(point => point.x * axis.x + point.y * axis.y);
  const gem = diamond.map(point => point.x * axis.x + point.y * axis.y);
  return { axis, low: Math.min(...gem) - Math.max(...body), high: Math.max(...gem) - Math.min(...body) };
});

/** Swept body/diamond contact catches fast scrolling and sideways drags without
 * collecting near misses in the empty corners of a circular pickup halo. */
export function touchesFragment(start: Point, end: Point, fragment: Point): boolean {
  let enter = 0, exit = 1;
  for (const { axis, low, high } of intervals) {
    const position = (start.x - fragment.x) * axis.x + (start.y - fragment.y) * axis.y;
    const movement = (end.x - start.x) * axis.x + (end.y - start.y) * axis.y;
    if (Math.abs(movement) < 1e-10) {
      if (position < low || position > high) return false;
      continue;
    }
    const a = (low - position) / movement, b = (high - position) / movement;
    enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return false;
  }
  return true;
}
