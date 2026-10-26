import { validateTheme, type Theme } from './themes.ts';

/** One replaceable request per session. Abort and generation checks guard late image callbacks. */
export function createAssets(onChange: (image: HTMLImageElement | undefined, message: string) => void) {
  let pending: HTMLImageElement | undefined, generation = 0, disposed = false;
  function cancel() {
    generation++;
    if (pending) { pending.onload = null; pending.onerror = null; pending.removeAttribute('src'); pending = undefined; }
  }
  return {
    load(theme: Theme) {
      if (disposed) return;
      cancel();
      const request = generation, image = new Image(); pending = image;
      onChange(undefined, `Loading ${theme.name} artwork…`);
      function done(error = '') {
        if (disposed || request !== generation) return;
        image.onload = null; image.onerror = null; pending = undefined;
        onChange(error ? undefined : image, error ? `Artwork unavailable (${error}). Using clear shape silhouettes.` : '');
      }
      image.onload = () => done(validateTheme(theme, image.naturalWidth, image.naturalHeight).join('; '));
      image.onerror = () => done('image could not load');
      image.src = theme.source;
    },
    dispose() { disposed = true; cancel(); },
  };
}
