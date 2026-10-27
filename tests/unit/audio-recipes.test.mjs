import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe } from 'audiobits';
import { blastRecipes } from '../../src/games/blastline/sound-recipes.ts';
import { duelRecipes } from '../../src/games/obsidian-duel/sound-recipes.ts';
import { circuitRecipes } from '../../src/games/midnight-circuit/sound-recipes.ts';
import { hollowRecipes } from '../../src/games/clockwork-hollow/sound-recipes.ts';
import { clearingRecipes } from '../../src/games/last-light-clearing/sound-recipes.ts';
import { skybreakRecipes } from '../../src/games/skybreak/sound-recipes.ts';

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
