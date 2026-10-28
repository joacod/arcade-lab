export type ImageBundle = Readonly<Record<string, HTMLImageElement>>;
export type ImageDimensions = Readonly<Record<string, { width: number; height: number }>>;
export interface PreparedImages { readonly images: ImageBundle; dispose(): void }

/** Image ownership is shared; the supplied validator keeps atlas rules with each game. */
export function prepareImages(urls: Readonly<Record<string, string>>, signal: AbortSignal,
  validate: (dimensions: ImageDimensions) => readonly string[]): Promise<PreparedImages> {
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
    const entries = Object.entries(urls);
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
        try {
          const errors = validate(dimensions);
          if (errors.length) { fail(errors[0]!); return; }
        } catch (error) { fail(error instanceof Error ? error.message : 'Image validation failed'); return; }
        finished = true; signal.removeEventListener('abort', cancel);
        resolve({ images, dispose: release });
      };
      image.onerror = () => fail(`could not load ${name}`);
      image.src = url;
    }
  });
}
