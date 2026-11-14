import { SAVE_KEY, snapshot, readEnvelope, encode } from './save.ts';
import type { Run } from './game.ts';
/** Browser storage stays outside the pure story. One atomic envelope holds two snapshots. */
export function createSaveStore(storage: Pick<Storage, 'getItem' | 'setItem'>, report: (message: string) => void) {
  let expected: string | null = null, writable = true;
  try { expected = storage.getItem(SAVE_KEY); }
  catch { writable = false; report('Local saving is unavailable. This visit can continue.'); }
  let saved = readEnvelope(expected);
  if (expected && !saved?.current) report(saved?.previous ? 'The latest save is damaged. A previous save is available.' : 'The existing save cannot be read. It has been kept intact.');
  // Preserve unreadable/future data instead of silently replacing it.
  if (expected && !saved?.current) writable = false;
  return {
    available(previous = false) { return !!(previous ? saved?.previous : saved?.current); },
    load(previous = false) { const candidate = previous ? saved?.previous : saved?.current; return candidate ? structuredClone(candidate) : undefined; },
    write(run: Run) {
      if (run.pending || run.dialogue) { report('Saving after this interaction…'); return false; }
      if (!writable) { report('Local save unavailable; existing data is preserved. This visit can continue.'); return false; }
      try {
        if (storage.getItem(SAVE_KEY) !== expected) { writable = false; report('A different tab changed this save. Reopen the game to load it; this visit has not overwritten it.'); return false; }
        const old = saved?.current ? snapshot(saved.current) : null;
        const current = snapshot(run);
        if (old && JSON.stringify(current) === JSON.stringify(old)) { report('Adventure saved on this browser.'); return true; }
        const raw = encode(current, old); storage.setItem(SAVE_KEY, raw); expected = raw; saved = readEnvelope(raw);
        report('Adventure saved on this browser.'); return true;
      } catch { report('Could not save locally. Your current adventure is still playable.'); return false; }
    },
  };
}
