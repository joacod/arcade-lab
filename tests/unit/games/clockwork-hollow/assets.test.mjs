import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bellgardenSheets, objectFrames, validateBellgardenArt, validateHollowSprites, keeperFrame } from '../../../../src/games/clockwork-hollow/asset-art.ts';

test('Bellgarden committed sheets cover every validated frame without external resources', () => {
  const dimensions = Object.fromEntries(Object.keys(bellgardenSheets).map(name => {
    const svg = readFileSync(new URL(`../../../../src/games/clockwork-hollow/art/bellgarden/${name}.svg`, import.meta.url), 'utf8');
    const root = svg.match(/<svg[^>]+width="(\d+)"[^>]+height="(\d+)"/);
    assert.ok(root, name);
    assert.doesNotMatch(svg, /(?:href|src)="(?:https?:|\/\/)/);
    return [name, { width: Number(root[1]), height: Number(root[2]) }];
  }));
  assert.deepEqual(validateBellgardenArt(dimensions), []);
  for (const mode of ['normal', 'quality']) {
    const sprites = Object.fromEntries(['keeper', 'beetle', 'objects'].map(name => {
      const raster = mode === 'quality' && name !== 'objects';
      const file = raster ? `lumen/${name}.png` : `bellgarden/${name}-${mode}.svg`;
      const bytes = readFileSync(new URL(`../../../../src/games/clockwork-hollow/art/${file}`, import.meta.url));
      if (raster) {
        assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        assert.equal(bytes[25], 6, 'RGBA preserves transparent sprite gutters');
        return [name, { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }];
      }
      const svg = bytes.toString('utf8');
      const root = svg.match(/<svg[^>]+width="(\d+)"[^>]+height="(\d+)"/);
      assert.ok(root, `${mode} ${name}`);
      assert.doesNotMatch(svg, /(?:href|src)="(?:https?:|\/\/)/);
      return [name, { width: Number(root[1]), height: Number(root[2]) }];
    }));
    assert.deepEqual(validateHollowSprites(mode, sprites), [], mode);
    for (const name of ['keeper', 'beetle', 'objects']) {
      assert.equal(validateHollowSprites(mode, { ...sprites, [name]: { width: 1, height: 1 } }).length, 1);
    }
  }
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
  const pose = phase => ({ phase, lean: 0 });
  assert.deepEqual(Array.from({ length: 8 }, (_, i) => keeperFrame(player, pose((i + .5) * Math.PI / 4), false, false)), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(keeperFrame({ ...player, vx: 0 }, pose(1), false, false), 0);
  assert.equal(keeperFrame(player, pose(1), false, true), 0);
  assert.equal(keeperFrame({ ...player, grounded: false, vy: -20 }, pose(0), false, false), 9);
  assert.equal(keeperFrame({ ...player, grounded: false, vy: 20 }, pose(0), false, false), 10);
  assert.equal(keeperFrame(player, pose(0), true, false), 11);
});
