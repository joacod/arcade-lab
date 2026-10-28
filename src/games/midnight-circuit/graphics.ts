import type { BrawlerEvent, Run } from './game.ts';
import type { Screen } from './ui.ts';
export const appearances = { three: 'Neon diorama · Three.js', vgpu: 'Neon cinema · Three.js + WebGPU', canvas: 'Illustrated arcade · Canvas' } as const;
export type Appearance = keyof typeof appearances;
export interface CircuitRenderer {
  reset(): void;
  consume(events: readonly BrawlerEvent[]): void;
  draw(run: Run, size: { width: number; height: number; ratio: number }, screen: Screen, now: number): void;
  dispose(): void;
}
