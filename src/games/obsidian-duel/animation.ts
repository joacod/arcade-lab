import { fighters, type FighterId } from './content.ts';
import type { Fighter } from './game.ts';

export type Point = [number, number];
export const duelClips = {
  idle: 4, walk: 8, jump: 3, crouch: 1, guard: 1, crouchGuard: 1,
  light: 8, heavy: 8, sweep: 8, air: 8, special: 8,
  hurt: 3, block: 2, down: 4, rise: 4, land: 3,
} as const;
export type DuelClip = keyof typeof duelClips;
export interface AnimationSample { clip: DuelClip; frame: number }
interface KeyPose {
  hip: Point; lean: number; frontHand: Point; backHand: Point; frontFoot: Point; backFoot: Point;
  twist: number; cloth: number; headTilt: number;
}
export interface DuelPose {
  hip: Point; shoulder: Point; head: Point; headTilt: number; twist: number; cloth: number;
  armFront: Point; armBack: Point; elbowFront: Point; elbowBack: Point; handFront: Point; handBack: Point;
  legFront: Point; legBack: Point; kneeFront: Point; kneeBack: Point; footFront: Point; footBack: Point;
}
const clamp = (x: number, low = 0, high = 1) => Math.max(low, Math.min(high, x));
const pointMix = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const stance: KeyPose = { hip: [-5, -66], lean: .12, frontHand: [43, -109], backHand: [0, -110], frontFoot: [32, 0], backFoot: [-32, 0], twist: .15, cloth: 0, headTilt: 0 };
const key = (overrides: Partial<KeyPose> = {}): KeyPose => ({ ...stance, ...overrides });
const crouch = key({ hip: [-8, -43], lean: .35, frontHand: [42, -73], backHand: [7, -85], frontFoot: [43, 0], backFoot: [-36, 0], cloth: -.4 });
const guard = key({ lean: -.05, frontHand: [29, -137], backHand: [39, -119], twist: -.2 });
const lowGuard = { ...crouch, frontHand: [27, -108] as Point, backHand: [39, -87] as Point, lean: .14 };
const hurt = key({ hip: [-10, -63], lean: -.30, frontHand: [31, -86], backHand: [-23, -95], headTilt: -.2, cloth: .4 });
const fallen = key({ hip: [-25, -13], lean: -1.34, frontHand: [-54, -5], backHand: [-77, -8], frontFoot: [33, 0], backFoot: [8, -7], headTilt: -1.1, twist: -.3, cloth: -.8 });

