import { createPreparationScope } from '../../engine/browser/preparation.ts';
import { createPresentation } from './presentation.ts';
import { appearances, type Appearance, type CircuitRenderer } from './graphics.ts';
/** Owns replacement and cancellation; renderers never acquire a loop or simulation ownership. */
export function createAppearance(surface: HTMLElement, status: (value: Appearance, message: string, preparing?: boolean) => void, onRecovery: () => void, onReady: () => void) {
  let current: CircuitRenderer = createPresentation(surface), active: Appearance = 'normal';
  let disposed = false;
  const preparation = createPreparationScope();
  let snapshot: Parameters<CircuitRenderer['draw']> | undefined;
  function fallback(message: string) {
    if (disposed) return;
    onRecovery();
    preparation.cancel();
    current.dispose(); current = createPresentation(surface); active = 'normal';
    status(active, message); onReady();
  }
  async function select(value: Appearance) {
    if (disposed) return false;
    const request = preparation.begin();
    if (value === active) {
      try { await current.prepare(); }
      catch { if (request.current()) status(active, 'Artwork could not load. Retry or choose another theme.'); return false; }
      if (!request.current()) return false;
      status(active, ''); return true;
    }
    status(value, `Preparing ${appearances[value]}…`, true);
    const staging = document.createElement('div'); let next: CircuitRenderer | undefined;
    try {
      if (value === 'normal') next = createPresentation(staging);
      else if (value === 'assets') {
        const { createAssets } = await import('./assets.ts');
        if (!request.current()) return false;
        next = await createAssets(staging, request.signal);
      } else {
        const { createQuality } = await import('./quality.ts');
        if (!request.current()) return false;
        next = await createQuality(staging, request.signal);
      }
      await next.prepare();
      if (!request.current()) { next.dispose(); return false; }
      if (snapshot) next.draw(...snapshot);
      current.dispose(); surface.append(...staging.childNodes); current = next; active = value;
      status(active, ''); onReady();
      return true;
    } catch {
      next?.dispose();
      if (request.current()) { status(active, `${appearances[value]} unavailable. ${appearances[active]} retained.`); }
    }
    return false;
  }
  return {
    select,
    prepare: () => current.prepare(),
    cancel() { preparation.cancel(); status(active, ''); },
    reset() { current.reset(); },
    consume: ((events) => current.consume(events)) as CircuitRenderer['consume'],
    draw: ((...args) => { snapshot = args; try { current.draw(...args); } catch { fallback('Graphics became unavailable. Normal restored.'); current.draw(...args); } }) as CircuitRenderer['draw'],
    dispose() { if (disposed) return; disposed = true; preparation.dispose(); current.dispose(); },
  };
}
