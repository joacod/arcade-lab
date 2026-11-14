import type { Floor, Point } from './content.ts';
export function inside(p: Point, r: Floor) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
export function project(p: Point, floors: readonly Floor[]): Point {
  const candidates = floors.map(r => ({ x: Math.max(r.x, Math.min(r.x + r.w, p.x)), y: Math.max(r.y, Math.min(r.y + r.h, p.y)) }));
  return candidates.reduce((best, q) => Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? q : best);
}
/** Connected convex floor cells. Portal segments stay within their owning cell. */
export function route(start: Point, end: Point, floors: readonly Floor[]): Point[] | undefined {
  const from = floors.findIndex(r => inside(start, r)), to = floors.findIndex(r => inside(end, r));
  if (from < 0 || to < 0) return undefined;
  const queue = [from], seen = new Set([from]), previous = new Map<number, { cell: number; portal: Point }>();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor]!;
    if (current === to) {
      const path = [end];
      for (let cell = to; cell !== from;) { const edge = previous.get(cell)!; path.unshift(edge.portal); cell = edge.cell; }
      return path;
    }
    floors.forEach((b, i) => {
      if (seen.has(i)) return;
      const a = floors[current]!, left = Math.max(a.x, b.x), right = Math.min(a.x + a.w, b.x + b.w);
      const top = Math.max(a.y, b.y), bottom = Math.min(a.y + a.h, b.y + b.h);
      if (right < left || bottom < top || right === left && bottom === top) return;
      seen.add(i); previous.set(i, { cell: current, portal: { x: (left + right) / 2, y: (top + bottom) / 2 } }); queue.push(i);
    });
  }
  return undefined;
}
