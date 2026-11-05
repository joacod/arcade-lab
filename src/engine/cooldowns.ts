/** Admission deadlines on a caller-owned clock. Replacing that clock clears old deadlines. */
export function createCooldowns<Key extends string>() {
  const deadlines = new Map<Key, number>();
  let now = 0;
  return {
    clear() { deadlines.clear(); now = 0; },
    advance(time: number) {
      if (time < now) deadlines.clear();
      now = time;
    },
    allows(key: Key) { return now >= (deadlines.get(key) ?? 0); },
    record(key: Key, interval: number) { deadlines.set(key, now + interval); },
  };
}
