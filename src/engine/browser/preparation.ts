/** Latest-request ownership for asynchronous resource preparation within a session.
 * Candidates and active resources remain owned by the caller. Check current() after
 * every await and dispose a completed candidate when its request is no longer current.
 */
export function createPreparationScope() {
  let pending: AbortController | undefined, disposed = false;
  function cancel() { pending?.abort(); pending = undefined; }
  return {
    begin() {
      cancel();
      const controller = new AbortController();
      if (disposed) controller.abort();
      else pending = controller;
      return { signal: controller.signal, current: () => !disposed && pending === controller && !controller.signal.aborted };
    },
    cancel,
    dispose() { disposed = true; cancel(); },
  };
}

export type Readiness = 'loading' | 'ready' | 'failed';

/** Gate play on required resources, with explicit retry and stale-completion protection. */
export function createReadiness(signal: AbortSignal, update: (state: Readiness, retry: () => void) => void) {
  let generation = 0, ready = false;
  function watch(prepare: () => Promise<void>) {
    if (signal.aborted) return;
    const token = ++generation;
    const retry = () => { if (token === generation) watch(prepare); };
    ready = false;
    update('loading', retry);
    void Promise.resolve().then(() => {
      if (!signal.aborted && token === generation) return prepare();
    }).then(() => {
      if (signal.aborted || token !== generation) return;
      ready = true;
      update('ready', retry);
    }).catch(() => {
      if (!signal.aborted && token === generation) update('failed', retry);
    });
  }
  return { watch, get ready() { return ready && !signal.aborted; } };
}

/** Trial an already-installed candidate, rolling back before its resources are released. */
export function trialReplacement(replacement: { rollback(): void; commit?(): void }, draw: () => void) {
  try { draw(); }
  catch (error) { replacement.rollback(); throw error; }
  replacement.commit?.();
}
