import type { ImageDimensions } from '../../engine/browser/images.ts';
import type { Player } from './game.ts';
import type { KeeperPose } from './animation.ts';

export const bellgardenSheets = {
  keeper: { width: 512, height: 80 }, beetle: { width: 256, height: 48 },
  objects: { width: 1024, height: 160 }, terrain: { width: 384, height: 192 },
  'aqueduct-far': { width: 960, height: 640 }, 'aqueduct-near': { width: 960, height: 640 },
  'emberworks-far': { width: 960, height: 640 }, 'emberworks-near': { width: 960, height: 640 },
  'belfry-far': { width: 960, height: 640 }, 'belfry-near': { width: 960, height: 640 },
} as const;
export type BellgardenSheet = keyof typeof bellgardenSheets;
export const objectFrames = {
  lantern: [0, 0, 128, 160], savedLantern: [128, 0, 128, 160],
  bell: [256, 0, 128, 160], gate: [384, 0, 128, 160],
  mote: [552, 48, 48, 60], thorns: [640, 104, 128, 56], vent: [776, 120, 112, 40],
  foliage: [896, 0, 128, 160],
} as const;
export function validateBellgardenArt(dimensions: ImageDimensions): readonly string[] {
  return Object.entries(bellgardenSheets).flatMap(([name, expected]) => {
    const actual = dimensions[name];
    return actual?.width === expected.width && actual.height === expected.height ? [] : [`Porcelain Bellgarden: invalid ${name} dimensions.`];
  });
}
/** Distance-observed stride drives grounded poses; no wall-clock walk animation. */
export function keeperFrame(player: Pick<Player, 'grounded' | 'vx' | 'vy'>, pose: KeeperPose, defeated: boolean, reduced: boolean) {
  if (defeated) return 7;
  if (!player.grounded) return player.vy < 0 ? 5 : 6;
  if (reduced || Math.abs(player.vx) < 12) return 0;
  return pose.stride < -.65 ? 1 : pose.stride < 0 ? 2 : pose.stride < .65 ? 3 : 4;
}
