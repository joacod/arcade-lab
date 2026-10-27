import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, takeEvents } from '../../../../src/games/last-light-clearing/game.ts';
import { fireShard } from '../../../../src/games/last-light-clearing/weapons/shard.ts';
import { fireSpark } from '../../../../src/games/last-light-clearing/weapons/spark.ts';
import { advanceHalo, orbitPosition } from '../../../../src/games/last-light-clearing/weapons/halo.ts';
import { equip } from '../../../../src/games/last-light-clearing/progression.ts';
import { enemies } from '../../../../src/games/last-light-clearing/content.ts';

test('Clearing emits weapon identity, a single halo contact notification and the elite encounter', () => {
  const run = createRun(42), spark = equip('spark');
  fireSpark(run, spark);
  assert.equal(takeEvents(run).find(e => e.type === 'shot').weapon, 'spark');
  spark.id = 'arc_spark'; fireSpark(run, spark);
  assert.equal(takeEvents(run).find(e => e.type === 'shot').weapon, 'arc_spark');
  fireShard(run, equip('shard'));
  assert.deepEqual(takeEvents(run).filter(e => e.type === 'shot').map(e => e.weapon), Array(4).fill('shard'));
  const halo = equip('halo'), at = orbitPosition(run, halo);
  run.enemies = [1, 2].map(id => ({ id, kind: 'crawler', ...at, health: enemies.crawler.maxHealth, entryDelay: 0 }));
  advanceHalo(run, halo, 0);
  assert.equal(takeEvents(run).filter(e => e.type === 'halo').length, 1);
  advanceHalo(run, halo, 0);
  assert.equal(takeEvents(run).filter(e => e.type === 'halo').length, 0);
  run.enemies = []; run.loadout = []; run.elapsed = run.round.eliteAt - 1 / 60;
  stepRun(run, { x: 0, y: 0 }, 1 / 60);
  assert.equal(takeEvents(run).filter(e => e.type === 'elite').length, 1);
  stepRun(run, { x: 0, y: 0 }, 1 / 60);
  assert.equal(takeEvents(run).filter(e => e.type === 'elite').length, 0);
});
