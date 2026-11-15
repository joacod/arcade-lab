import type { ImageBundle } from '../../engine/browser/images.ts';
import type { Appearance, Frame } from './art.ts';
import type { RoomId } from './content.ts';

type Color = readonly [number, number, number];
interface RoomLight { ambient: Color; exposure: number }
// Match the light already painted into each plate, rather than making every
// room blue. Small warm highlights and spectral colors remain legible.
const lighting: Record<Appearance, Record<RoomId, RoomLight>> = {
  arcade: {
    hall: { ambient: [100, 112, 122], exposure: .92 },
    gallery: { ambient: [109, 104, 108], exposure: .91 },
    library: { ambient: [128, 111, 83], exposure: .94 },
    kitchen: { ambient: [134, 112, 85], exposure: .93 },
    bell: { ambient: [91, 114, 126], exposure: .88 },
  },
  deluxe: {
    hall: { ambient: [91, 113, 141], exposure: .83 },
    gallery: { ambient: [108, 110, 130], exposure: .83 },
    library: { ambient: [123, 108, 91], exposure: .88 },
    kitchen: { ambient: [115, 111, 105], exposure: .85 },
    bell: { ambient: [82, 114, 145], exposure: .81 },
  },
};
type SceneSheet = 'cast' | 'walk' | 'props' | 'equipment' | 'service';

/** Grade native-resolution sheets once on room entry, without pixel readback. */
export function createSceneArt(mode: Appearance, images: () => ImageBundle) {
  const sheets = new Map<SceneSheet, HTMLCanvasElement>();
  let room: RoomId | undefined;
  function clear() {
    for (const sheet of sheets.values()) sheet.width = sheet.height = 0;
    sheets.clear();
  }
  return {
    enter(next: RoomId) {
      if (next === room) return;
      clear();
      const light = lighting[mode][next];
      const saturation = mode === 'deluxe' ? .80 : .88;
      const exposure = light.exposure + .054;
      const reflected = light.ambient.map(channel => Math.round(Math.min(255, 255 * exposure * (.82 + channel / 128 * .18))));
      for (const name of ['cast', 'walk', 'props', 'equipment', 'service'] as const) {
        const source = images()[name]!;
        const sheet = document.createElement('canvas');
        sheet.width = source.naturalWidth; sheet.height = source.naturalHeight;
        sheets.set(name, sheet);
        const ink = sheet.getContext('2d')!;
        // Work on an opaque matte, then restore the source alpha exactly once.
        // This keeps blend operations from painting into transparent sheet space.
        ink.fillStyle = '#20242a'; ink.fillRect(0, 0, sheet.width, sheet.height);
        ink.drawImage(source, 0, 0);
        ink.globalCompositeOperation = 'saturation'; ink.globalAlpha = 1 - saturation;
        ink.fillStyle = '#808080'; ink.fillRect(0, 0, sheet.width, sheet.height);
        ink.globalCompositeOperation = 'multiply'; ink.globalAlpha = 1;
        ink.fillStyle = `rgb(${reflected.join(' ')})`; ink.fillRect(0, 0, sheet.width, sheet.height);
        ink.globalCompositeOperation = 'destination-in'; ink.drawImage(source, 0, 0);
      }
      room = next;
    },
    draw(c: CanvasRenderingContext2D, sheet: SceneSheet, f: Frame,
      x: number, y: number, w: number, h: number, spectral = false) {
      const source = spectral ? images()[sheet]! : sheets.get(sheet)!;
      c.drawImage(source, f.x, f.y, f.w, f.h, x, y, w, h);
    },
    dispose() { clear(); room = undefined; },
  };
}
