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
