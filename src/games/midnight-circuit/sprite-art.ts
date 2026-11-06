import { type ImageBundle } from '../../engine/browser/images.ts';
import type { Actor } from './game.ts';
import { walkingCels } from './animation.ts';
import type { WalkStrides } from './animation.ts';
import { walkingStrides } from './art/fighters/walking/strides.ts';
export interface FighterAtlas { readonly cell: number; readonly drawSize: number; readonly width: number; readonly height: number; readonly walk: readonly number[]; readonly strides: WalkStrides }
export const arcadeFighterAtlas: FighterAtlas = { cell: 256, drawSize: 160, height: 1024, width: 16 * 256, walk: walkingCels, strides: walkingStrides.arcade };
export const deluxeFighterAtlas: FighterAtlas = { cell: 512, drawSize: 168, width: 16 * 512, height: 2048, walk: walkingCels, strides: walkingStrides.deluxe };
export const fighterRow = (actor: Actor) => actor.kind === 'player' ? 0 : actor.kind === 'striker' ? 1 : actor.kind === 'bruiser' ? 2 : 3;
export const fighterScale = (actor: Actor) => actor.kind === 'warden' ? 1.48 : actor.kind === 'bruiser' ? 1.2 : 1;
/** A shared normalized ground pivot (1/2,15/16), independent of source resolution. */
export function drawCircuitFighter(ctx: CanvasRenderingContext2D, images: ImageBundle, actor: Actor, frame: number, time: number, reflection = false, reducedMotion = false, atlas: FighterAtlas = arcadeFighterAtlas) {
  const image=images.fighters;
  if (!image) return;
  const size=fighterScale(actor);
  ctx.save();ctx.translate(0,-actor.elevation);ctx.scale(actor.facing*size,size);
  if (!reflection && !reducedMotion && actor.immune > 0 && Math.floor(time*16)%2===0) ctx.globalAlpha*=.55;
  if (!reflection && !reducedMotion && actor.flash > 0) {ctx.shadowColor='#fff2cb';ctx.shadowBlur=8;}
  const { cell, drawSize } = atlas;
  ctx.drawImage(image,frame*cell,fighterRow(actor)*cell,cell,cell,-drawSize/2,-drawSize*15/16,drawSize,drawSize);
  ctx.restore();
}
