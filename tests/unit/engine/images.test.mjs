import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageResource } from '../../../src/engine/browser/images.ts';

test('initial image resources release loaded and pending sources without late activation', async () => {
  const images=[];
  class ImageStub {
    naturalWidth=64;naturalHeight=64;
    constructor(){images.push(this);}
    removeAttribute(){this.released=true;}
  }
  const original=globalThis.Image;globalThis.Image=ImageStub;
  const validate=d=>d.actor?.width===64&&d.actor.height===64?[]:['Invalid actor'];
  try {
    const active=createImageResource({actor:'actor.svg'},validate);
    assert.deepEqual(active.images,{});
    images[0].onload();await active.ready;
    assert.equal(active.images.actor,images[0]);
    active.dispose();active.dispose();
    assert.equal(images[0].released,true);assert.deepEqual(active.images,{});
    const pending=createImageResource({actor:'delayed.svg'},validate),late=images[1].onload;
    pending.dispose();late();await assert.rejects(pending.ready,/cancelled/);
    assert.deepEqual(pending.images,{});assert.equal(images[1].released,true);
    const invalid=createImageResource({actor:'invalid.svg'},validate);
    images[2].naturalWidth=1;images[2].onload();await assert.rejects(invalid.ready,/Invalid actor/);
    assert.deepEqual(invalid.images,{});assert.equal(images[2].released,true);
    const retry = invalid.prepare();
    assert.equal(invalid.prepare(), retry);
    images[3].onload(); await retry;
    assert.equal(invalid.images.actor, images[3]);
    invalid.dispose(); assert.equal(images[3].released, true);
  }finally{globalThis.Image=original;}
});
