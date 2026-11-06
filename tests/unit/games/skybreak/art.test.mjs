import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { themes } from '../../../../src/games/skybreak/themes.ts';
import { validateFlightArt } from '../../../../src/games/skybreak/art-pack.ts';
import { flightImages, validateFlightImages } from '../../../../src/games/skybreak/assets.ts';
import { coastalTiles } from '../../../../src/games/skybreak/scenery.ts';

function dimensionsFor(theme) {
 return Object.fromEntries(Object.entries(flightImages(theme)).map(([key,url]) => {
  const file=readFileSync(new URL(url));
  if (url.endsWith('.png')) return [key,{width:file.readUInt32BE(16),height:file.readUInt32BE(20)}];
  if (url.endsWith('.webp')) {
   if (file.toString('ascii',12,16)==='VP8X') return [key,{width:file.readUIntLE(24,3)+1,height:file.readUIntLE(27,3)+1}];
   assert.equal(file.toString('ascii',12,16),'VP8 ');
   return [key,{width:file.readUInt16LE(26)&0x3fff,height:file.readUInt16LE(28)&0x3fff}];
  }
  const [,width,height]=file.toString().match(/<svg[^>]* width="(\d+)" height="(\d+)"/);
  return [key,{width:Number(width),height:Number(height)}];
 }));
}

test('each fleet resolves its committed actor, flagship, supply and scenery artwork', () => {
 for(const [mode,theme] of Object.entries(themes)) {
  const dimensions=dimensionsFor(theme);
  assert.deepEqual(validateFlightImages(theme,dimensions),[]);
  assert.equal(Object.keys(theme.art.actors).length,5);
  assert.ok(theme.art.flagship);
  assert.equal(Object.keys(theme.art.objects).length,6);
  const roles=[...Object.values(theme.art.actors),theme.art.flagship,...Object.values(theme.art.objects)];
  assert.equal(new Set(roles.map(s=>s.image+'/'+s.rect.join(','))).size,12);
  assert.ok(validateFlightImages(theme,{...dimensions,backdrop:{width:1,height:1}}).length);
  assert.ok(validateFlightArt(theme.art,{...dimensions,fleet:{width:4,height:3}}).length);
 }
 assert.notEqual(themes.arcade.art.images.fleet,themes.deluxe.art.images.fleet);
 assert.equal(themes.deluxe.art.actors.player.rect[2],256);
 assert.equal(themes.arcade.art.actors.player.rect[2],96);
});

test('coastal travel covers the viewport across wrap boundaries and keeps one world speed', () => {
 for(const theme of [themes.arcade,themes.deluxe]) {
  const {speed,overlap,width,height}=theme.scenery,h=480*height/width,stride=h-overlap;
  for(const time of [0,(stride-.01)/speed,stride/speed,(stride+.01)/speed,168]) {
   const tiles=coastalTiles(time,speed,h,overlap);
   assert.ok(tiles[0]<=0); assert.ok(tiles.at(-1)+h>=800);
   for(let i=1;i<tiles.length;i++) assert.ok(Math.abs(tiles[i]-tiles[i-1]-stride)<1e-9);
  }
  assert.ok(Math.abs(coastalTiles(1,speed,h,overlap)[0]-coastalTiles(0,speed,h,overlap)[0]-96)<1e-9);
 }
});
