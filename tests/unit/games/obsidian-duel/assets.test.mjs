import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { foundryParts, foundrySheets, validateFoundryArt } from '../../../../src/games/obsidian-duel/asset-art.ts';

test('Eclipse Foundry committed artwork covers its articulated parts and rejects incomplete bundles', () => {
  const dimensions = Object.fromEntries(Object.keys(foundrySheets).map(name => {
    const svg = readFileSync(new URL(`../../../../src/games/obsidian-duel/art/eclipse-foundry/${name}.svg`, import.meta.url), 'utf8');
    const root = svg.match(/<svg[^>]+width="(\d+)"[^>]+height="(\d+)"/);
    assert.ok(root, name);
    assert.doesNotMatch(svg, /(?:href|src)="(?:https?:|\/\/)/);
    return [name, { width: Number(root[1]), height: Number(root[2]) }];
  }));
  assert.deepEqual(validateFoundryArt(dimensions), []);
  for (const name of Object.keys(dimensions)) {
    const missing = { ...dimensions }; delete missing[name];
    assert.equal(validateFoundryArt(missing).length, 1);
    assert.equal(validateFoundryArt({ ...dimensions, [name]: { width: 1, height: 1 } }).length, 1);
  }
  for (const column of Object.values(foundryParts)) {
    assert.ok(column >= 0 && (column + 1) * 128 <= dimensions.nera.width);
    assert.ok((column + 1) * 128 <= dimensions.kael.width);
  }
});
