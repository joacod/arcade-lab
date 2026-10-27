import { validateArtPack, type ArtPack } from './art-pack.ts';
export type ImageBundle = Readonly<Record<string, HTMLImageElement>>;
export interface PreparedAssets { readonly images: ImageBundle; dispose(): void }
/** Each preparation owns its images until the presentation using them is disposed. */
export function prepareAssets(pack: ArtPack, signal: AbortSignal): Promise<PreparedAssets> {
  return new Promise((resolve, reject) => {
    const images: Record<string, HTMLImageElement> = {};
    let finished = false;
    function release() {
      for (const image of Object.values(images)) { image.onload = null; image.onerror = null; image.removeAttribute('src'); }
    }
    function fail(reason: string) {
      if (finished) return;
      finished = true; signal.removeEventListener('abort', cancel); release(); reject(new Error(reason));
    }
    function cancel() { fail('Preparation cancelled'); }
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) { cancel(); return; }
    const entries = Object.entries(pack.images);
    let remaining = entries.length;
    if (!remaining) { fail('empty image bundle'); return; }
    for (const [name] of entries) images[name] = new Image();
    for (const [name, url] of entries) {
      const image = images[name]!;
      image.onload = () => {
        if (finished) return;
        image.onload = null; image.onerror = null;
        if (--remaining) return;
        const dimensions = Object.fromEntries(Object.entries(images).map(([key, value]) => [key, { width: value.naturalWidth, height: value.naturalHeight }]));
        const errors = validateArtPack(pack, dimensions);
        if (errors.length) { fail(errors[0]!); return; }
        finished = true; signal.removeEventListener('abort', cancel);
        resolve({ images, dispose: release });
      };
      image.onerror = () => fail(`could not load ${name}`);
      image.src = url;
    }
  });
}