/** Authored whole-body keys: anticipation, chamber, contact, follow-through, recoil and settle. */
function attackKeys(kind: FighterId, clip: DuelClip): readonly KeyPose[] {
  const nera = kind === 'nera';
  if (clip === 'light') return [stance,
    key({ hip: [-9, -65], lean: -.04, frontHand: [17, -112], twist: -.3 }),
    key({ hip: [-4, -65], lean: .08, frontHand: [23, -110], backHand: [0, -118], twist: -.4 }),
    key({ hip: [9, -65], lean: .28, frontHand: [nera ? 101 : 91, -112], backHand: [8, -119], twist: .7, cloth: .5 }),
    key({ hip: [11, -64], lean: .32, frontHand: [nera ? 104 : 94, -109], backHand: [10, -116], twist: .8, cloth: .7 }),
    key({ hip: [5, -65], lean: .19, frontHand: [71, -109], twist: .4, cloth: .5 }),
    key({ hip: [-3, -66], frontHand: [32, -112], cloth: .2 }), stance];
  if (clip === 'heavy' && nera) return [stance,
    key({ hip: [1, -65], lean: -.08, frontFoot: [18, -13], frontHand: [31, -123], twist: -.3 }),
    key({ hip: [13, -65], lean: -.14, frontFoot: [30, -69], backFoot: [-7, 0], frontHand: [21, -124], twist: -.5, cloth: -.3 }),
    key({ hip: [36, -64], lean: -.23, frontFoot: [113, -98], backFoot: [15, 0], frontHand: [6, -121], backHand: [-17, -114], twist: .5, cloth: .9 }),
    key({ hip: [36, -63], lean: -.28, frontFoot: [115, -94], backFoot: [15, 0], frontHand: [2, -120], twist: .7, cloth: 1 }),
    key({ hip: [15, -64], lean: -.13, frontFoot: [43, -65], backFoot: [-3, 0], frontHand: [29, -122], twist: .1, cloth: .7 }),
    key({ hip: [2, -65], frontFoot: [29, -13], backFoot: [-23, 0], cloth: .3 }), stance];
  if (clip === 'heavy') return [stance,
    key({ hip: [-12, -63], lean: -.12, frontHand: [8, -121], backHand: [-20, -113], twist: -.5 }),
    key({ hip: [-7, -61], lean: -.15, frontHand: [11, -145], backHand: [-19, -117], twist: -.7, cloth: -.4 }),
    key({ hip: [31, -61], lean: .4, frontHand: [133, -102], backHand: [13, -116], backFoot: [-6, 0], frontFoot: [57, 0], twist: .9, cloth: 1 }),
    key({ hip: [31, -60], lean: .43, frontHand: [136, -94], backHand: [16, -113], backFoot: [-6, 0], frontFoot: [57, 0], twist: 1, cloth: 1 }),
    key({ hip: [18, -62], lean: .22, frontHand: [71, -101], backFoot: [-15, 0], frontFoot: [47, 0], twist: .5, cloth: .7 }),
    key({ hip: [0, -64], frontHand: [36, -110], frontFoot: [37, 0], cloth: .25 }), stance];
  if (clip === 'special' && !nera) return [stance,
    key({ hip: [-14, -62], lean: -.16, frontHand: [10, -103], backHand: [-28, -111], twist: -.6 }),
    key({ hip: [-10, -60], lean: -.2, frontHand: [-8, -101], backHand: [-23, -119], frontFoot: [30, 0], twist: -.7, cloth: -.4 }),
    key({ hip: [28, -61], lean: .4, frontHand: [112, -108], backHand: [15, -112], backFoot: [-10, 0], frontFoot: [54, 0], twist: .9, cloth: 1 }),
    key({ hip: [30, -60], lean: .44, frontHand: [115, -105], backHand: [18, -110], backFoot: [-10, 0], frontFoot: [54, 0], twist: 1, cloth: 1 }),
    key({ hip: [19, -61], lean: .25, frontHand: [79, -103], backFoot: [-16, 0], frontFoot: [47, 0], twist: .5, cloth: .7 }),
    key({ hip: [0, -64], frontHand: [39, -108], frontFoot: [37, 0], cloth: .25 }), stance];
  if (clip === 'sweep') return [crouch,
    { ...crouch, hip: [-14, -45], frontFoot: [22, -3], twist: -.4 },
    { ...crouch, hip: [-3, -43], frontFoot: [24, -9], frontHand: [17, -91], twist: -.6 },
    { ...crouch, hip: [25, -44], lean: .28, frontFoot: [105, -6], backFoot: [-5, 0], frontHand: [7, -85], twist: .7, cloth: .8 },
    { ...crouch, hip: [27, -44], lean: .34, frontFoot: [108, -6], backFoot: [-5, 0], frontHand: [4, -83], twist: .8, cloth: 1 },
    { ...crouch, hip: [12, -43], frontFoot: [68, -8], backFoot: [-17, 0], twist: .3, cloth: .6 },
    { ...crouch, frontFoot: [45, -2], cloth: .2 }, crouch];
  if (clip === 'air') return [
    key({ frontFoot: [33, -25], backFoot: [-24, -28], frontHand: [32, -121] }),
    key({ hip: [-6, -67], lean: -.15, frontFoot: [22, -65], backFoot: [-24, -37], frontHand: [17, -128], twist: -.3 }),
    key({ hip: [1, -68], lean: -.22, frontFoot: [28, -71], backFoot: [-22, -39], frontHand: [8, -127], twist: -.4 }),
    key({ hip: [12, -67], lean: -.24, frontFoot: [92, -51], backFoot: [-17, -35], frontHand: [1, -129], twist: .5, cloth: .9 }),
    key({ hip: [13, -67], lean: -.19, frontFoot: [94, -45], backFoot: [-19, -33], frontHand: [8, -128], twist: .7, cloth: 1 }),
    key({ hip: [3, -66], frontFoot: [49, -38], backFoot: [-22, -29], frontHand: [23, -120], cloth: .6 }),
    key({ frontFoot: [29, -22], backFoot: [-28, -19], cloth: .3 }),
    key({ frontFoot: [30, -17], backFoot: [-29, -14] })];
  if (clip === 'special') return [stance,
    key({ hip: [-11, -63], lean: -.1, frontHand: [10, -91], backHand: [-4, -104], twist: -.4 }),
    key({ hip: [-6, -62], lean: -.04, frontHand: [21, -92], backHand: [13, -107], twist: -.3, cloth: -.3 }),
    key({ hip: [13, -64], lean: .24, frontHand: [96, -92], backHand: [80, -107], backFoot: [-19, 0], twist: .7, cloth: .8 }),
    key({ hip: [14, -64], lean: .24, frontHand: [98, -90], backHand: [84, -104], backFoot: [-19, 0], twist: .7, cloth: 1 }),
    key({ hip: [7, -65], lean: .17, frontHand: [65, -95], backHand: [41, -108], twist: .4, cloth: .5 }),
    key({ frontHand: [37, -107], backHand: [9, -111], cloth: .2 }), stance];
  return [stance];
}

