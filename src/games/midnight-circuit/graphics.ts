import type { BrawlerEvent, Run } from './game.ts';
import type { Screen } from './ui.ts';
export const appearances = { normal: 'Normal', assets: 'Assets', quality: 'Quality' } as const;
export type Appearance = keyof typeof appearances;
export interface CircuitRenderer {
  reset(): void;
  consume(events: readonly BrawlerEvent[]): void;
  draw(run: Run, size: { width: number; height: number; ratio: number }, screen: Screen, now: number): void;
  dispose(): void;
}
