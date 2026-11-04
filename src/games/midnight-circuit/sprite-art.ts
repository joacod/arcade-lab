import type { ImageBundle, ImageDimensions } from '../../engine/browser/images.ts';
import type { Actor } from './game.ts';
export const normalSprites = {
  fighters: new URL('./art/normal/fighters.svg', import.meta.url).href,
  repair: new URL('./art/normal/repair.svg', import.meta.url).href,
};
export function validateCircuitSprites(dimensions: ImageDimensions) {
  return [dimensions.fighters?.width === 2048 && dimensions.fighters.height === 1024 ? '' : 'Invalid complete fighter atlas',
    dimensions.repair?.width === 64 && dimensions.repair.height === 64 ? '' : 'Invalid repair sprite'].filter(Boolean);
}
export const fighterRow = (actor: Actor) => actor.kind === 'player' ? 0 : actor.kind === 'striker' ? 1 : actor.kind === 'bruiser' ? 2 : 3;
export const fighterScale = (actor: Actor) => actor.kind === 'warden' ? 1.48 : actor.kind === 'bruiser' ? 1.2 : 1;
/** Stable ground pivot (128,240); no anatomy transforms or joint placement. */
export function drawCircuitFighter(ctx: CanvasRenderingContext2D, images: ImageBundle, actor: Actor, frame: number, time: number, reflection = false, reducedMotion = false) {
  const image=images.fighters;
  if (!image) return;
  const size=fighterScale(actor);
  ctx.save();ctx.translate(0,-actor.elevation);ctx.scale(actor.facing*size,size);
  if (!reflection && !reducedMotion && actor.immune > 0 && Math.floor(time*16)%2===0) ctx.globalAlpha*=.55;
  if (!reflection && !reducedMotion && actor.flash > 0) {ctx.shadowColor='#fff2cb';ctx.shadowBlur=8;}
  ctx.drawImage(image,frame*256,fighterRow(actor)*256,256,256,-80,-150,160,160);
  ctx.restore();
}
