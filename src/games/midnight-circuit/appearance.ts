import { createPreparationScope } from '../../engine/browser/preparation.ts';
import { createPresentation } from './presentation.ts';
import { appearances, type Appearance, type CircuitRenderer } from './graphics.ts';
/** Owns replacement and cancellation; renderers never acquire a loop or simulation ownership. */
export function createAppearance(surface: HTMLElement, status: (value: Appearance, message: string) => void, onRecovery: () => void) {
  let current: CircuitRenderer = createPresentation(surface), active: Appearance = 'normal';
  let disposed = false;
  const preparation = createPreparationScope();
  let snapshot: Parameters<CircuitRenderer['draw']> | undefined;
  function fallback(message: string) {
    if (disposed) return;
    onRecovery();
    preparation.cancel();
    current.dispose(); current = createPresentation(surface); active = 'normal';
    status(active, message);
  }
  async function select(value: Appearance) {
    if (disposed) return;
    const request = preparation.begin();
    if (value === active) { status(active, ''); return; }
    status(value, `Preparing ${appearances[value]}…`);
    const staging = document.createElement('div'); let next: CircuitRenderer | undefined;
    const failed = () => { if (!disposed && current === next) fallback('Graphics became unavailable. Normal restored.'); };
    try {
      if (value === 'normal') next = createPresentation(staging);
      else if (value === 'assets') {
        const { createAssets } = await import('./assets.ts');
        if (!request.current()) return;
        next = await createAssets(staging, request.signal);
      } else {
        // Both backends present the same scene. WebGPU adds a finish when available.
        try {
          const { createCinema } = await import('./vgpu/cinema.ts');
          if (!request.current()) return;
          next = await createCinema(staging, request.signal, failed);
          if (snapshot) next.draw(...snapshot);
        } catch {
          next?.dispose(); next = undefined;
          if (!request.current()) return;
          const { createDiorama } = await import('./three/diorama.ts');
          if (!request.current()) return;
          next = createDiorama(staging, failed);
        }
      }
      if (!request.current()) { next.dispose(); return; }
      if (snapshot) next.draw(...snapshot);
      current.dispose(); surface.append(...staging.childNodes); current = next; active = value;
      status(active, '');
    } catch {
      next?.dispose();
      if (request.current()) { status(active, `${appearances[value]} unavailable. ${appearances[active]} retained.`); }
    }
  }
  return {
    select,
    reset() { current.reset(); },
    consume: ((events) => current.consume(events)) as CircuitRenderer['consume'],
    draw: ((...args) => { snapshot = args; try { current.draw(...args); } catch { fallback('Graphics became unavailable. Normal restored.'); current.draw(...args); } }) as CircuitRenderer['draw'],
    dispose() { if (disposed) return; disposed = true; preparation.dispose(); current.dispose(); },
  };
}
