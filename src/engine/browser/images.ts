export type ImageBundle = Readonly<Record<string, HTMLImageElement>>;
export type ImageDimensions = Readonly<Record<string, { width: number; height: number }>>;
export interface PreparedImages { readonly images: ImageBundle; dispose(): void }

/** Compare decoded sizes; callers retain sheet names and all atlas/role rules. */
export function validateImageDimensions(actual: ImageDimensions,
  expected: Readonly<Record<string, { width: number; height: number } | readonly [number, number]>>): string[] {
  return Object.entries(expected).flatMap(([name, size]) => {
    const [width, height] = 'width' in size ? [size.width, size.height] : size;
    return actual[name]?.width === width && actual[name]?.height === height ? [] : [`Invalid ${name} dimensions`];
  });
}

/** Synchronous presentation construction with session-owned initial image preparation. */
export function createImageResource(urls: Readonly<Record<string, string>>,
  validate: (dimensions: ImageDimensions) => readonly string[]) {
  const lifetime = new AbortController();
  let bundle: PreparedImages | undefined;
  let pending: Promise<void> | undefined;
  function prepare(): Promise<void> {
    if (bundle) return Promise.resolve();
    if (pending) return pending;
    pending = prepareImages(urls, lifetime.signal, validate).then(prepared => {
      if (lifetime.signal.aborted) prepared.dispose();
      else bundle = prepared;
    }).finally(() => { pending = undefined; });
    // Synchronous construction owns the request before the session observes it.
    void pending.catch(() => {});
    return pending;
  }
  return {
    ready: prepare(), prepare,
    get images(): ImageBundle { return bundle?.images ?? {}; },
    dispose() { lifetime.abort(); bundle?.dispose(); bundle = undefined; },
  };
}

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
