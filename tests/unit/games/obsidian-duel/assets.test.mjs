import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { foundryFrame, foundryClips, foundrySheets, validateFoundryArt } from '../../../../src/games/obsidian-duel/asset-art.ts';
import { duelClips } from '../../../../src/games/obsidian-duel/animation.ts';

function webpSize(image) {
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  if (image.toString('ascii', 12, 16) === 'VP8X') return { width: image.readUIntLE(24, 3) + 1, height: image.readUIntLE(27, 3) + 1 };
  assert.equal(image.toString('ascii', 12, 16), 'VP8 ');
  return { width: image.readUInt16LE(26) & 0x3fff, height: image.readUInt16LE(28) & 0x3fff };
}

test('Eclipse Foundry committed artwork covers every whole-body cel and rejects incomplete bundles', () => {
  const dimensions = Object.fromEntries(Object.keys(foundrySheets).map(name => {
    if (name === 'nera' || name === 'kael') {
      const png = readFileSync(new URL(`../../../../src/games/obsidian-duel/art/eclipse-foundry/${name}.png`, import.meta.url));
      assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png[25], 6, 'RGBA keeps transparent sprite silhouettes');
      return [name, { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }];
    }
    if (name === 'stage') return [name, webpSize(readFileSync(new URL('../../../../src/games/obsidian-duel/art/eclipse-foundry/stage.webp', import.meta.url)))];
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
    if (clip === 'idle' || clip === 'walk') continue; // Dedicated sources own these clips.
    assert.equal(layout.clips[kind][clip].length, count);
    for (const [sheet, index] of layout.clips[kind][clip]) assert.ok(layout.sources[`${kind}-${sheet}`].frames[index], `${kind} ${clip} has a painted source`);
  }
});

test('Moonfall Sanctum ships its own detailed fighter and eight-effect atlases', async () => {
  const { sanctumSheets, sanctumEffects, validateSanctumArt } = await import('../../../../src/games/obsidian-duel/deluxe-art.ts');
  const stage = readFileSync(new URL('../../../../src/games/obsidian-duel/art/moonfall-sanctum/stage.webp', import.meta.url));
  const dimensions = { stage: webpSize(stage) };
  for (const name of ['nera', 'kael', 'effects']) {
    const folder = 'moonfall-sanctum';
    const png = readFileSync(new URL(`../../../../src/games/obsidian-duel/art/${folder}/${name}.png`, import.meta.url));
    assert.equal(png[25], 6, 'Preserve transparent silhouettes and glows');
    dimensions[name] = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  }
  assert.deepEqual(validateSanctumArt(dimensions), []);
  for (const name of Object.keys(sanctumSheets)) {
    const missing = { ...dimensions }; delete missing[name];
    assert.equal(validateSanctumArt(missing).length, 1);
    assert.equal(validateSanctumArt({ ...dimensions, [name]: { width: 1, height: 1 } }).length, 1);
  }
  for (const frame of sanctumEffects) {
    assert.ok(frame.x >= 0 && frame.y >= 0 && frame.x + 384 <= dimensions.effects.width && frame.y + 384 <= dimensions.effects.height);
    assert.ok(frame.pivotX > 0 && frame.pivotX < 384 && frame.pivotY > 0 && frame.pivotY < 384, 'Contact anchors remain inside authored cels');
  }
});


test('Arcade and Deluxe own distinct complete artwork with valid semantic coverage', async () => {
  for (const kind of ['nera', 'kael']) {
    const images = ['eclipse-foundry', 'moonfall-sanctum'].map(folder =>
      readFileSync(new URL(`../../../../src/games/obsidian-duel/art/${folder}/${kind}.png`, import.meta.url)));
    for (let i = 0; i < images.length; i++) for (let j = i + 1; j < images.length; j++) assert.ok(!images[i].equals(images[j]), 'Each mode requires independent actor artwork');
    for (const folder of ['eclipse-foundry/painted', 'moonfall-sanctum/fighters']) for (const family of ['motion', 'walk', 'combat']) {
      const base = new URL(`../../../../src/games/obsidian-duel/art/${folder}/${kind}-${family}`, import.meta.url);
      const layout = JSON.parse(readFileSync(new URL(`${base.href}-layout.json`)));
      const png = readFileSync(new URL(`${base.href}.png`));
      assert.equal(png[25], 6, 'Authored cels retain transparency');
      assert.deepEqual(layout.size, [png.readUInt32BE(16), png.readUInt32BE(20)]);
      for (const { rect: [x, y, w, h] } of layout.frames) assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= layout.size[0] && y + h <= layout.size[1]);
      for (const [clip, slots] of Object.entries(layout.selections)) for (const [slot, index] of Object.entries(slots)) {
        assert.ok(Number(slot) >= 0 && Number(slot) < duelClips[clip] && layout.frames[index], `${kind} ${clip}:${slot} has a complete source drawing`);
      }
      const loop = family === 'motion' ? 'idle' : family === 'walk' ? 'walk' : null;
      if (loop) {
        assert.equal(layout.selections[loop].length, duelClips[loop], 'The whole authored loop is packed');
        assert.equal(new Set(layout.selections[loop]).size, duelClips[loop], 'Loop slots cannot repeat a partial sequence');
      }
    }
  }
  for (const folder of ['moonfall-sanctum']) {
    const layout = JSON.parse(readFileSync(new URL(`../../../../src/games/obsidian-duel/art/${folder}/layout.json`, import.meta.url)));
    const dimensions = {};
    for (const kind of ['nera', 'kael']) {
      const png = readFileSync(new URL(`../../../../src/games/obsidian-duel/art/${folder}/${kind}.png`, import.meta.url));
      assert.equal(png[25], 6);
      dimensions[kind] = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
      const source = layout.fighters[kind];
      assert.equal(source.frames.length, 36);
      for (const { rect: [x, y, w, h], pivot: [px, py] } of source.frames) {
        assert.ok(w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= source.size[0] && y + h <= source.size[1]);
        assert.ok(px >= x && px <= x + w && py >= y && py <= y + h);
      }
    }
    for (const [clip, count] of Object.entries(duelClips)) {
      if (clip === 'idle' || clip === 'walk') continue;
      assert.equal(layout.clips[clip].length, count);
      for (const index of layout.clips[clip]) assert.ok(index >= 0 && index < 36);
      if (['light', 'heavy', 'sweep', 'air', 'special'].includes(clip)) {
        assert.notEqual(layout.clips[clip][2], layout.clips[clip][3], 'Anticipation and contact require distinct drawings');
        assert.notEqual(layout.clips[clip][4], layout.clips[clip][5], 'Recovery retracts the contact drawing');
      }
    }
  }
});
