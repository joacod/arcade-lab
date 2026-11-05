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

import { createReadiness, trialReplacement } from '../../../src/engine/browser/preparation.ts';
const flush = () => new Promise(resolve => setImmediate(resolve));

test('required resources gate play, retry failures and ignore superseded completion and retry callbacks', async () => {
  const lifetime = new AbortController(), states = [];
  let retry, finish, fail = true;
  const readiness = createReadiness(lifetime.signal, (state, callback) => { states.push(state); retry = callback; });
  readiness.watch(async () => { if (fail) throw new Error('offline'); });
  assert.equal(readiness.ready, false);
  await flush(); assert.equal(states.at(-1), 'failed');
  fail = false; retry(); await flush(); assert.equal(readiness.ready, true);
  readiness.watch(() => new Promise(resolve => { finish = resolve; }));
  await flush(); const staleRetry = retry;
  readiness.watch(async () => { throw new Error('new request failed'); });
  await flush(); finish(); staleRetry(); await flush();
  assert.equal(states.at(-1), 'failed'); assert.equal(readiness.ready, false);
  let calls = 0;
  readiness.watch(async () => { calls++; }); lifetime.abort(); await flush();
  retry(); await flush(); assert.equal(calls, 0); assert.equal(readiness.ready, false);
});

test('reported preparation failure cannot unlock play and a newer selection owns readiness', async () => {
  const states = [], lifetime = new AbortController();
  const readiness = createReadiness(lifetime.signal, state => states.push(state));
  readiness.watch(async () => false);
  await flush(); assert.equal(states.at(-1), 'failed'); assert.equal(readiness.ready, false);
  let finish;
  readiness.watch(() => new Promise(resolve => { finish = resolve; }));
  await flush();
  readiness.watch(async () => true);
  await flush(); finish(false); await flush();
  assert.equal(states.at(-1), 'ready'); assert.equal(readiness.ready, true);
});

test('replacement trials commit only successful draws and roll back failed candidates', () => {
  const events = [], replacement = { rollback() { events.push('rollback'); }, commit() { events.push('commit'); } };
  trialReplacement(replacement, () => events.push('draw'));
  assert.deepEqual(events, ['draw', 'commit']);
  assert.throws(() => trialReplacement(replacement, () => { events.push('failure'); throw new Error('draw failed'); }), /draw failed/);
  assert.deepEqual(events, ['draw', 'commit', 'failure', 'rollback']);
});
