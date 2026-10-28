import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreparationScope } from '../../../src/engine/browser/preparation.ts';

test('superseded, cancelled and disposed preparations cannot commit late completions', async () => {
  const scope = createPreparationScope();
  const first = scope.begin();
  let finish;
  const completion = new Promise(resolve => { finish = resolve; }).then(() => first.current());
  const second = scope.begin();
  assert.equal(first.signal.aborted, true);
  finish(); assert.equal(await completion, false);
  assert.equal(second.current(), true);
  scope.cancel(); assert.equal(second.current(), false); assert.equal(second.signal.aborted, true);
  const third = scope.begin(); assert.equal(third.current(), true);
  scope.dispose(); scope.dispose();
  assert.equal(third.current(), false); assert.equal(third.signal.aborted, true);
  const late = scope.begin(); assert.equal(late.current(), false); assert.equal(late.signal.aborted, true);
});
