import { serviceFrames, type AdventureArt } from './art.ts';
import { dimensions, propFrames, equipmentFrames, castFrames } from './art/deluxe/frames.ts';

/** Imported only when Deluxe is requested. Both modes use the same compositor. */
export const deluxeArt: AdventureArt = {
  mode: 'deluxe', dimensions, propFrames, equipmentFrames, castFrames, serviceFrames,
  artwork: {
    hall: new URL('./art/deluxe/hall.webp', import.meta.url).href,
    gallery: new URL('./art/deluxe/gallery.webp', import.meta.url).href,
    library: new URL('./art/deluxe/library.webp', import.meta.url).href,
    kitchen: new URL('./art/deluxe/kitchen.webp', import.meta.url).href,
    bell: new URL('./art/deluxe/bell.webp', import.meta.url).href,
    cast: new URL('./art/deluxe/cast.webp', import.meta.url).href,
    walk: new URL('./art/deluxe/walk.webp', import.meta.url).href,
    props: new URL('./art/deluxe/props.webp', import.meta.url).href,
    equipment: new URL('./art/deluxe/equipment.webp', import.meta.url).href,
    service: new URL('./art/deluxe/service.webp', import.meta.url).href,
  },
  itemFrames: {
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
  },
};
