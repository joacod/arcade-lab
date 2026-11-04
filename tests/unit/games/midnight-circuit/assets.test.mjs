import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { signalRain, validateCircuitArt } from '../../../../src/games/midnight-circuit/asset-art.ts';

test('Signal / Rain images match the validated layout, including every complete fighter cel', () => {
  const dimensions = Object.fromEntries(Object.keys(signalRain).map(name => {
    if (name === 'fighters') {
      const png = readFileSync(new URL('../../../../src/games/midnight-circuit/art/fighters/fighters.png', import.meta.url));
      return [name,{width:png.readUInt32BE(16),height:png.readUInt32BE(20)}];
    }
    const svg = readFileSync(new URL(`../../../../src/games/midnight-circuit/art/signal-rain/${name}.svg`, import.meta.url), 'utf8');
    const root = svg.match(/<svg[^>]+width="(\d+)"[^>]+height="(\d+)"/);
    assert.ok(root, name);
    assert.doesNotMatch(svg, /(?:href|src)="(?:https?:|\/\/)/);
    return [name, { width: Number(root[1]), height: Number(root[2]) }];
  }));
  assert.deepEqual(validateCircuitArt(dimensions), []);
  for (const name of Object.keys(dimensions)) {
    const missing = { ...dimensions }; delete missing[name];
    assert.equal(validateCircuitArt(missing).length, 1);
    assert.equal(validateCircuitArt({ ...dimensions, [name]: { width: 1, height: 1 } }).length, 1);
  }
});
