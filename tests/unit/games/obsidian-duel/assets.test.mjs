import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { foundryFrame, foundryClips, foundrySheets, validateFoundryArt } from '../../../../src/games/obsidian-duel/asset-art.ts';
import { duelClips } from '../../../../src/games/obsidian-duel/animation.ts';

test('Eclipse Foundry committed artwork covers every whole-body cel and rejects incomplete bundles', () => {
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
  for (const kind of ['nera', 'kael']) {
    const svg = readFileSync(new URL(`../../../../src/games/obsidian-duel/art/eclipse-foundry/${kind}.svg`, import.meta.url), 'utf8');
    for (const clip of foundryClips) for (let frame = 0; frame < duelClips[clip]; frame++) {
      const [x, y, w, h] = foundryFrame({ clip, frame });
      assert.ok(x >= 0 && y >= 0 && x + w <= dimensions[kind].width && y + h <= dimensions[kind].height);
      assert.ok(svg.includes(`id="${clip}-${frame}"`), `${kind} ${clip} ${frame}`);
    }
  }
});
