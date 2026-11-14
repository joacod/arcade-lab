import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe } from 'audiobits';
import { blastRecipes } from '../../src/games/blastline/sound-recipes.ts';
import { duelRecipes } from '../../src/games/obsidian-duel/sound-recipes.ts';
import { circuitRecipes } from '../../src/games/midnight-circuit/sound-recipes.ts';
import { hollowRecipes } from '../../src/games/clockwork-hollow/sound-recipes.ts';
import { clearingRecipes } from '../../src/games/last-light-clearing/sound-recipes.ts';
import { skybreakRecipes } from '../../src/games/skybreak/sound-recipes.ts';
import { cloudwakeRecipes } from '../../src/games/cloudwake/sound-recipes.ts';
import { adventureRecipes } from '../../src/games/point-and-click-adventure/sound.ts';
import { duelCue } from '../../src/games/obsidian-duel/sound.ts';

test('authored AudioBits recipes validate against the installed runtime', () => {
  for (const [game, recipes] of Object.entries({ clearing: clearingRecipes, skybreak: skybreakRecipes, hollow: hollowRecipes, circuit: circuitRecipes, duel: duelRecipes, blastline: blastRecipes, cloudwake: cloudwakeRecipes, guest: adventureRecipes })) {
    for (const [cue, recipe] of Object.entries(recipes)) {
      const result = validateRecipe(recipe);
      assert.equal(result.ok, true, `${game}/${cue}: ${JSON.stringify(result.ok ? [] : result.issues)}`);
      assert.equal(validateRecipe(JSON.parse(JSON.stringify(recipe))).ok, true, `${game}/${cue} JSON round trip`);
      assert.equal(recipe.kind, 'one-shot');
      assert.ok(recipe.layers.length <= 3, `${game}/${cue} resource budget`);
    }
  }
});

test('Duel specials follow fighter identity when selection swaps the two sides', () => {
  for (const kinds of [['nera', 'kael'], ['kael', 'nera']]) {
    const fighters = kinds.map(kind => ({ kind }));
    for (const fighter of [0, 1]) {
      const event = { type: 'special', fighter, x: 500, z: 0, strength: 1 };
      assert.equal(duelCue(event, fighters), kinds[fighter] === 'nera' ? 'stormglass' : 'riftbreaker');
      assert.equal(duelCue({ ...event, type: 'block' }, fighters), 'block');
    }
  }
});