function poseKeys(kind: FighterId, clip: DuelClip): readonly KeyPose[] {
  if (['light', 'heavy', 'sweep', 'air', 'special'].includes(clip)) return attackKeys(kind, clip);
  switch (clip) {
    case 'idle': return [stance, key({ hip: [-5, -65], lean: .13 }), stance, key({ hip: [-5, -66.7], lean: .10 })];
    case 'jump': return [key({ frontFoot: [27, -29], backFoot: [-25, -36], frontHand: [27, -127] }), key({ lean: -.05, frontFoot: [34, -33], backFoot: [-30, -29], frontHand: [35, -122] }), key({ frontFoot: [30, -8], backFoot: [-29, -15], frontHand: [41, -110] })];
    case 'crouch': return [crouch];
    case 'guard': return [guard];
    case 'crouchGuard': return [lowGuard];
    case 'hurt': return [hurt, { ...hurt, lean: -.37, frontHand: [22, -83], headTilt: -.3 }, stance];
    case 'block': return [guard, { ...guard, hip: [-10, -65], lean: -.12, frontHand: [23, -134] }];
    case 'down': return [hurt, key({ hip: [-18, -43], lean: -.8, frontHand: [-19, -38], backHand: [-47, -47], frontFoot: [33, -8], backFoot: [4, -20], cloth: -.5 }), { ...fallen, hip: [-26, -18], lean: -1.25, cloth: -1 }, fallen];
    case 'rise': return [fallen, key({ hip: [-22, -35], lean: -.55, frontHand: [11, -8], backHand: [-36, -20], frontFoot: [30, 0], backFoot: [-27, 0], headTilt: -.15 }), crouch, stance];
    case 'land': return [stance, { ...crouch, hip: [-6, -52], lean: .24 }, stance];
    default: return [stance];
  }
}

