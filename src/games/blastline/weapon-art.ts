import type { Appearance } from './themes.ts';
import type { Point } from './content.ts';
import type { Projectile } from './state.ts';

// Inspected barrel tips in atlas-cell pixels. Rows follow the owning sheets, not
// gameplay hitboxes. Whole character cels stay registered at their existing feet.
type Tips = readonly (readonly (readonly [number, number])[])[];
export const weaponTips: Readonly<Record<Appearance, Readonly<Record<string, Tips>>>> = {
  arcade: {
    operators: [
      [[73,35],[88,54],[92,74],[88,94],[74,108]],
      [[73,34],[86,53],[93,72],[89,90],[75,113]],
      [[74,32],[88,52],[93,71],[89,89],[78,111]],
      [[74,30],[88,50],[93,68],[88,88],[75,104]],
      [[72,28],[88,48],[94,68],[91,90],[74,106]],
      [[74,28],[90,47],[95,65],[91,86],[74,103]],
      [[76,28],[92,48],[96,67],[90,87],[78,103]],
      [[75,28],[88,43],[94,65],[90,84],[72,101]],
    ],
    novaRun: [
      [[82,30],[81,31],[83,30],[82,31],[83,31],[84,31]],
      [[93,44],[93,44],[94,42],[93,44],[95,45],[95,44]],
      [[99,69],[98,69],[99,68],[99,70],[99,68],[100,69]],
      [[96,88],[95,88],[95,88],[96,87],[96,88],[94,89]],
      [[80,108],[79,106],[81,104],[79,108],[80,105],[82,106]],
    ],
    boltRun: [
      [[82,28],[82,29],[81,30],[80,30],[79,31],[78,32]],
      [[96,39],[96,41],[96,43],[95,43],[95,45],[94,46]],
      [[106,66],[104,66],[101,68],[100,67],[97,69],[96,69]],
      [[99,86],[99,88],[96,89],[94,89],[91,89],[89,89]],
      [[84,107],[81,107],[80,108],[81,111],[77,108],[78,108]],
    ],
    enemies: [
      [[107,59],[108,59],[107,59]],
      [[114,58],[114,58],[114,58]],
      [[120,54],[120,54],[118,54]],
    ],
  },
  deluxe: {
    operators: [
      [[100,15],[128,38],[131,71],[129,106],[104,151]],
      [[100,25],[124,41],[134,76],[131,106],[113,151]],
      [[101,17],[128,38],[133,69],[136,107],[112,147]],
      [[93,14],[120,32],[133,66],[131,100],[116,143]],
      [[97,25],[125,36],[135,70],[132,97],[124,139]],
      [[97,20],[126,32],[135,66],[138,99],[114,143]],
    ],
    novaRun: [
      [[133,28],[138,31],[137,29],[137,31],[138,36],[140,32]],
      [[143,42],[145,46],[142,42],[146,46],[147,51],[145,47]],
      [[156,69],[156,77],[151,68],[156,79],[155,80],[151,77]],
      [[154,100],[150,108],[149,99],[153,109],[149,109],[146,104]],
      [[138,132],[137,136],[136,128],[139,132],[138,135],[135,128]],
    ],
    boltRun: [
      [[133,12],[130,15],[123,11],[120,14],[119,18],[142,12]],
      [[150,34],[147,34],[145,33],[152,33],[145,34],[142,36]],
      [[160,69],[158,73],[155,72],[159,71],[159,74],[152,74]],
      [[160,96],[155,104],[154,102],[153,103],[154,105],[147,106]],
      [[134,121],[133,117],[136,137],[136,118],[139,139],[139,139]],
    ],
    enemies: [
      [[186,65],[188,65],[188,65]],
      [[185,86],[187,86],[187,86]],
      [[185,123],[185,123],[185,123]],
    ],
  },
};

/** Short cosmetic lead-in from the authored barrel to the physical swept path.
 * Collision endpoints remain authoritative, and tails never extend behind launch. */
export function projectilePoint(shot: Projectile, muzzle: Point, behind = 0): Point {
  if (!shot.launch) return { x: shot.x, y: shot.y };
  const distance = Math.hypot(shot.x - shot.launch.x, shot.y - shot.launch.y);
  const speed = Math.hypot(shot.vx, shot.vy), ux = shot.vx / speed, uy = shot.vy / speed;
  const blend = Math.max(0, 1 - distance / 48);
  const head = {
    x: shot.x + (muzzle.x - shot.launch.x) * blend,
    y: shot.y + (muzzle.y - shot.launch.y) * blend,
  };
  // A rocket/tracer keeps the commanded aim even through the short lead-in.
  const length = Math.min(behind, Math.max(0, (head.x - muzzle.x) * ux + (head.y - muzzle.y) * uy));
  return { x: head.x - ux * length, y: head.y - uy * length };
}
