import { validateArtPack } from './art-pack.ts';
import type { Theme, ThemeId } from './themes.ts';
export type ImageBundle = Readonly<Record<string, HTMLImageElement>>;
export interface LoadedAppearance { readonly id: ThemeId; readonly theme: Theme; readonly images: ImageBundle }
/** Prepare a whole bundle, then replace atomically. Old images remain owned until success. */
export function createAssets(onChange: (ready: LoadedAppearance | undefined, message: string) => void) {
  let generation = 0, disposed = false;
  let pending: HTMLImageElement[] = [], active: HTMLImageElement[] = [];
  function release(images: HTMLImageElement[]) {
    for (const image of images) { image.onload = null; image.onerror = null; image.removeAttribute('src'); }
  }
  function cancel() { generation++; release(pending); pending = []; }
  return {
    load(id: ThemeId, theme: Theme) {
      if (disposed) return;
      cancel();
      const request = generation, images: Record<string, HTMLImageElement> = {};
      const entries = Object.entries(theme.art.images);
      let remaining = entries.length;
      onChange(undefined, `Loading ${theme.name} artwork…`);
      function fail(reason: string) {
        if (disposed || request !== generation) return;
        cancel(); onChange(undefined, `Artwork unavailable (${reason}). ${active.length ? 'Keeping current appearance.' : 'Using clear shape silhouettes.'}`);
      }
      if (!remaining) { fail('empty image bundle'); return; }
      // Allocate before assigning src, including when an image stub completes synchronously.
      pending = entries.map(([name]) => { const image = new Image(); images[name] = image; return image; });
      for (const [name, url] of entries) {
        const image = images[name]!;
        image.onload = () => {
          if (disposed || request !== generation) return;
          image.onload = null; image.onerror = null;
          if (--remaining) return;
          const dimensions = Object.fromEntries(Object.entries(images).map(([key, value]) => [key, { width: value.naturalWidth, height: value.naturalHeight }]));
          const errors = validateArtPack(theme.art, dimensions);
          if (errors.length) { fail(errors[0]!); return; }
          const replaced = active;
          active = pending; pending = [];
          onChange({ id, theme, images }, '');
          release(replaced);
        };
        image.onerror = () => fail(`could not load ${name}`);
        image.src = url;
      }
    },
    dispose() { if (disposed) return; disposed = true; cancel(); release(active); active = []; },
  };
}
