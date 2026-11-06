import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAfterglowArt, afterglowPlates, afterglowSkyline } from '../../../../src/games/midnight-circuit/deluxe-art.ts';
import { arcadeFighterAtlas, deluxeFighterAtlas } from '../../../../src/games/midnight-circuit/sprite-art.ts';
import { signalRain, validateCircuitArt } from '../../../../src/games/midnight-circuit/asset-art.ts';

function webpSize(image) {
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  if (image.toString('ascii', 12, 16) === 'VP8X') return { width: image.readUIntLE(24, 3) + 1, height: image.readUIntLE(27, 3) + 1 };
  assert.equal(image.toString('ascii', 12, 16), 'VP8 ');
  assert.deepEqual([...image.subarray(23, 26)], [0x9d, 0x01, 0x2a]);
  return { width: image.readUInt16LE(26) & 0x3fff, height: image.readUInt16LE(28) & 0x3fff };
}

test('Signal / Rain images match the validated layout, including every complete fighter cel', () => {
  const dimensions = Object.fromEntries(Object.keys(signalRain).map(name => {
    if (name === 'fighters') {
      const png = readFileSync(new URL('../../../../src/games/midnight-circuit/art/fighters/animated.webp', import.meta.url));
      return [name, webpSize(png)];
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

test('Afterglow validates committed plates and rejects missing or mismatched candidates', () => {
  const atlas = readFileSync(new URL('../../../../src/games/midnight-circuit/art/afterglow/fighters/fighters.webp', import.meta.url));
  const dimensions = { fighters: webpSize(atlas), repair: { width: 64, height: 64 } };
  for (const [name, plate] of Object.entries({ skyline: afterglowSkyline, ...afterglowPlates })) {
    const webp = readFileSync(new URL(`../../../../src/games/midnight-circuit/art/afterglow/${name}.webp`, import.meta.url));
    dimensions[name] = webpSize(webp);
    if (name === 'station') assert.ok(webp[20] & 0x10, 'station roof exposes the distant skyline through alpha');
    if ('curb' in plate) assert.ok(plate.curb > 0 && plate.curb < dimensions[name].height);
  }
  assert.deepEqual(validateAfterglowArt(dimensions), []);
  for (const name of Object.keys(dimensions)) {
    const missing = { ...dimensions }; delete missing[name];
    assert.equal(validateAfterglowArt(missing).length, 1);
    assert.equal(validateAfterglowArt({ ...dimensions, [name]: { width: 1, height: 1 } }).length, 1);
  }
});

// Playback distance is derived from the accepted art, rather than an unrelated speed constant.
test('painted strides match the registered near boot from the forward contact to the opposite contact', () => {
  const layout=JSON.parse(readFileSync(new URL('../../../../src/games/midnight-circuit/art/fighters/walking/layout.json',import.meta.url),'utf8'));
  const roles=['player','striker','bruiser','warden'];
  for(const [row,role] of layout.entries())for(const [mode,atlas] of [arcadeFighterAtlas,deluxeFighterAtlas].entries()){
    const clip=role.modes[mode],size=row===3?1.48:row===2?1.2:1;
    const sweep=clip.nearBootContacts[0]-clip.nearBootContacts[1];
    assert.ok(sweep>0);
    assert.ok(Math.abs(atlas.strides[roles[row]]-2*sweep*clip.scale*atlas.drawSize/atlas.cell*size)<.001);
    assert.deepEqual(clip.rects.map(cel=>cel.support),['near','near','near','near','far','far','far','far']);
    for(const cel of clip.rects){
      const [x,y,w,h]=cel.destination;
      assert.ok(x>=0&&y>=0&&x+w<=atlas.cell&&y+h<=atlas.cell);
    }
  }
});