/** Normal's fixed segment lengths stop elastic punches and disconnected knees between keys. */
export function solveLimb(start: Point, target: Point, upper: number, lower: number, side: number): [Point, Point] {
  const dx = target[0] - start[0], dy = target[1] - start[1], raw = Math.hypot(dx, dy), d = clamp(raw, Math.abs(upper - lower) + .01, upper + lower - .01);
  const ux = raw > .001 ? dx / raw : 1, uy = raw > .001 ? dy / raw : 0;
  const along = (upper * upper - lower * lower + d * d) / (2 * d), height = Math.sqrt(Math.max(0, upper * upper - along * along));
  return [[start[0] + ux * along - uy * height * side, start[1] + uy * along + ux * height * side], [start[0] + ux * d, start[1] + uy * d]];
}
export function samplePose(kind: FighterId, sample: AnimationSample): DuelPose {
  let k: KeyPose;
  if (sample.clip === 'walk') {
    const phase = ((sample.frame / 8) % 1 + 1) % 1;
    const foot = (p: number): Point => { p %= 1; const swing = (p - .6) / .4; return p < .6 ? [30 - 100 * p, 0] : [-30 + 60 * (swing * swing * (3 - 2 * swing)), -Math.sin(swing * Math.PI) * 10]; };
    k = key({ hip: [-5, -65 + Math.sin(phase * Math.PI * 4) * 1.2], frontFoot: foot(phase), backFoot: foot((phase + .5) % 1), lean: .12 + Math.sin(phase * Math.PI * 2) * .035, twist: Math.sin(phase * Math.PI * 2) * .25, cloth: Math.sin(phase * Math.PI * 2) * .2 });
  } else {
    const keys = poseKeys(kind, sample.clip), looping = sample.clip === 'idle';
    const f = looping ? sample.frame % keys.length : clamp(sample.frame, 0, keys.length - 1), a = keys[Math.floor(f)]!, b = keys[looping ? (Math.floor(f) + 1) % keys.length : Math.min(keys.length - 1, Math.floor(f) + 1)]!, t = f % 1;
    k = { hip: pointMix(a.hip, b.hip, t), lean: a.lean + (b.lean - a.lean) * t, frontHand: pointMix(a.frontHand, b.frontHand, t), backHand: pointMix(a.backHand, b.backHand, t), frontFoot: pointMix(a.frontFoot, b.frontFoot, t), backFoot: pointMix(a.backFoot, b.backFoot, t), twist: a.twist + (b.twist - a.twist) * t, cloth: a.cloth + (b.cloth - a.cloth) * t, headTilt: a.headTilt + (b.headTilt - a.headTilt) * t };
  }
  const torso = kind === 'nera' ? 46 : 48, shoulder: Point = [k.hip[0] + Math.sin(k.lean) * torso, k.hip[1] - Math.cos(k.lean) * torso];
  const armFront: Point = [shoulder[0] + 8, shoulder[1] + 3], armBack: Point = [shoulder[0] - 9, shoulder[1] + 4];
  const armLength = kind === 'nera' ? [31, 32] : [35, 37];
  const [elbowFront, handFront] = solveLimb(armFront, k.frontHand, armLength[0]!, armLength[1]!, k.frontHand[0] >= armFront[0] ? 1 : -1);
  const [elbowBack, handBack] = solveLimb(armBack, k.backHand, armLength[0]!, armLength[1]!, k.backHand[0] >= armBack[0] ? 1 : -1);
  const legFront: Point = [k.hip[0] + 5, k.hip[1]], legBack: Point = [k.hip[0] - 5, k.hip[1]];
  function leg(start: Point, foot: Point): [Point, Point] {
    let result = solveLimb(start, foot, 38, 40, -1);
    if (foot[1] === 0 && result[0][1] > -4) result = solveLimb(start, foot, 38, 40, 1);
    return result;
  }
  const [kneeFront, footFront] = leg(legFront, k.frontFoot), [kneeBack, footBack] = leg(legBack, k.backFoot);
  return { hip: k.hip, shoulder, head: [shoulder[0] + Math.sin(k.lean) * 22 + 4, shoulder[1] - Math.cos(k.lean) * 22], headTilt: k.headTilt, twist: k.twist, cloth: k.cloth, armFront, armBack, elbowFront, elbowBack, handFront, handBack, legFront, legBack, kneeFront, kneeBack, footFront, footBack };
}

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
