import type { Player } from './game.ts';

export interface KeeperPose { phase: number; lean: number }
/** Observe travel without advancing the run. Menus and stationary feet cannot wind the gait. */
export function createKeeperAnimation() {
  let previous: Pick<Player, 'x' | 'grounded'> | undefined;
  let phase = 0, lean = 0;
  return {
    reset() { previous = undefined; phase = lean = 0; },
    observe(player: Pick<Player, 'x' | 'vx' | 'grounded'>, dt: number): KeeperPose {
      const travel = previous ? Math.abs(player.x - previous.x) : 0;
      if (dt > 0 && player.grounded && previous?.grounded && travel < 60) phase = (phase + travel * Math.PI * 2 / 96) % (Math.PI * 2);
      const blend = 1 - Math.exp(-18 * Math.max(0, dt));
      lean += (player.vx / 300 - lean) * blend;
      previous = { x: player.x, grounded: player.grounded };
      return { phase, lean };
    },
  };
}
