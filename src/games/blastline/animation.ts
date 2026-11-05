import type { Body } from './terrain.ts';

export interface GroundPose { phase: number; moving: boolean }
/** One complete left/right stride per 96 world units, independent of world position. */
export function createGroundGait() {
  let previous: Pick<Body, 'x' | 'y' | 'grounded'> | undefined;
  let phase = 0;
  return {
    reset() { previous = undefined; phase = 0; },
    observe(body: Pick<Body, 'x' | 'y' | 'vx' | 'grounded'>, dt: number): GroundPose {
      const travel = previous ? Math.abs(body.x - previous.x) : 0;
      const moving = body.grounded && Math.abs(body.vx) > 5;
      if (dt > 0) {
        if (!moving || !previous?.grounded || travel > 64 || Math.abs(body.y - previous.y) > 48) phase = 0;
        else phase = (phase + travel / 96) % 1;
      }
      previous = { x: body.x, y: body.y, grounded: body.grounded };
      return { phase, moving };
    },
  };
}
