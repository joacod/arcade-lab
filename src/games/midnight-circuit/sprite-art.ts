import { validateImageDimensions, type ImageBundle, type ImageDimensions } from '../../engine/browser/images.ts';
import type { Actor } from './game.ts';
import { fighterCelCount } from './animation.ts';
export interface FighterAtlas { readonly cell: number; readonly drawSize: number; readonly width: number; readonly height: number }
export const arcadeFighterAtlas: FighterAtlas = { cell: 256, drawSize: 160, width: fighterCelCount * 256, height: 1024 };
export const qualityFighterAtlas: FighterAtlas = { cell: 512, drawSize: 168, width: fighterCelCount * 512, height: 2048 };
export const normalSprites = {
  fighters: new URL('./art/normal/fighters.svg', import.meta.url).href,
  repair: new URL('./art/normal/repair.svg', import.meta.url).href,
};
export function validateCircuitSprites(dimensions: ImageDimensions) {
  return validateImageDimensions(dimensions, { fighters: arcadeFighterAtlas, repair: { width: 64, height: 64 } });
}
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
