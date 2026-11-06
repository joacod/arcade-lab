import test from 'node:test';
import assert from 'node:assert/strict';
import { createGait, fighterFrame, fighterCels as c, walkingCels } from '../../../../src/games/midnight-circuit/animation.ts';
import { createRun, stepRun, idle } from '../../../../src/games/midnight-circuit/game.ts';
import { attacks } from '../../../../src/games/midnight-circuit/content.ts';
import { arcadeFighterAtlas, qualityFighterAtlas } from '../../../../src/games/midnight-circuit/sprite-art.ts';

test('gait follows displacement, plants feet, freezes on pause and ignores knockback or teleports', () => {
  const run = createRun(), gait = createGait(); gait.observe(run);
  run.player.moving = true;
  for (let i = 0; i < 30; i++) { run.elapsed += 1/60; run.player.x += 2; gait.observe(run); }
  const phase = gait.get(0).phase;
  assert.ok(phase > 0);
  const pose = fighterFrame(run.player, gait.get(0));
  for (let i = 0; i < 50; i++) gait.observe(run);
  assert.deepEqual(fighterFrame(run.player, gait.get(0)), pose);
  run.elapsed += 1; gait.observe(run); assert.equal(gait.get(0).phase, phase); // blocked input
  assert.equal(fighterFrame(run.player, gait.get(0)), c.idle);
  run.player.x += 12; run.player.stun = .2; run.elapsed += 1/60; gait.observe(run);
  assert.equal(gait.get(0).phase, phase);
  run.player.stun = 0; run.player.x += 500; run.elapsed += 1/60; gait.observe(run);
  assert.equal(gait.get(0).phase, phase);
  assert.equal(fighterFrame(run.player,{phase:0,weight:1}),c.contactLeft);
  assert.equal(fighterFrame(run.player,{phase:Math.PI*.5,weight:1}),c.passingLeft);
  assert.equal(fighterFrame(run.player,{phase:Math.PI,weight:1}),c.contactRight);
  assert.equal(fighterFrame(run.player,{phase:Math.PI*1.5,weight:1}),c.passingRight);
  gait.reset(); assert.equal(gait.get(0).phase, 0);
});

test('gait distance is independent of sampling rate and never mutates gameplay', () => {
  const sample = frames => {
    const run = createRun(), gait = createGait(); gait.observe(run); run.player.moving = true;
    for(let i=0;i<frames;i++) { run.player.x += 100/frames; run.elapsed += 1/frames; const before=structuredClone(run); gait.observe(run); fighterFrame(run.player,gait.get(0)); assert.deepEqual(run,before); }
    return gait.get(0).phase;
  };
  assert.ok(Math.abs(sample(30)-sample(144)) < 1e-10);
});

test('each painted character exchanges support after its measured half-stride and completes all eight cels', () => {
  for (const atlas of [arcadeFighterAtlas, qualityFighterAtlas]) for (const kind of ['player','striker','bruiser','warden']) {
    const run = createRun(), a = run.player, gait = createGait(atlas.strides), poses = new Set();
    a.kind = kind; gait.observe(run); a.moving = true;
    for (let frame = 0; frame < 320; frame++) {
      run.elapsed += 1/60; a.x += atlas.strides[kind]/320; gait.observe(run);
      poses.add(fighterFrame(a,gait.get(0),atlas.walk));
      if(frame===159)assert.ok(Math.abs(gait.get(0).phase-Math.PI)<1e-10, `${kind}: opposite support at half-stride`);
    }
    assert.equal(poses.size, 8,kind);
    const phase=gait.get(0).phase;
    assert.ok(Math.min(phase,Math.PI*2-phase)<1e-10,kind);
    a.attack = { id: 1, kind: 'jab', time: attacks.jab.startup, hits: [], sounded: true };
    assert.equal(fighterFrame(a,gait.get(0),atlas.walk), c.punch);
  }
});

test('retreating in guard reverses the walk without negative atlas columns', () => {
  const run = createRun(), gait = createGait(); gait.observe(run);
  run.player.moving = true; run.player.facing = 1;
  run.player.x -= 12; run.elapsed += .05; gait.observe(run);
  assert.ok(Math.abs(gait.get(0).phase - Math.PI * 1.75) < 1e-10);
  assert.equal(fighterFrame(run.player, gait.get(0), walkingCels), walkingCels[7]);
});

test('recovery steps blend back into the walking pose while startup and contact keep planted feet', () => {
  const run = createRun(), p = run.player, gait = createGait(); gait.observe(run);
  p.moving = true;
  for (const kind of ['jab', 'heavy', 'finisher']) {
    gait.reset(); gait.observe(run);
    const d = attacks[kind];
    p.attack = { id: 1, kind, time: d.startup, hits: [], sounded: true };
    p.x += 2; run.elapsed += 1 / 60; gait.observe(run);
    assert.equal(gait.get(0).phase, 0);
    for (let frame = 1; frame <= 10; frame++) {
      p.attack.time = d.startup + d.active + d.recovery * frame / 10;
      p.x += 2; run.elapsed += 1 / 60; gait.observe(run);
    }
    assert.ok(gait.get(0).phase > 0); assert.ok(gait.get(0).weight > 0);
    assert.equal(fighterFrame(p,gait.get(0)),fighterFrame({...p,attack:null},gait.get(0)));

  }
});

test('real grounded movement traverses all four walking cels, including repeated render observations', () => {
  const run = createRun(), gait = createGait(), poses = new Set(); gait.observe(run);
  for (let frame = 0; frame < 48; frame++) {
    stepRun(run, { ...idle, x: 1 }, 1 / 60); gait.observe(run);
    poses.add(fighterFrame(run.player, gait.get(0)));
    const sample = structuredClone(gait.get(0));
    for (let repeat = 0; repeat < 3; repeat++) gait.observe(run);
    assert.deepEqual(gait.get(0), sample);
  }
  assert.deepEqual([...poses].sort(), [c.contactLeft,c.passingLeft,c.contactRight,c.passingRight]);
});

test('a neutral jump rises and falls in guarded cels; only an actual aerial attack uses kick contact', () => {
  const run = createRun(), gait = createGait(); gait.observe(run);
  stepRun(run, { ...idle, jump: true }, 1 / 60); gait.observe(run);
  assert.equal(run.player.attack, null);
  assert.equal(fighterFrame(run.player, gait.get(0)), c.rise);
  while (run.player.vz > 0) { stepRun(run, idle, 1 / 60); gait.observe(run); }
  assert.ok(run.player.elevation > 0);
  assert.equal(fighterFrame(run.player, gait.get(0)), c.fall);
  stepRun(run, { ...idle, light: true }, 1 / 60);
  assert.equal(run.player.attack.kind, 'air');
  assert.equal(fighterFrame(run.player, gait.get(0)), c.fall);
  run.player.attack.time = attacks.air.startup;
  assert.equal(fighterFrame(run.player, gait.get(0)), c.kick);
  run.player.attack.time = attacks.air.startup + attacks.air.active + attacks.air.recovery * .85;
  assert.equal(fighterFrame(run.player, gait.get(0)), c.fall);
  run.player.attack = null;
  while (run.player.elevation > 0) stepRun(run, idle, 1 / 60);
  gait.observe(run);
  assert.equal(fighterFrame(run.player, gait.get(0)), c.idle);
});
