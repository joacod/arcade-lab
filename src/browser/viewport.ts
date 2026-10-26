import { clearing } from '../content.ts';

export interface Viewport { scale: number; x: number; y: number }

export function createViewport(width: number, height: number): Viewport {
  const margin = clearing.presentation.margin;
  const scale = Math.min(width / (clearing.arena.width + margin * 2),
    height / (clearing.arena.height + margin * 2));
  return { scale, x: (width - clearing.arena.width * scale) / 2,
    y: (height - clearing.arena.height * scale) / 2 };
}

export function toWorld(view: Viewport, x: number, y: number) {
  return { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale };
}
