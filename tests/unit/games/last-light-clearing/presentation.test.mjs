import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { configurations, clearing, enemies, weapons } from '../../../../src/games/last-light-clearing/content.ts';
import { createRun, stepRun, pauseRun, takeEvents } from '../../../../src/games/last-light-clearing/game.ts';
import { content, validateContent } from '../../../../src/games/last-light-clearing/content-validation.ts';
import { themes, emberRuins, rekindledArt } from '../../../../src/games/last-light-clearing/themes.ts';
import { actorBounds, validateArtPack, clipFrame, row } from '../../../../src/games/last-light-clearing/art-pack.ts';
import { createAnimationObservations, actorClip, actorAnimation } from '../../../../src/games/last-light-clearing/animation.ts';
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
  const painted = { keeper: { width: 1024, height: 512 }, goblins: { width: 1024, height: 512 },
    elite: { width: 1024, height: 512 }, props: { width: 768, height: 512 }, ground: { width: 1536, height: 1024 } };
  assert.deepEqual(validateArtPack(rekindledArt, painted), []);
  assert.match(validateArtPack(rekindledArt, { ...painted, ground: { width: 1, height: 1 } }).join(';'), /plate/);
  assert.match(validateArtPack(rekindledArt, { ...painted, goblins: { width: 1, height: 1 } }).join(';'), /charger/);
  assert.deepEqual(validateArtPack(emberRuins.art, { dungeon: { width: 512, height: 512 } }), []);
  const invalid = structuredClone(emberRuins.art);
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
  const art = emberRuins.art.actors.keeper;
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
});

test('committed Deluxe cels fit gameplay scale, surround their centers and meet their registered ground', async () => {
  const expectedHeights = { keeper: [34, 39], crawler: [22, 26], charger: [24, 29], elite: [45, 50] };
  for (const [role, art] of Object.entries(rekindledArt.actors)) {
    const bounds = actorBounds(art);
    const radius = role === 'keeper' ? clearing.keeper.radius : enemies[role === 'elite' ? 'elite_crawler' : role].radius;
    assert.ok(bounds.top < -radius && bounds.bottom > 0, `${role}: body must surround gameplay center`);
    assert.ok(bounds.groundY > 0 && bounds.groundY < radius, `${role}: soles must stay near the physical body`);
    const frames = [...art.clips.idle.frames, ...art.clips.move.frames];
    for (const frame of frames) {
      const [left, top, width, height] = frame.rect;
      const { data, info } = await sharp(fileURLToPath(rekindledArt.images[frame.image]))
        .extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let minX = width, minY = height, maxX = 0, maxY = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * info.channels + 3] > 64) {
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + 1); maxY = Math.max(maxY, y + 1);
      }
      const visibleHeight = (maxY - minY) / height * art.footprint[1];
      assert.ok(visibleHeight >= expectedHeights[role][0] && visibleHeight <= expectedHeights[role][1], `${role}: visible height ${visibleHeight}`);
      const [ax, ay] = art.anchor;
      assert.ok(ax * width > minX && ax * width < maxX && ay * height > minY && ay * height < maxY, `${role}: anchor outside artwork`);
      assert.ok(Math.abs(maxY - art.ground[1] * height) <= 4, `${role}: sole drift across cels`);
      const envelope = art.visualBounds;
      assert.ok(minX >= envelope[0] * width && minY >= envelope[1] * height
        && maxX <= envelope[2] * width && maxY <= envelope[3] * height, `${role}: feedback envelope clips artwork`);
      if (role === 'keeper') {
        const farX = Math.max(Math.abs((minX / width - ax) * art.footprint[0]), Math.abs((maxX / width - ax) * art.footprint[0]));
        assert.ok(Math.hypot(farX, (minY / height - ay) * art.footprint[1]) < weapons.halo.radius, 'Halo must surround the helmet and plume');
      }
    }
  }
});

test('Deluxe walking phase follows observed displacement and survives stops and reversals', () => {
  const art = rekindledArt.actors.keeper;
  const run = createRun(42), observer = createAnimationObservations(); observer.reset(run);
  run.player.x += art.stride / 4; run.elapsed = .1; observer.observe(run);
  let pose = actorAnimation(art, observer.get('keeper'), run.elapsed);
  assert.equal(clipFrame(pose.clip, pose.age), art.clips.move.frames[1]);
  run.elapsed += 2; observer.observe(run);
  assert.equal(actorAnimation(art, observer.get('keeper'), run.elapsed).clip, art.clips.idle);
  run.player.x -= art.stride / 4; run.elapsed += .1; observer.observe(run);
  pose = actorAnimation(art, observer.get('keeper'), run.elapsed);
  assert.equal(clipFrame(pose.clip, pose.age), art.clips.move.frames[2]);
  assert.equal(observer.get('keeper').angle, Math.PI);
  const invalid = structuredClone(rekindledArt);
  invalid.actors.keeper.visualBounds = [0, 1, 1, 0];
  invalid.actors.keeper.ground = [0, NaN]; invalid.actors.keeper.stride = 0;
  const dimensions = { keeper: { width: 1024, height: 512 }, goblins: { width: 1024, height: 512 },
    elite: { width: 1024, height: 512 }, props: { width: 768, height: 512 }, ground: { width: 1536, height: 1024 } };
  assert.equal(validateArtPack(invalid, dimensions).length, 3);
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
    const cancelled = prepareAssets(emberRuins.art, stale.signal);
    const late = images[0].onload; stale.abort();
    await assert.rejects(cancelled, /cancelled/); late(); assert.equal(images[0].released, true);
    const controller = new AbortController();
    const prepared = prepareAssets(emberRuins.art, controller.signal);
    images[1].onload(); const bundle = await prepared;
    assert.equal(bundle.images.dungeon, images[1]);
    // Successful images outlive the preparation signal; only their owner disposes them.
    controller.abort(); assert.equal(images[1].released, false);
    const invalid = prepareAssets(emberRuins.art, new AbortController().signal);
    images[2].naturalWidth = 1; images[2].onload();
    await assert.rejects(invalid, /invalid frame/); assert.equal(images[2].released, true);
    const failed = prepareAssets(emberRuins.art, new AbortController().signal);
    images[3].onerror(); await assert.rejects(failed, /could not load/);
    assert.equal(images[3].released, true);
    bundle.dispose(); bundle.dispose(); assert.equal(images[1].released, true);
    assert.equal(images[1].onload, null);
  } finally { globalThis.Image = original; }
});
