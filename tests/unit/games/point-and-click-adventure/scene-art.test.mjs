import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneArt } from '../../../../src/games/point-and-click-adventure/scene-art.ts';

// Protect native detail and prevent buffer creation/readbacks during movement.
// The palette and perceived quality are deliberately left to visual inspection.
test('room artwork prepares native sheets once and draws changing cels without allocations or pixel reads', () => {
  const originalDocument = globalThis.document;
  const buffers = [], drawn = [];
  globalThis.document = {
    createElement() {
      const canvas = { width: 0, height: 0, getContext: () => ({
        drawImage() {}, fillRect() {},
        getImageData() { assert.fail('Lighting must not read back image pixels'); },
      }) };
      buffers.push(canvas); return canvas;
    },
  };
  const images = Object.fromEntries(['cast', 'walk', 'props', 'equipment', 'service']
    .map(name => [name, { naturalWidth: 64, naturalHeight: 32 }]));
  const art = createSceneArt('deluxe', () => images);
  const context = { drawImage: source => drawn.push(source) };
  const draw = (x = 0, width = 3, spectral = false) => art.draw(context, 'props',
    { x, y: 0, w: 3, h: 1 }, x, 0, width, 1, spectral);
  try {
    art.enter('hall');
    const prepared = [...buffers];
    assert.equal(prepared.length, Object.keys(images).length);
    assert.ok(prepared.every(buffer => buffer.width === 64 && buffer.height === 32));
    draw(); draw(3, 12); draw(6, 24);
    assert.deepEqual(buffers, prepared);
    assert.equal(drawn[0], drawn[1]);
    draw(0, 3, true);
    assert.equal(drawn.at(-1), images.props);
    art.enter('hall'); draw();
    assert.deepEqual(buffers, prepared);
    art.enter('kitchen');
    assert.ok(prepared.every(buffer => buffer.width === 0 && buffer.height === 0));
    draw();
    assert.notEqual(drawn.at(-1), drawn[0]);
    art.dispose(); art.dispose();
    assert.ok(buffers.every(buffer => buffer.width === 0 && buffer.height === 0));
  } finally {
    art.dispose(); globalThis.document = originalDocument;
  }
});
