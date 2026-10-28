import { createPresentation } from './presentation.ts';
import { appearances, type Appearance, type CircuitRenderer } from './graphics.ts';
/** Owns replacement and cancellation; renderers never acquire a loop or simulation ownership. */
export function createAppearance(surface: HTMLElement, status: (value: Appearance, message: string) => void) {
  let current: CircuitRenderer = createPresentation(surface), active: Appearance = 'canvas';
  let disposed = false, generation = 0, pending: AbortController | undefined;
  let snapshot: Parameters<CircuitRenderer['draw']> | undefined;
  function fallback(message: string) {
    if (disposed) return;
    ++generation; pending?.abort(); pending = undefined;
    current.dispose(); current = createPresentation(surface); active = 'canvas';
    status(active, message);
  }
  async function select(value: Appearance) {
    const token = ++generation; pending?.abort();
    const controller = new AbortController(); pending = controller;
    if (value === active) { status(active, ''); return; }
    status(value, `Preparing ${appearances[value]}…`);
    const staging = document.createElement('div'); let next: CircuitRenderer | undefined;
    const failed = () => { if (!disposed && token === generation) fallback('Graphics became unavailable. Illustrated arcade restored.'); };
    try {
      if (value === 'canvas') next = createPresentation(staging);
      else if (value === 'three') {
        const { createDiorama } = await import('./three/diorama.ts');
        if (disposed || token !== generation) return;
        next = createDiorama(staging, failed);
      } else {
        const { createCinema } = await import('./vgpu/cinema.ts');
        if (disposed || token !== generation) return;
        next = await createCinema(staging, controller.signal, failed);
      }
      if (disposed || token !== generation) { next.dispose(); return; }
      if (snapshot) next.draw(...snapshot);
      current.dispose(); surface.append(...staging.childNodes); current = next; active = value; pending = undefined;
      status(active, '');
    } catch {
      next?.dispose();
      if (!disposed && token === generation) { pending = undefined; status(active, `${appearances[value]} unavailable. ${appearances[active]} retained.`); }
    }
  }
  return {
    select,
    reset() { current.reset(); },
    consume: ((events) => current.consume(events)) as CircuitRenderer['consume'],
    draw: ((...args) => { snapshot = args; try { current.draw(...args); } catch { fallback('Graphics became unavailable. Illustrated arcade restored.'); current.draw(...args); } }) as CircuitRenderer['draw'],
    dispose() { if (disposed) return; disposed = true; ++generation; pending?.abort(); current.dispose(); },
  };
}
