import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAfterglowArt, afterglowPlates, afterglowSkyline } from '../../../../src/games/midnight-circuit/quality-art.ts';
import { validateCircuitSprites } from '../../../../src/games/midnight-circuit/sprite-art.ts';
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

test('Street sketch ships separate complete cels and a complete repair image', () => {
  const dimensions = Object.fromEntries(['fighters', 'repair'].map(name => {
    const svg = readFileSync(new URL(`../../../../src/games/midnight-circuit/art/normal/${name}.svg`, import.meta.url), 'utf8');
    const root = svg.match(/<svg[^>]+width="(\d+)"[^>]+height="(\d+)"/);
    assert.ok(root, name);
    assert.doesNotMatch(svg, /(?:href|src)="(?:https?:|\/\/)/);
    return [name, { width: Number(root[1]), height: Number(root[2]) }];
  }));
  assert.deepEqual(validateCircuitSprites(dimensions), []);
  assert.equal(validateCircuitSprites({ fighters: dimensions.fighters }).length, 1);
  assert.equal(validateCircuitSprites({ ...dimensions, fighters: { width: 1, height: 1 } }).length, 1);
});

test('Afterglow validates committed plates and rejects missing or mismatched candidates', () => {
  const dimensions = { fighters: signalRain.fighters, repair: { width: 64, height: 64 } };
  for (const [name, plate] of Object.entries({ skyline: afterglowSkyline, ...afterglowPlates })) {
    const webp = readFileSync(new URL(`../../../../src/games/midnight-circuit/art/afterglow/${name}.webp`, import.meta.url));
    assert.equal(webp.toString('ascii', 0, 4), 'RIFF');
    assert.equal(webp.toString('ascii', 8, 16), 'WEBPVP8 ');
    assert.deepEqual([...webp.subarray(23, 26)], [0x9d, 0x01, 0x2a]);
    dimensions[name] = { width: webp.readUInt16LE(26) & 0x3fff, height: webp.readUInt16LE(28) & 0x3fff };
    if ('curb' in plate) assert.ok(plate.curb > 0 && plate.curb < dimensions[name].height);
  }
  assert.deepEqual(validateAfterglowArt(dimensions), []);
  for (const name of Object.keys(dimensions)) {
    const missing = { ...dimensions }; delete missing[name];
    assert.equal(validateAfterglowArt(missing).length, 1);
    assert.equal(validateAfterglowArt({ ...dimensions, [name]: { width: 1, height: 1 } }).length, 1);
  }
});
