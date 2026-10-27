/** Presentation coordinates are CSS pixels; backing resolution is a browser concern. */
export interface Viewport { scale: number; x: number; y: number }
export interface Point { x: number; y: number }
export interface Surface { width: number; height: number }
export type ViewMode = 'close' | 'arena';
export const framing = {
  boundaryPadding: 48,
  narrowWidth: 600,
  closeScale: 1.375,
  narrowCloseScale: 1,
  cueInset: 32,
} as const;

export function createViewport(bounds: Surface, surface: Surface, target: Point, mode: ViewMode): Viewport {
  const paddedWidth = bounds.width + framing.boundaryPadding * 2;
  const paddedHeight = bounds.height + framing.boundaryPadding * 2;
  const fit = Math.min(surface.width / paddedWidth, surface.height / paddedHeight);
  const scale = mode === 'arena' ? fit : Math.max(fit,
    surface.width < framing.narrowWidth ? framing.narrowCloseScale : framing.closeScale);
  function offset(size: number, worldSize: number, position: number) {
    const span = size / scale;
    const center = span >= worldSize + framing.boundaryPadding * 2 ? worldSize / 2
      : Math.max(span / 2 - framing.boundaryPadding,
        Math.min(worldSize + framing.boundaryPadding - span / 2, position));
    return size / 2 - center * scale;
  }
  return { scale, x: offset(surface.width, bounds.width, target.x),
    y: offset(surface.height, bounds.height, target.y) };
}
export function toWorld(view: Viewport, x: number, y: number): Point {
  return { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale };
}
export function toScreen(view: Viewport, point: Point): Point {
  return { x: view.x + point.x * view.scale, y: view.y + point.y * view.scale };
}
/** A cue points toward an offscreen world position, without changing entry/target rules. */
export function edgeCue(view: Viewport, surface: Surface, point: Point) {
  const at = toScreen(view, point);
  if (at.x >= 0 && at.x <= surface.width && at.y >= 0 && at.y <= surface.height) return undefined;
  const dx = at.x - surface.width / 2, dy = at.y - surface.height / 2;
  const halfWidth = Math.max(1, surface.width / 2 - framing.cueInset);
  const halfHeight = Math.max(1, surface.height / 2 - framing.cueInset);
  const factor = Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);
  return { x: surface.width / 2 + dx / factor, y: surface.height / 2 + dy / factor,
    angle: Math.atan2(dy, dx) };
}
