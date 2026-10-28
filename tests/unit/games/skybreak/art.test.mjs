import test from 'node:test';
import assert from 'node:assert/strict';
import { createPixelFleet } from '../../../../src/games/skybreak/art/pixel-fleet.ts';
import { validateFlightArt, flightFrame } from '../../../../src/games/skybreak/art-pack.ts';

test('fleet sprites fit inspected sheets, retain distinct roles, and freeze animation for reduced motion', () => {
  const urls = Object.fromEntries(['fighter', 'bomber', 'corvette', 'scout', 'raider', 'gunship', 'interceptor'].map(key => [key, `${key}.png`]));
  const fleet = createPixelFleet(urls);
  const dimensions = Object.fromEntries(Object.keys(urls).map(key => [key, { width: ['fighter', 'bomber', 'corvette'].includes(key) ? 1152 : 128, height: ['fighter', 'bomber', 'corvette'].includes(key) ? 192 : 128 }]));
  for (const theme of Object.values(fleet)) assert.deepEqual(validateFlightArt(theme.art, dimensions), []);
  assert.notEqual(fleet.starfall.art.actors.player.image, fleet.redshift.art.actors.player.image);
  assert.equal(new Set(Object.values(fleet.starfall.art.actors).map(sprite => sprite.image)).size, 5);
  const sprite = fleet.starfall.art.actors.player;
  assert.equal(flightFrame(sprite, 0, false), 54);
  assert.equal(flightFrame(sprite, 0.1, false), 246);
  assert.equal(flightFrame(sprite, 0.55, false), 54);
  assert.equal(flightFrame(sprite, 5, true), 54);
  assert.ok(validateFlightArt(fleet.starfall.art, { ...dimensions, fighter: { width: 192, height: 192 } }).length > 0);
  assert.ok(validateFlightArt({ ...fleet.starfall.art, actors: { ...fleet.starfall.art.actors, player: { ...sprite, seconds: 0 } } }, dimensions).length > 0);
});
