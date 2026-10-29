import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auroraFleet } from '../../../../src/games/skybreak/art/aurora-fleet.ts';
import { themes } from '../../../../src/games/skybreak/themes.ts';
import { validateFlightArt, flightFrame } from '../../../../src/games/skybreak/art-pack.ts';

const art = auroraFleet.art;
const dimensions = Object.fromEntries(Object.entries(art.images).map(([key, url]) => {
  const sheet = readFileSync(new URL(url), 'utf8');
  const [, width, height] = sheet.match(/<svg[^>]* width="(\d+)" height="(\d+)"/);
  return [key, { width: Number(width), height: Number(height) }];
}));

test('the official Assets fleet resolves committed sheets for every actor and the flagship', () => {
  assert.equal(themes.assets, auroraFleet);
  assert.deepEqual(validateFlightArt(art, dimensions), []);
  assert.equal(new Set(Object.values(art.actors).map(sprite => sprite.image)).size, 5);
  assert.ok(art.flagship);
  for (const sprite of [...Object.values(art.actors), art.flagship]) {
    assert.equal(sprite.rotation, 0); // Sheets face north; the renderer turns hostile ships south.
    assert.equal(dimensions[sprite.image].width, sprite.stride * sprite.frames);
  }
});

test('fleet animation loops, freezes for reduced motion, and rejects invalid sheets or timing', () => {
  const sprite = art.actors.player;
  assert.equal(flightFrame(sprite, 0, false), 0);
  assert.equal(flightFrame(sprite, 0.1, false), 64);
  assert.equal(flightFrame(sprite, 0.55, false), 0);
  assert.equal(flightFrame(sprite, 5, true), 0);
  assert.ok(validateFlightArt(art, { ...dimensions, fighter: { width: 64, height: 80 } }).length > 0);
  assert.ok(validateFlightArt({ ...art, actors: { ...art.actors, player: { ...sprite, seconds: 0 } } }, dimensions).length > 0);
});
