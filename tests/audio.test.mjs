import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe } from 'audiobits';
import { blastRecipes } from '../src/run-gun/sound-recipes.ts';
import { duelRecipes } from '../src/fighter/sound-recipes.ts';
import { circuitRecipes } from '../src/brawler/sound-recipes.ts';
import { hollowRecipes } from '../src/platformer/sound-recipes.ts';
import { clearingRecipes } from '../src/sound-recipes.ts';
import { skybreakRecipes } from '../src/skybreak/sound-recipes.ts';
import { createRun, stepRun, takeEvents } from '../src/game.ts';
import { fireShard } from '../src/weapons/shard.ts';
import { fireSpark } from '../src/weapons/spark.ts';
import { advanceHalo, orbitPosition } from '../src/weapons/halo.ts';
import { equip } from '../src/progression.ts';
import { enemies } from '../src/content.ts';

test('authored AudioBits recipes and JSON round trips validate against the installed runtime', () => {
  for (const [game, recipes] of Object.entries({ clearing: clearingRecipes, skybreak: skybreakRecipes, hollow: hollowRecipes, circuit: circuitRecipes, duel: duelRecipes, blastline: blastRecipes })) {
    for (const [cue, recipe] of Object.entries(recipes)) {
      for (const input of [recipe, JSON.parse(JSON.stringify(recipe))]) {
        const result = validateRecipe(input);
        assert.equal(result.ok, true, `${game}/${cue}: ${JSON.stringify(result.ok ? [] : result.issues)}`);
      }
      assert.equal(recipe.kind, 'one-shot');
      assert.ok(recipe.layers.length <= 3, `${game}/${cue} resource budget`);
    }
  }
});

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
