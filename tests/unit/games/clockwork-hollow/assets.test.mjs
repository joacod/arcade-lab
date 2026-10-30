import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bellgardenSheets, objectFrames, validateBellgardenArt, keeperFrame } from '../../../../src/games/clockwork-hollow/asset-art.ts';

test('Bellgarden committed sheets cover every validated frame without external resources', () => {
  const dimensions = Object.fromEntries(Object.keys(bellgardenSheets).map(name => {
    const svg = readFileSync(new URL(`../../../../src/games/clockwork-hollow/art/bellgarden/${name}.svg`, import.meta.url), 'utf8');
    const root = svg.match(/<svg[^>]+width="(\d+)"[^>]+height="(\d+)"/);
    assert.ok(root, name);
    assert.doesNotMatch(svg, /(?:href|src)="(?:https?:|\/\/)/);
    return [name, { width: Number(root[1]), height: Number(root[2]) }];
  }));
  assert.deepEqual(validateBellgardenArt(dimensions), []);
  for (const [role, [x, y, w, h]] of Object.entries(objectFrames)) {
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0, role);
    assert.ok(x + w <= dimensions.objects.width && y + h <= dimensions.objects.height, role);
  }
  for (const name of Object.keys(dimensions)) {
    const missing = { ...dimensions }; delete missing[name];
    assert.equal(validateBellgardenArt(missing).length, 1);
    assert.equal(validateBellgardenArt({ ...dimensions, [name]: { width: 1, height: 1 } }).length, 1);
  }
});

test('keeper poses follow observed travel and airborne state, with a still reduced-motion stance', () => {
  const player = { grounded: true, vx: 300, vy: 0 };
  const pose = stride => ({ stride, bob: 0, lean: 0 });
  assert.deepEqual([-1, -.3, .3, 1].map(stride => keeperFrame(player, pose(stride), false, false)), [1, 2, 3, 4]);
  assert.equal(keeperFrame({ ...player, vx: 0 }, pose(1), false, false), 0);
  assert.equal(keeperFrame(player, pose(1), false, true), 0);
  assert.equal(keeperFrame({ ...player, grounded: false, vy: -20 }, pose(0), false, false), 5);
  assert.equal(keeperFrame({ ...player, grounded: false, vy: 20 }, pose(0), false, false), 6);
  assert.equal(keeperFrame(player, pose(0), true, false), 7);
});
