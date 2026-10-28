import test from 'node:test';
import assert from 'node:assert/strict';
import { disposeAll } from '../../../src/engine/disposal.ts';

test('cleanup attempts every owner in order and preserves all failures', () => {
  const released = [], graphics = new Error('graphics'), audio = new Error('audio');
  assert.throws(() => disposeAll(
    () => { released.push('graphics'); throw graphics; },
    () => { released.push('assets'); },
    () => { released.push('audio'); throw audio; },
    () => { released.push('host'); },
  ), error => error instanceof AggregateError && error.errors[0] === graphics && error.errors[1] === audio);
  assert.deepEqual(released, ['graphics', 'assets', 'audio', 'host']);
  assert.doesNotThrow(() => disposeAll(() => released.push('complete')));
});
