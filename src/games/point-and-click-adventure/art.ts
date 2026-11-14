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
  walk: new URL('./art/walk.webp', import.meta.url).href,
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
  walkA: { sheet: 'walk', scale: 2 / 3, x: 0, y: 0, w: 384, h: 512, anchorX: 198, foot: 474 },
  walkB: { sheet: 'walk', scale: 2 / 3, x: 384, y: 0, w: 384, h: 512, anchorX: 198, foot: 474 },
  walkC: { sheet: 'walk', scale: 2 / 3, x: 768, y: 0, w: 384, h: 512, anchorX: 198, foot: 474 },
  walkD: { sheet: 'walk', scale: 2 / 3, x: 1152, y: 0, w: 384, h: 512, anchorX: 198, foot: 474 },
  walkE: { sheet: 'walk', scale: 2 / 3, x: 0, y: 512, w: 384, h: 512, anchorX: 198, foot: 474 },
  walkF: { sheet: 'walk', scale: 2 / 3, x: 384, y: 512, w: 384, h: 512, anchorX: 198, foot: 474 },
  walkG: { sheet: 'walk', scale: 2 / 3, x: 768, y: 512, w: 384, h: 512, anchorX: 198, foot: 474 },
  walkH: { sheet: 'walk', scale: 2 / 3, x: 1152, y: 512, w: 384, h: 512, anchorX: 198, foot: 474 },
  idle: { sheet: 'cast', scale: 1, x: 112, y: 0, w: 174, h: 330, anchorX: 87, foot: 315 },
  reach: { sheet: 'cast', scale: 1, x: 451, y: 341, w: 273, h: 330, anchorX: 109, foot: 321 },
  lantern: { sheet: 'cast', scale: 1, x: 845, y: 341, w: 235, h: 330, anchorX: 95, foot: 321 },
  evelyn: { sheet: 'cast', scale: 1, x: 1264, y: 341, w: 191, h: 330, anchorX: 97, foot: 324 },
  vale: { sheet: 'cast', scale: 1, x: 124, y: 683, w: 144, h: 341, anchorX: 76, foot: 324 },
  oswald: { sheet: 'cast', scale: 1, x: 461, y: 683, w: 223, h: 341, anchorX: 115, foot: 324 },
  brindle: { sheet: 'cast', scale: 1, x: 852, y: 683, w: 211, h: 341, anchorX: 105, foot: 324 },
  guest: { sheet: 'cast', scale: 1, x: 1212, y: 683, w: 286, h: 341, anchorX: 143, foot: 326 },
} as const;
export type CastRole = keyof typeof castFrames;
export const walkClip: readonly CastRole[] = ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'];
export const strideDistance = 184;
export interface Frame { x: number; y: number; w: number; h: number }
export interface CastFrame extends Frame { sheet: 'cast' | 'walk'; scale: number; anchorX: number; foot: number }
export type Appearance = 'arcade' | 'deluxe';
export const appearances = { arcade: 'Blackthorn by Candlelight', deluxe: 'Blackthorn Nocturne' } as const;
export interface AdventureArt {
  mode: Appearance;
  artwork: Record<keyof typeof artwork, string>;
  castFrames: Record<CastRole, CastFrame>;
  propFrames: Record<PropRole, Frame>;
  equipmentFrames: Record<keyof typeof equipmentFrames, Frame>;
  itemFrames: Record<ItemId, ItemFrame>;
  dimensions: Record<keyof typeof artwork, readonly [number, number]>;
}
export const arcadeArt: AdventureArt = {
  mode: 'arcade', artwork, castFrames, propFrames, equipmentFrames, itemFrames,
  dimensions: {
    hall: [960, 540], gallery: [960, 540], library: [960, 540], kitchen: [960, 540], bell: [960, 540],
    cast: [1536, 1024], walk: [1536, 1024], props: [1254, 1254], equipment: [1254, 1254],
  },
};
export function validateArtwork(art: AdventureArt, dimensions: ImageDimensions): string[] {
  const errors = validateImageDimensions(dimensions, art.dimensions);
  for (const [sheet, frames] of [['cast', art.castFrames], ['props', art.propFrames], ['equipment', art.equipmentFrames]] as const) {
    for (const [role, frame] of Object.entries(frames)) {
      const source = 'sheet' in frame && (frame.sheet === 'cast' || frame.sheet === 'walk') ? frame.sheet : sheet;
      const size = dimensions[source];
      if (!size || frame.x < 0 || frame.y < 0 || frame.w <= 0 || frame.h <= 0
        || frame.x + frame.w > size.width || frame.y + frame.h > size.height) errors.push(`Invalid ${sheet} frame: ${role}`);
    }
  }
  return errors;
}
