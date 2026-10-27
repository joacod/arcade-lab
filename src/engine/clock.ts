export const FIXED_STEP = 1 / 60;
const MAX_ELAPSED = 0.1;
const MAX_STEPS = 5;

// Session timing is independent of run state. Discard excess catch-up work.
export function createClock() {
  let previous: number | undefined;
  let accumulator = 0;
  return {
    reset() { previous = undefined; accumulator = 0; },
    advance(now: number): number {
      if (previous === undefined) { previous = now; return 0; }
      accumulator += Math.max(0, Math.min(MAX_ELAPSED, (now - previous) / 1000));
      previous = now;
      const steps = Math.min(MAX_STEPS, Math.floor((accumulator + 1e-10) / FIXED_STEP));
      accumulator -= steps * FIXED_STEP;
      if (steps === MAX_STEPS) accumulator %= FIXED_STEP;
      return steps;
    },
  };
}
