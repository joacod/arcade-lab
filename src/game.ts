import { clearing } from './content.ts';

export interface MoveAction { readonly x: number; readonly y: number }
export interface RunState {
  player: { x: number; y: number };
  elapsed: number;
}

export function createRun(): RunState {
  return {
    player: { x: clearing.arena.width / 2, y: clearing.arena.height / 2 },
    elapsed: 0,
  };
}

export function stepRun(run: RunState, move: MoveAction, seconds: number): void {
  const magnitude = Math.max(1, Math.hypot(move.x, move.y));
  const distance = clearing.keeper.speed * seconds;
  const { radius } = clearing.keeper;
  run.player.x = Math.max(radius, Math.min(clearing.arena.width - radius,
    run.player.x + move.x / magnitude * distance));
  run.player.y = Math.max(radius, Math.min(clearing.arena.height - radius,
    run.player.y + move.y / magnitude * distance));
  run.elapsed += seconds;
}
