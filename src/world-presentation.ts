import type { RunState, GameEvent } from './game-state.ts';
import type { Viewport, Surface } from './view.ts';

export interface DisplaySize extends Surface { readonly ratio: number }
/** Read-only clearing state crosses this boundary; renderer resources never do. */
export interface WorldPresentation {
  readonly canvas: HTMLCanvasElement;
  resize(size: DisplaySize): void;
  observe(run: Readonly<RunState>): void;
  reset(run: Readonly<RunState>): void;
  consume(events: readonly GameEvent[]): void;
  draw(run: Readonly<RunState>, view: Viewport, frame?: { readonly titleTime: number }): void;
  dispose(): void;
}
