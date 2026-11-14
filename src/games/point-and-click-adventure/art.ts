import { validateImageDimensions, type ImageDimensions } from '../../engine/browser/images.ts';
import { propFrames } from './art/prop-frames.ts';
import { equipmentFrames } from './art/equipment-frames.ts';
import type { ItemId } from './content.ts';
export { propFrames };
export { equipmentFrames };
export type PropRole = keyof typeof propFrames;
export const artwork = {
  hall: new URL('./art/hall.webp', import.meta.url).href,
  gallery: new URL('./art/gallery.webp', import.meta.url).href,
  library: new URL('./art/library.webp', import.meta.url).href,
  kitchen: new URL('./art/kitchen.webp', import.meta.url).href,
  bell: new URL('./art/bell.webp', import.meta.url).href,
  cast: new URL('./art/cast.webp', import.meta.url).href,
  props: new URL('./art/props.webp', import.meta.url).href,
  equipment: new URL('./art/equipment.webp', import.meta.url).href,
};
interface ItemFrame { sheet: 'props' | 'equipment'; frame: { x: number; y: number; w: number; h: number } }
export const itemFrames: Record<ItemId, ItemFrame> = {
  lens: { sheet: 'equipment', frame: equipmentFrames.lens },
  chalk: { sheet: 'equipment', frame: equipmentFrames.chalk },
  longBrush: { sheet: 'equipment', frame: equipmentFrames.longBrush },
  cabinetKey: { sheet: 'equipment', frame: equipmentFrames.cabinetKey },
  windingKey: { sheet: 'equipment', frame: equipmentFrames.windingKey },
  brush: { sheet: 'equipment', frame: equipmentFrames.brush },
  poker: { sheet: 'props', frame: propFrames.poker },
  lantern: { sheet: 'props', frame: propFrames.lantern },
  bellows: { sheet: 'props', frame: propFrames.bellows },
  fork: { sheet: 'props', frame: propFrames.fork },
};
// Whole cels, with independently inspected hip/boot registration. The reach
// drawing is shorter because Wren bends; it keeps the standing drawing's scale.
export const castFrames = {
  idle: { x: 112, y: 0, w: 174, h: 330, anchorX: 87, foot: 315 },
  walkA: { x: 460, y: 0, w: 225, h: 330, anchorX: 109, foot: 313 },
  walkB: { x: 867, y: 0, w: 174, h: 330, anchorX: 94, foot: 314 },
  walkC: { x: 1224, y: 0, w: 247, h: 330, anchorX: 108, foot: 312 },
  walkD: { x: 101, y: 341, w: 182, h: 330, anchorX: 94, foot: 317 },
  reach: { x: 451, y: 341, w: 273, h: 330, anchorX: 109, foot: 321 },
  lantern: { x: 845, y: 341, w: 235, h: 330, anchorX: 95, foot: 321 },
  evelyn: { x: 1264, y: 341, w: 191, h: 330, anchorX: 97, foot: 324 },
  vale: { x: 124, y: 683, w: 144, h: 341, anchorX: 76, foot: 324 },
  oswald: { x: 461, y: 683, w: 223, h: 341, anchorX: 115, foot: 324 },
  brindle: { x: 852, y: 683, w: 211, h: 341, anchorX: 105, foot: 324 },
  guest: { x: 1212, y: 683, w: 286, h: 341, anchorX: 143, foot: 326 },
} as const;
export type CastRole = keyof typeof castFrames;
export const walkClip: readonly CastRole[] = ['walkA', 'walkB', 'walkC', 'walkD'];
export function validateArtwork(dimensions: ImageDimensions): string[] {
  const errors = validateImageDimensions(dimensions, {
    hall: [960, 540], gallery: [960, 540], library: [960, 540],
    kitchen: [960, 540], bell: [960, 540], cast: [1536, 1024], props: [1254, 1254], equipment: [1254, 1254],
  });
  for (const [sheet, frames] of [['cast', castFrames], ['props', propFrames], ['equipment', equipmentFrames]] as const) {
    const size = dimensions[sheet];
    for (const [role, frame] of Object.entries(frames)) {
      if (!size || frame.x < 0 || frame.y < 0 || frame.w <= 0 || frame.h <= 0
        || frame.x + frame.w > size.width || frame.y + frame.h > size.height) errors.push(`Invalid ${sheet} frame: ${role}`);
    }
  }
  return errors;
}
