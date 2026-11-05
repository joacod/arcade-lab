import { validateImageDimensions, type ImageDimensions } from '../../engine/browser/images.ts';
import type { Player } from './game.ts';
import type { KeeperPose } from './animation.ts';

export const bellgardenSheets = {
  keeper: { width: 768, height: 80 }, beetle: { width: 256, height: 48 },
  objects: { width: 1024, height: 160 }, terrain: { width: 384, height: 192 },
  'aqueduct-far': { width: 960, height: 900 }, 'aqueduct-near': { width: 960, height: 900 },
  'emberworks-far': { width: 960, height: 900 }, 'emberworks-near': { width: 960, height: 900 },
  'belfry-far': { width: 960, height: 900 }, 'belfry-near': { width: 960, height: 900 },
} as const;
export type BellgardenSheet = keyof typeof bellgardenSheets;
interface ActorCell {
  readonly cell: readonly [number, number];
  readonly anchor: readonly [number, number];
  readonly size: readonly [number, number];
}
export interface HollowSpriteLayout { readonly keeper: ActorCell; readonly beetle: ActorCell }
export const illustratedSpriteLayout: HollowSpriteLayout = {
  keeper: { cell: [64, 80], anchor: [32, 76], size: [57.6, 72] },
  beetle: { cell: [64, 48], anchor: [32, 43], size: [51.2, 38.4] },
};
export const lumenSpriteLayout: HollowSpriteLayout = {
  keeper: { cell: [192, 240], anchor: [96, 228], size: [64, 80] },
  beetle: { cell: [192, 144], anchor: [96, 132], size: [51.2, 38.4] },
};
export const lumenSpriteSheets = {
  keeper: { width: 2304, height: 240 }, beetle: { width: 768, height: 144 },
  objects: bellgardenSheets.objects,
} as const;
export const objectFrames = {
  lantern: [0, 0, 128, 160], savedLantern: [128, 0, 128, 160],
  bell: [256, 0, 128, 160], gate: [384, 0, 128, 160],
  mote: [552, 48, 48, 60], thorns: [640, 104, 128, 56], vent: [776, 120, 112, 40],
  foliage: [896, 0, 128, 160],
} as const;
export function validateBellgardenArt(dimensions: ImageDimensions): readonly string[] {
  return validateImageDimensions(dimensions, bellgardenSheets);
}
/** Distance-observed stride drives grounded poses; no wall-clock walk animation. */
export function keeperFrame(player: Pick<Player, 'grounded' | 'vx' | 'vy'>, pose: KeeperPose, defeated: boolean, reduced: boolean) {
  if (defeated) return 11;
  if (!player.grounded) return player.vy < 0 ? 9 : 10;
  if (reduced || Math.abs(player.vx) < 12) return 0;
  return 1 + Math.floor(pose.phase / (Math.PI * 2) * 8) % 8;
}

export function validateHollowSprites(mode: 'normal' | 'quality', dimensions: ImageDimensions): readonly string[] {
  const { keeper, beetle, objects } = mode === 'quality' ? lumenSpriteSheets : bellgardenSheets;
  return validateImageDimensions(dimensions, { keeper, beetle, objects });
}
