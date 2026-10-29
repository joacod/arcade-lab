import test from 'node:test';
import assert from 'node:assert/strict';
import { createGait, fighterPose } from '../../../../src/games/midnight-circuit/animation.ts';
import { createRun } from '../../../../src/games/midnight-circuit/game.ts';
import { attacks } from '../../../../src/games/midnight-circuit/content.ts';

test('gait follows displacement, plants feet, freezes on pause and ignores knockback or teleports', () => {
  const run = createRun(), gait = createGait(); gait.observe(run);
  run.player.moving = true;
  for (let i = 0; i < 30; i++) { run.elapsed += 1/60; run.player.x += 2; gait.observe(run); }
  const phase = gait.get(0).phase;
  assert.ok(phase > 0);
  const pose = fighterPose(run.player, gait.get(0));
  for (let i = 0; i < 50; i++) gait.observe(run);
  assert.deepEqual(fighterPose(run.player, gait.get(0)), pose);
  run.elapsed += 1; gait.observe(run); assert.equal(gait.get(0).phase, phase); // blocked input
  run.player.x += 12; run.player.stun = .2; run.elapsed += 1/60; gait.observe(run);
  assert.equal(gait.get(0).phase, phase);
  run.player.stun = 0; run.player.x += 500; run.elapsed += 1/60; gait.observe(run);
  assert.equal(gait.get(0).phase, phase);
  const stance = fighterPose(run.player, { phase: 0, weight: 1 });
  const later = fighterPose(run.player, { phase: .5, weight: 1 });
  assert.equal(stance.frontFoot[1], later.frontFoot[1]);
  assert.ok(later.frontFoot[0] < stance.frontFoot[0]);
  const swing = fighterPose(run.player, { phase: Math.PI * 1.6, weight: 1 });
  assert.ok(swing.frontFoot[1] < -4);
  gait.reset(); assert.equal(gait.get(0).phase, 0);
});

test('gait distance is independent of sampling rate and never mutates gameplay', () => {
  const sample = frames => {
    const run = createRun(), gait = createGait(); gait.observe(run); run.player.moving = true;
    for(let i=0;i<frames;i++) { run.player.x += 100/frames; run.elapsed += 1/frames; const before=structuredClone(run); gait.observe(run); fighterPose(run.player,gait.get(0)); assert.deepEqual(run,before); }
    return gait.get(0).phase;
  };
  assert.ok(Math.abs(sample(30)-sample(144)) < 1e-10);
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
    const recovered = fighterPose(p, gait.get(0));
    p.attack = null; const walking = fighterPose(p, gait.get(0));
    for (const part of ['frontFoot', 'backFoot', 'frontKnee', 'backKnee']) {
      assert.ok(Math.abs(recovered[part][0] - walking[part][0]) < 1e-10);
      assert.ok(Math.abs(recovered[part][1] - walking[part][1]) < 1e-10);
    }
  }
});
