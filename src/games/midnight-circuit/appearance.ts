import { createPreparationScope } from '../../engine/browser/preparation.ts';
import { appearances, type Appearance, type CircuitRenderer } from './graphics.ts';
/** Owns replacement and cancellation; renderers never acquire a loop or simulation ownership. */
export function createAppearance(surface: HTMLElement, status: (value: Appearance, message: string, preparing?: boolean) => void,
  onRecovery: (failed: Appearance) => void) {
  let current: CircuitRenderer | undefined, active: Appearance = 'arcade';
  let disposed = false;
  const preparation = createPreparationScope();
  let snapshot: Parameters<CircuitRenderer['draw']> | undefined;
  async function select(value: Appearance) {
    if (disposed || !Object.hasOwn(appearances, value)) return false;
    const request = preparation.begin();
    if (value === active && current) { status(active, ''); return true; }
    status(value, `Preparing ${appearances[value]}…`, true);
    const staging = document.createElement('div'); let next: CircuitRenderer | undefined;
    try {
      if (value === 'arcade') {
        const { createArcade } = await import('./assets.ts');
        if (!request.current()) return false;
        next = await createArcade(staging, request.signal);
      } else {
        const { createDeluxe } = await import('./deluxe.ts');
        if (!request.current()) return false;
        next = await createDeluxe(staging, request.signal);
      }
      await next.prepare();
      if (!request.current()) { next.dispose(); return false; }
      if (snapshot) next.draw(...snapshot);
      current?.dispose(); surface.append(...staging.childNodes); current = next; active = value;
      status(active, ''); return true;
    } catch {
      next?.dispose();
      if (request.current()) status(active, `${appearances[value]} unavailable. ${current ? `${appearances[active]} retained.` : 'Retry artwork or return to game selection.'}`);
      return false;
    }
  }
  return {
    select,
    cancel() { preparation.cancel(); status(active, ''); },
    reset() { current?.reset(); },
    consume: ((events) => current?.consume(events)) as CircuitRenderer['consume'],
    draw: ((...args) => {
      snapshot = args;
      try { current?.draw(...args); }
      catch {
        preparation.cancel(); current?.dispose(); current = undefined;
        status(active, 'Graphics interrupted. Your run is preserved.'); onRecovery(active);
      }
    }) as CircuitRenderer['draw'],
    dispose() { if (disposed) return; disposed = true; preparation.dispose(); current?.dispose(); current = undefined; },
  };
}
