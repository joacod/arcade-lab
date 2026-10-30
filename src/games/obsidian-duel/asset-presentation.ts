import type { ImageBundle } from '../../engine/browser/images.ts';
import type { FighterId } from './content.ts';
import type { AnimationSample } from './animation.ts';
import { foundryCell, foundryFrame } from './asset-art.ts';

/** One complete drawing per cel: no runtime limb stretching, assembly or whole-body rotation. */
export function drawFoundryFighter(ctx: CanvasRenderingContext2D, art: ImageBundle, kind: FighterId, sample: AnimationSample) {
  ctx.drawImage(art[kind]!, ...foundryFrame(sample), -foundryCell.pivotX, -foundryCell.pivotY, foundryCell.width, foundryCell.height);
}
export function drawFoundryEffect(ctx: CanvasRenderingContext2D, art: ImageBundle, cell: number, x: number, y: number, width: number, height = width) {
  ctx.drawImage(art.effects!, cell * 128, 0, 128, 128, x - width / 2, y - height / 2, width, height);
}
