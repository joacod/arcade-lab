import test from 'node:test';
import assert from 'node:assert/strict';
import { configurations, clearing, enemies } from '../src/content.ts';
import { createRun, stepRun, pauseRun, takeEvents } from '../src/game.ts';
import { content, validateContent } from '../src/content-validation.ts';
import { themes, validateTheme } from '../src/themes.ts';
import { createAssets } from '../src/assets.ts';
import { createSound, MAX_VOICES } from '../src/sound.ts';

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

test('different art frames preserve draw size independently of physical bodies and diagnose invalid metadata', () => {
  assert.deepEqual(validateTheme(themes.woodland, 192, 64), []);
  assert.deepEqual(validateTheme(themes.moonglass, 240, 80), []);
  for (const id of ['keeper', 'crawler', 'elite_crawler']) {
    const a = themes.woodland.sprites[id], b = themes.moonglass.sprites[id];
    assert.notEqual(a.frame[2], b.frame[2]);
    assert.equal(a.frame[2] * a.scale, b.frame[2] * b.scale);
  }
  const invalid = structuredClone(themes.woodland);
  invalid.sprites.keeper.frame[2] = 300;
  invalid.sprites.crawler.anchor[0] = NaN;
  assert.equal(validateTheme(invalid, 192, 64).length, 2);
  assert.equal(clearing.keeper.radius, 10); assert.equal(enemies.crawler.radius, 11);
});

test('asset failures, invalid frames, replacement and disposal ignore stale completions', () => {
  const images = [], updates = [];
  class ImageStub {
    naturalWidth = 192; naturalHeight = 64;
    constructor() { images.push(this); }
    removeAttribute() {}
  }
  const original = globalThis.Image; globalThis.Image = ImageStub;
  try {
    const assets = createAssets((image, message) => updates.push({ image, message }));
    assets.load(themes.woodland); const stale = images[0].onload;
    assets.load(themes.moonglass); const count = updates.length;
    stale(); assert.equal(updates.length, count);
    images[1].onload(); assert.match(updates.at(-1).message, /invalid frame/);
    assets.load(themes.woodland); images[2].onerror();
    assert.match(updates.at(-1).message, /Using clear shape/);
    assets.load(themes.woodland); images[3].onload(); assert.equal(updates.at(-1).image, images[3]);
    assets.load(themes.woodland); const late = images[4].onload;
    assets.dispose(); const before = updates.length; late();
    assert.equal(updates.length, before); assert.equal(images[4].onload, null);
  } finally { globalThis.Image = original; }
});

test('sound activates immediately, caps voices, discards paused events and closes its single context', async () => {
  const contexts = [];
  const param = () => ({ value: 0, cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class AudioStub {
    currentTime = 0; state = 'suspended'; destination = {}; oscillators = []; resumes = 0;
    constructor() { contexts.push(this); }
    createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
    createOscillator() {
      const oscillator = { frequency: param(), starts: 0, stops: 0, connect() {}, disconnect() {}, start() { this.starts++; }, stop() { this.stops++; } };
      this.oscillators.push(oscillator); return oscillator;
    }
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const original = globalThis.AudioContext; globalThis.AudioContext = AudioStub;
  try {
    const sound = createSound(() => {}), shot = [{ type: 'shot', x: 0, y: 0, at: 0 }];
    sound.consume(shot); assert.equal(contexts.length, 0);
    sound.activate(); assert.equal(contexts.length, 1); assert.equal(contexts[0].resumes, 1);
    sound.consume([...shot, ...shot, ...shot]); assert.equal(contexts[0].oscillators.length, 1);
    for (let i = 0; i < 100; i++) sound.consume(shot);
    assert.equal(contexts[0].oscillators.length, MAX_VOICES);
    sound.pause(); sound.consume(shot); assert.ok(contexts[0].oscillators.every(voice => voice.stops >= 2));
    assert.ok(contexts[0].oscillators.every(voice => voice.onended === null));
    sound.activate(); await Promise.resolve(); assert.equal(contexts[0].oscillators.length, MAX_VOICES); // no backlog
    sound.consume(shot); assert.equal(contexts[0].oscillators.length, MAX_VOICES + 1);
    sound.setMuted(true); sound.consume(shot); assert.equal(contexts[0].oscillators.length, MAX_VOICES + 1);
    sound.setMuted(false); sound.setVolume(0); sound.consume(shot); assert.equal(contexts[0].oscillators.length, MAX_VOICES + 1);
    sound.reset(); sound.dispose(); sound.dispose(); await Promise.resolve();
    assert.equal(contexts[0].state, 'closed'); assert.equal(contexts.length, 1);
    globalThis.AudioContext = class { constructor() { throw new Error('unavailable'); } };
    const messages = [], silent = createSound(message => messages.push(message));
    silent.activate(); assert.match(messages[0], /unavailable/); silent.dispose();
  } finally { globalThis.AudioContext = original; }
});
