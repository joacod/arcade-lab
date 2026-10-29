import type { FlightEvent, Run } from './game.ts';

export interface FlightSize { readonly width: number; readonly height: number; readonly ratio: number }
/** Game-local boundary: renderers observe a sortie, never advance it or own a frame loop. */
export interface FlightPresentation {
  readonly element: HTMLElement;
  reset(): void;
  consume(events: readonly FlightEvent[]): void;
  draw(run: Run, size: FlightSize, attractTime?: number): void;
  dispose(): void;
}
