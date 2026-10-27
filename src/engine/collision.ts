/** Earliest swept circle intersection in relative space, including initial overlap.
 * Supply the same target endpoints for a stationary circle. No game rules live here. */
export function sweptCircle(
  start: { x: number; y: number }, end: { x: number; y: number },
  targetStart: { x: number; y: number }, targetEnd: { x: number; y: number }, radius: number,
): number | undefined {
  const x = start.x - targetStart.x, y = start.y - targetStart.y;
  const dx = end.x - start.x - (targetEnd.x - targetStart.x);
  const dy = end.y - start.y - (targetEnd.y - targetStart.y);
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (!a) return undefined;
  const b = x * dx + y * dy, discriminant = b * b - a * c;
  if (discriminant < 0) return undefined;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t >= 0 && t <= 1 ? t : undefined;
}

/** Strict overlap: touching edges are support/contact boundaries, not penetration. */
export function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
