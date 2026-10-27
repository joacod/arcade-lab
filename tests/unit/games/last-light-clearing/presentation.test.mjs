import test from 'node:test';
import assert from 'node:assert/strict';
import { configurations, clearing, enemies } from '../../../../src/games/last-light-clearing/content.ts';
import { createRun, stepRun, pauseRun, takeEvents } from '../../../../src/games/last-light-clearing/game.ts';
import { content, validateContent } from '../../../../src/games/last-light-clearing/content-validation.ts';
import { themes } from '../../../../src/games/last-light-clearing/themes.ts';
import { validateArtPack, clipFrame, row } from '../../../../src/games/last-light-clearing/art-pack.ts';
import { createAnimationObservations, actorClip } from '../../../../src/games/last-light-clearing/animation.ts';
import { resolvedSkin } from '../../../../src/games/last-light-clearing/interface.ts';
import { prepareAssets } from '../../../../src/games/last-light-clearing/assets.ts';

const idle = { x: 0, y: 0 };
test('round profiles validate and preserve start, pause, outcome precedence and fresh retry', () => {
  for (const { round } of Object.values(configurations)) {
    assert.deepEqual(validateContent({ ...content, clearing: { ...clearing, round } }), []);
    const run = createRun(42, round);
    assert.equal(run.nextSpawn, round.phases[0].interval);
    pauseRun(run, true); const frozen = structuredClone(run);
    stepRun(run, idle, 50); assert.deepEqual(run, frozen); pauseRun(run, false);
    run.elapsed = round.eliteAt - 1 / 60;
    stepRun(run, idle, 1 / 60);
    assert.equal(run.enemies.filter(enemy => enemies[enemy.kind].elite).length, 1);
    run.enemies = []; run.elapsed = round.duration - 1 / 60;
    stepRun(run, idle, 1 / 60); assert.equal(run.outcome, 'victory');
    assert.equal(takeEvents(run).filter(event => event.type === 'outcome').length, 1);
    const result = structuredClone(run); stepRun(run, idle, 1); assert.deepEqual(run, result);
    assert.deepEqual(createRun(42, round), createRun(42, round));
    assert.equal(createRun(42, round).player.health, 100);
    const lethal = createRun(42, round);
    lethal.elapsed = round.duration - 1 / 60; lethal.player.health = 10; lethal.loadout = [];
    lethal.enemies = [{ id: 1, kind: 'crawler', ...lethal.player, health: 20, entryDelay: 0 }];
    stepRun(lethal, idle, 1 / 60); assert.equal(lethal.outcome, 'defeat');
  }
});

test('art manifests validate decoded bounds, clips, pivots and visual footprints independently of bodies', () => {
  assert.deepEqual(validateArtPack(themes.woodland.art, { actors: { width: 192, height: 64 } }), []);
  assert.deepEqual(validateArtPack(themes.moonglass.art, { actors: { width: 240, height: 80 } }), []);
  assert.deepEqual(validateArtPack(themes.ember.art, { dungeon: { width: 512, height: 512 } }), []);
  for (const id of ['keeper', 'crawler', 'elite']) {
    const a = themes.woodland.art.actors[id], b = themes.moonglass.art.actors[id];
    assert.notEqual(a.clips.idle.frames[0].rect[2], b.clips.idle.frames[0].rect[2]);
    assert.deepEqual(a.footprint, b.footprint);
  }
  const invalid = structuredClone(themes.ember.art);
  invalid.actors.keeper.clips.move.frames[3].rect[0] = 510;
  invalid.actors.crawler.anchor[0] = NaN;
  invalid.actors.elite.clips.idle.frameSeconds = 0;
  assert.equal(validateArtPack(invalid, { dungeon: { width: 512, height: 512 } }).length, 3);
  invalid.actors.keeper.clips.idle.frames[0].image = 'missing';
  assert.match(validateArtPack(invalid, { dungeon: { width: 512, height: 512 } }).join(';'), /invalid frame.*missing/);
  assert.equal(clearing.keeper.radius, 10); assert.equal(enemies.crawler.radius, 11);
});

test('animation uses active time and step observations, retaining motion between draws and throughout pause', () => {
  const clip = row('sheet', 0, 0, 16, 28, 4, 0.1);
  assert.equal(clipFrame(clip, 0.25), clip.frames[2]);
  assert.equal(clipFrame(clip, 0.45), clip.frames[0]);
  assert.equal(clipFrame({ ...clip, loop: false }, 8), clip.frames[3]);
  const run = createRun(42), observer = createAnimationObservations(); observer.reset(run);
  const art = themes.ember.art.actors.keeper;
  assert.equal(actorClip(art, observer.get('keeper')), art.clips.idle);
  stepRun(run, { x: 1, y: 0 }, 1 / 60); observer.observe(run);
  const moving = structuredClone(observer.get('keeper'));
  for (let i = 0; i < 5; i++) assert.equal(actorClip(art, observer.get('keeper')), art.clips.move);
  pauseRun(run, true); stepRun(run, idle, 30);
  assert.deepEqual(observer.get('keeper'), moving);
  pauseRun(run, false); stepRun(run, idle, 1 / 60); observer.observe(run);
  assert.equal(actorClip(art, observer.get('keeper')), art.clips.idle);
  assert.equal(observer.get('keeper').angle, 0);
  run.enemies = []; observer.observe(run); assert.equal(observer.get(1), undefined);
  observer.reset(createRun(42)); assert.equal(observer.get('keeper').moving, false);
  assert.equal(resolvedSkin('glass', 'rune'), 'glass');
  assert.equal(resolvedSkin('match', 'rune'), 'rune');
});

test('prepared bundles validate bounds and release failed, cancelled and disposed images', async () => {
  const images = [];
  class ImageStub {
    naturalWidth = 512; naturalHeight = 512; released = false;
    constructor() { images.push(this); }
    removeAttribute() { this.released = true; }
  }
  const original = globalThis.Image; globalThis.Image = ImageStub;
  try {
    const stale = new AbortController();
    const cancelled = prepareAssets(themes.woodland.art, stale.signal);
    const late = images[0].onload; stale.abort();
    await assert.rejects(cancelled, /cancelled/); late(); assert.equal(images[0].released, true);
    const controller = new AbortController();
    const prepared = prepareAssets(themes.ember.art, controller.signal);
    images[1].onload(); const bundle = await prepared;
    assert.equal(bundle.images.dungeon, images[1]);
    // Successful images outlive the preparation signal; only their owner disposes them.
    controller.abort(); assert.equal(images[1].released, false);
    const invalid = prepareAssets(themes.woodland.art, new AbortController().signal);
    images[2].naturalWidth = 1; images[2].onload();
    await assert.rejects(invalid, /invalid frame/); assert.equal(images[2].released, true);
    const failed = prepareAssets(themes.woodland.art, new AbortController().signal);
    images[3].onerror(); await assert.rejects(failed, /could not load/);
    assert.equal(images[3].released, true);
    bundle.dispose(); bundle.dispose(); assert.equal(images[1].released, true);
    assert.equal(images[1].onload, null);
  } finally { globalThis.Image = original; }
});
