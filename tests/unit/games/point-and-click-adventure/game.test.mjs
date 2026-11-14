import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, dispatch, startScene, stepRun, has, visible } from '../../../../src/games/point-and-click-adventure/game.ts';
import { getTarget, rooms, targets } from '../../../../src/games/point-and-click-adventure/content.ts';
import { route, inside } from '../../../../src/games/point-and-click-adventure/navigation.ts';
import { snapshot, restore, encode, readEnvelope } from '../../../../src/games/point-and-click-adventure/save.ts';
import { createSaveStore } from '../../../../src/games/point-and-click-adventure/storage.ts';
import { contentErrors } from '../../../../src/games/point-and-click-adventure/content-validation.ts';
function at(run, target, verb = 'interact', item) {
  const t = getTarget(target); run.room = t.room; run.actor = { ...t.at };
  dispatch(run, { kind: 'target', target, verb, ...(item ? { item } : {}) }); stepRun(run, 1 / 60);
}
function investigated() {
  const run = createRun();
  run.inventory.brush = run.inventory.poker = 'consumed'; run.inventory.longBrush = run.inventory.cabinetKey = run.inventory.windingKey = 'inventory';
  run.facts = ['introduced', 'vent', 'tubeOpen', 'mechanism', 'cabinetOpen', 'music', 'photoLit', 'testimony', 'record', 'fraud', 'guardians']; return run;
}
test('navigation uses connected floor portals and rejects unreachable regions', () => {
  const floors = [{ x: 0, y: 0, w: 100, h: 30 }, { x: 70, y: 20, w: 30, h: 100 }];
  const start = { x: 5, y: 15 }, end = { x: 85, y: 110 }, path = route(start, end, floors);
  assert.ok(path.length > 1); let previous = start;
  for (const next of path) {
    for (const t of [0, .25, .5, .75, 1]) assert.ok(floors.some(f => inside({ x: previous.x + (next.x - previous.x) * t, y: previous.y + (next.y - previous.y) * t }, f)));
    previous = next;
  }
  assert.equal(route(start, { x: 250, y: 20 }, [...floors, { x: 200, y: 0, w: 100, h: 100 }]), undefined);
});
test('replacing and cancelling an approach cannot execute its stale pickup', () => {
  const run = createRun(); run.room = 'kitchen'; run.actor = { x: 50, y: 500 };
  dispatch(run, { kind: 'target', target: 'brush', verb: 'interact' });
  dispatch(run, { kind: 'tool', item: 'lens' }); stepRun(run, .1);
  assert.equal(run.pending, undefined); assert.equal(run.inventory.brush, 'world');
  dispatch(run, { kind: 'target', target: 'poker', verb: 'interact' }); dispatch(run, { kind: 'cancel' }); stepRun(run, .1);
  assert.equal(run.inventory.poker, 'world');
  at(run, 'brush'); assert.equal(run.inventory.brush, 'inventory'); assert.equal(visible(run, 'brush'), false);
});
test('inventory recipes are atomic and wrong uses preserve essential tools', () => {
  const run = createRun(); run.inventory.brush = run.inventory.poker = 'inventory';
  dispatch(run, { kind: 'combine', first: 'brush', second: 'lens' }); assert.equal(run.inventory.brush, 'inventory');
  dispatch(run, { kind: 'combine', first: 'poker', second: 'brush' });
  assert.deepEqual([run.inventory.brush, run.inventory.poker, run.inventory.longBrush], ['consumed', 'consumed', 'inventory']);
  at(run, 'tube', 'use', 'longBrush'); assert.equal(has(run, 'tubeOpen'), true);
  at(run, 'tube'); assert.equal(has(run, 'mechanism'), true); assert.ok(restore(snapshot(run)));
});
test('deductions require discovered supporting evidence and both threads gate confrontation', () => {
  const run = createRun();
  dispatch(run, { kind: 'deduce', conclusion: 'fraud', evidence: ['vent', 'mechanism'] }); assert.equal(has(run, 'fraud'), false);
  run.facts.push('vent', 'mechanism', 'mark');
  dispatch(run, { kind: 'deduce', conclusion: 'fraud', evidence: ['vent', 'mechanism', 'mark'] }); assert.equal(has(run, 'fraud'), false);
  dispatch(run, { kind: 'deduce', conclusion: 'fraud', evidence: ['vent'] }); assert.equal(has(run, 'fraud'), false);
  dispatch(run, { kind: 'deduce', conclusion: 'fraud', evidence: ['vent', 'mechanism'] }); assert.equal(has(run, 'fraud'), true);
  run.conversation = 'vale'; dispatch(run, { kind: 'topic', id: 'confront' }); assert.equal(run.dialogue, undefined);
  at(run, 'bellDoor'); assert.equal(run.room, 'gallery');
});
test('skipping a story scene commits the same durable result as reading it', () => {
  for (const scene of ['intro', 'testimony', 'confrontation', 'ending']) {
    const read = investigated(), skip = investigated();
    for (const run of [read, skip]) { run.facts.push('confronted', 'chain', 'ward', 'mirror'); run.lantern = { occupant: 'guest', phase: 'sealed' }; startScene(run, scene); }
    dispatch(skip, { kind: 'skip' });
    while (read.dialogue) dispatch(read, { kind: 'next' });
    assert.deepEqual(skip.facts, read.facts); assert.equal(skip.status, read.status);
    assert.ok(restore(snapshot(skip))); assert.ok(restore(snapshot(read)));
  }
});
test('containment mistakes release a recoverable spirit and the ending needs a sealed vessel', () => {
  const run = investigated(); run.facts.push('confronted');
  at(run, 'guest', 'use', 'bellows'); assert.equal(run.lantern.occupant, 'empty');
  run.facts.push('chain', 'ward', 'mirror'); at(run, 'guest', 'use', 'bellows');
  assert.equal(visible(run, 'guest'), false);
  dispatch(run, { kind: 'tool', item: 'fork' }); assert.equal(visible(run, 'guest'), true);
  at(run, 'guest', 'use', 'bellows'); at(run, 'housing'); assert.equal(run.dialogue, undefined);
  dispatch(run, { kind: 'tool', item: 'lantern' }); dispatch(run, { kind: 'tool', item: 'fork' });
  at(run, 'housing'); assert.equal(run.dialogue.scene, 'ending'); dispatch(run, { kind: 'skip' });
  assert.equal(run.status, 'complete'); assert.ok(restore(snapshot(run)));
});
test('save validation rejects inconsistent progress and restores only stable durable state', () => {
  const run = investigated(); const saved = snapshot(run); const restored = restore({ ...saved, pending: { path: [] }, dialogue: { lines: [] }, events: ['bad-cue'] });
  assert.ok(restored); assert.deepEqual(restored.events, []); assert.equal(restored.dialogue, undefined); assert.deepEqual(restored.facts, run.facts); assert.equal(restored.pending, undefined);
  restored.facts.push('voice'); assert.equal(saved.facts.includes('voice'), false);
  for (const mutate of [s => { s.actor.x = NaN; }, s => { s.facts.push('finished'); }, s => { s.inventory.lantern = 'consumed'; }, s => { s.lantern.phase = 'sealed'; }, s => { s.room = 'bell'; }, s => { s.facts = ['guardians']; }]) {
    const bad = structuredClone(saved); mutate(bad); assert.equal(restore(bad), undefined);
  }
  startScene(run, 'confrontation'); assert.throws(() => snapshot(run), /stable/);
  assert.equal(readEnvelope('{'), undefined); assert.equal(readEnvelope(JSON.stringify({ schema: 2 })), undefined);
});
test('atomic save envelope recovers its backup and refuses cross-tab or failed overwrites', () => {
  let raw = null; const reports = [], storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  const store = createSaveStore(storage, text => reports.push(text)); const run = createRun();
  assert.equal(store.write(run), true); run.facts.push('introduced'); assert.equal(store.write(run), true);
  assert.equal(store.available(true), true); assert.deepEqual(store.load(true).facts, []);
  const once = raw; assert.equal(store.write(run), true); assert.equal(raw, once); // Manual Save must not replace the distinct backup with a duplicate.
  const damaged = JSON.parse(raw); damaged.current.actor.x = 'broken'; raw = JSON.stringify(damaged);
  assert.equal(readEnvelope(raw).current, undefined); assert.ok(readEnvelope(raw).previous);
  assert.equal(store.write(run), false); assert.match(reports.at(-1), /different tab/); assert.equal(raw, JSON.stringify(damaged));
  const unavailable = createSaveStore({ getItem: () => null, setItem() { throw new Error('quota'); } }, text => reports.push(text));
  assert.equal(unavailable.write(run), false); assert.match(reports.at(-1), /still playable/);
  assert.ok(readEnvelope(encode(snapshot(run), null)).current);
});

test('content diagnostics name an unreachable authored target before play', () => {
  assert.deepEqual(contentErrors(), []);
  const bad = structuredClone(targets); bad.brush.at = { x: -100, y: -100 };
  assert.ok(contentErrors(rooms, bad).some(message => message.includes('brush: approach is unreachable')));
});
