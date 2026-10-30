import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { foundryFrame, foundryClips, foundrySheets, validateFoundryArt } from '../../../../src/games/obsidian-duel/asset-art.ts';
import { duelClips } from '../../../../src/games/obsidian-duel/animation.ts';

test('Eclipse Foundry committed artwork covers every whole-body cel and rejects incomplete bundles', () => {
  const dimensions = Object.fromEntries(Object.keys(foundrySheets).map(name => {
    if (name === 'nera' || name === 'kael') {
      const png = readFileSync(new URL(`../../../../src/games/obsidian-duel/art/eclipse-foundry/${name}.png`, import.meta.url));
      assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png[25], 6, 'RGBA keeps transparent sprite silhouettes');
      return [name, { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }];
    }
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
    for (const clip of foundryClips) for (let frame = 0; frame < duelClips[clip]; frame++) {
      const [x, y, w, h] = foundryFrame({ clip, frame });
      assert.ok(x >= 0 && y >= 0 && x + w <= dimensions[kind].width && y + h <= dimensions[kind].height);
    }
  }
  const layout = JSON.parse(readFileSync(new URL('../../../../src/games/obsidian-duel/art/eclipse-foundry/painted/layout.json', import.meta.url), 'utf8'));
  for (const [name, source] of Object.entries(layout.sources)) {
    const png = readFileSync(new URL(`../../../../src/games/obsidian-duel/art/eclipse-foundry/painted/${name}.png`, import.meta.url));
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], source.size);
    for (const { rect: [x, y, w, h] } of source.frames) assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= source.size[0] && y + h <= source.size[1], name);
  }
  for (const kind of ['nera', 'kael']) for (const [clip, count] of Object.entries(duelClips)) {
    assert.equal(layout.clips[kind][clip].length, count);
    for (const [sheet, index] of layout.clips[kind][clip]) assert.ok(layout.sources[`${kind}-${sheet}`].frames[index], `${kind} ${clip} has a painted source`);
  }
});
