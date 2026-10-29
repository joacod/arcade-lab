import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { signalRain, validateCircuitArt } from '../../../../src/games/midnight-circuit/asset-art.ts';

test('Signal / Rain images match the validated layout, including every articulated fighter part', () => {
  const dimensions = Object.fromEntries(Object.keys(signalRain).map(name => {
    const svg = readFileSync(new URL(`../../../../src/games/midnight-circuit/art/signal-rain/${name}.svg`, import.meta.url), 'utf8');
    const root = svg.match(/<svg[^>]+width="(\d+)"[^>]+height="(\d+)"/);
    assert.ok(root, name);
    assert.doesNotMatch(svg, /(?:href|src)="(?:https?:|\/\/)/);
    return [name, { width: Number(root[1]), height: Number(root[2]) }];
  }));
  assert.deepEqual(validateCircuitArt(dimensions), []);
  const atlas = readFileSync(new URL('../../../../src/games/midnight-circuit/art/signal-rain/fighters.svg', import.meta.url), 'utf8');
  for (let row = 0; row < 4; row++) for (let part = 0; part < 8; part++) {
    assert.ok(atlas.includes(`translate(${part * 64} ${row * 64})`));
    assert.ok((part + 1) * 64 <= dimensions.fighters.width);
    assert.ok((row + 1) * 64 <= dimensions.fighters.height);
  }
  for (const name of Object.keys(dimensions)) {
    const missing = { ...dimensions }; delete missing[name];
    assert.equal(validateCircuitArt(missing).length, 1);
    assert.equal(validateCircuitArt({ ...dimensions, [name]: { width: 1, height: 1 } }).length, 1);
  }
});
