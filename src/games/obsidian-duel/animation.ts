import { fighters } from './content.ts';
import type { Fighter } from './game.ts';

export const duelClips = {
  idle: 4, walk: 8, jump: 3, crouch: 1, guard: 1, crouchGuard: 1,
  light: 8, heavy: 8, sweep: 8, air: 8, special: 8,
  hurt: 3, block: 2, down: 4, rise: 4, land: 3,
} as const;
export type DuelClip = keyof typeof duelClips;
export interface AnimationSample { clip: DuelClip; frame: number }
const clamp = (x: number, low = 0, high = 1) => Math.max(low, Math.min(high, x));

/** Cosmetic observations stay with the presentation; pausing and theme replacement cannot advance them. */
export function createDuelAnimation() {
  let observed: Fighter | undefined, previousX = 0, previousTime = 0, distance = 0, previousState = '', stateStart = 0;
  return {
    reset() { observed = undefined; distance = 0; previousState = ''; },
    sample(f: Fighter, time: number, reduced: boolean): AnimationSample {
      if (observed !== f || time < previousTime) { observed = f; previousX = f.x; distance = 0; previousState = f.state; stateStart = time; }
      if (f.state !== previousState) { stateStart = time; if (f.state === 'move') distance = 0; }
      if (f.state === 'move' && previousState === 'move') distance += (f.x - previousX) * f.facing;
      previousX = f.x; previousTime = time; previousState = f.state;
      const age = Math.max(0, time - stateStart);
      if (f.attack) {
        const d = fighters[f.kind].attacks[f.attack.kind], t = f.attack.time;
        // Contact drawings only enter at the actual active boundary, never during anticipation.
        const frame = t < d.startup ? Math.min(2, t / d.startup * 2.4) : t < d.startup + d.active ? 3 + clamp((t - d.startup) / d.active) : 4 + clamp((t - d.startup - d.active) / d.recovery) * 3;
        return { clip: f.attack.kind, frame };
      }
      if (f.state === 'ko') return { clip: 'down', frame: clamp(age / .22) * 3 };
      if (f.state === 'knockdown') return { clip: 'down', frame: clamp((.65 - f.stateTime) / .22) * 3 };
      if (f.state === 'wakeup') return { clip: 'rise', frame: clamp(1 - f.stateTime / .3) * 3 };
      if (f.state === 'hitstun') return { clip: 'hurt', frame: clamp(age / .24) * 2 };
      if (f.state === 'blockstun') return { clip: f.crouched ? 'crouchGuard' : 'block', frame: f.crouched ? 0 : Math.sin(clamp(1 - f.stateTime / .16) * Math.PI) };
      if (f.z > 0) return { clip: 'jump', frame: f.vz > 140 ? 0 : f.vz < -140 ? 2 : 1 };
      if (f.guarding) return { clip: f.crouched ? 'crouchGuard' : 'guard', frame: 0 };
      if (f.state === 'recovery' && !f.attack) return { clip: 'land', frame: clamp(1 - f.stateTime / .12) * 2 };
      if (f.crouched) return { clip: 'crouch', frame: 0 };
      if (f.state === 'move') return { clip: 'walk', frame: ((distance / 100 % 1 + 1) % 1) * 8 };
      return { clip: 'idle', frame: reduced ? 0 : (time * 2.4) % 4 };
    },
  };
}
