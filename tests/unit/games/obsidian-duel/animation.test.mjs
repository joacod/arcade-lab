import test from 'node:test';
import assert from 'node:assert/strict';
import { createDuelAnimation } from '../../../../src/games/obsidian-duel/animation.ts';
import { foundryFrame } from '../../../../src/games/obsidian-duel/asset-art.ts';
import { createMatch } from '../../../../src/games/obsidian-duel/game.ts';
import { fighters } from '../../../../src/games/obsidian-duel/content.ts';
test('both renderers enter contact cels at the active boundary and recover on authored move time', () => {
  for (const kind of ['nera', 'kael']) for (const [move, d] of Object.entries(fighters[kind].attacks)) {
    const f = createMatch(kind).fighters[0], animation = createDuelAnimation();
    f.attack = { id: 1, kind: move, time: 0, hits: [], sounded: false };
    for (const time of [0, d.startup * .8, d.startup - .00001, d.startup, d.startup + d.active * .8, d.startup + d.active + d.recovery * .9]) {
      f.attack.time = time;
      const snapshot = JSON.stringify(f), sample = animation.sample(f, time, false);
      assert.equal(JSON.stringify(f), snapshot);
      assert.equal(sample.clip, move);
      const [x,y] = foundryFrame(sample), [firstX,firstY] = foundryFrame({clip:move,frame:0});
      const column = (y-firstY)/224*8+(x-firstX)/320;
      if (time < d.startup) assert.ok(column < 3);
      else if (time < d.startup + d.active) assert.ok(column >= 3 && column <= 4);
      else assert.ok(column >= 5);
      assert.deepEqual(animation.sample(f, time, true), sample, 'reduced motion preserves attack information');
    }
  }
});

test('walk stance feet remain planted in world space; gait follows signed travel and freezes on pause', () => {
  const f = createMatch().fighters[0], animation = createDuelAnimation(); f.state = 'move';
  animation.sample(f, 0, false); f.x += 25;
  const moved = animation.sample(f, .1, false);
  assert.equal(moved.frame, 2); assert.deepEqual(animation.sample(f, .1, false), moved);
  assert.deepEqual(animation.sample(f, .9, false), moved, 'wall pressure cannot march in place');
  f.x -= 10; assert.ok(Math.abs(animation.sample(f, 1, false).frame - 1.2) < 1e-6);
  animation.reset(); assert.equal(animation.sample(f, 1, false).frame, 0);

});

test('knockdown settles on the floor, wake-up returns to stance and a new round resets observations', () => {
  const f = createMatch().fighters[0], animation = createDuelAnimation();
  f.state = 'ko'; animation.sample(f, 0, false);
  assert.equal(animation.sample(f, .3, false).frame, 3);
  f.state = 'wakeup'; f.stateTime = .15; assert.equal(animation.sample(f, .4, false).clip, 'rise');
  f.stateTime = 0; assert.deepEqual(animation.sample(f, .55, false), { clip: 'rise', frame: 3 });
  assert.equal(animation.sample(createMatch().fighters[0], 0, true).frame, 0);
});
