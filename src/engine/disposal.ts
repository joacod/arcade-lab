/** Attempt every owned cleanup, even when an earlier resource fails to release. */
export function disposeAll(...cleanups: (() => void)[]): void {
  const errors: unknown[] = [];
  for (const cleanup of cleanups) {
    try { cleanup(); } catch (error) { errors.push(error); }
  }
  if (errors.length) throw new AggregateError(errors, 'Session cleanup failed');
}
