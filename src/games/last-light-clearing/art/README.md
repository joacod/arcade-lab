# Artwork and visual definitions

`cover.svg` is original Arcade Lab vector artwork under the repository's MIT license. Normal draws actors, ground marks, gems and spell effects procedurally without image assets.

**Ember Ruins** uses the original CC0 0x72 DungeonTileset II v1.7, downloaded from its official source. The unmodified atlas, supplied frame list, author README, and [provenance](ember-ruins/PROVENANCE.md) live together. All runtime images are local.

## Add an art pack or replace one role

`src/games/last-light-clearing/art-pack.ts` defines `ArtPack`, `ActorArt`, `Clip`, and `Decoration`. `src/games/last-light-clearing/themes.ts` owns the mode definitions: image bundle, semantic Keeper/crawler/elite actors, environment, effect palette, and default interface. Replace the Assets definition there after inspecting source files and license terms; keep the same mode selector.

- Give each local image a stable key in `images`, using `new URL('./art/file.png', import.meta.url).href`.
- Define explicit `[x, y, width, height]` frame rectangles with `still()` or `frame()`. `row()` is a small helper for an inspected regular row with known frame count and stride.
- Supply `idle` and `move` clips with positive frame durations in active seconds and a looping policy. Optional `hit` and `attack` clips are cosmetic event reactions. Omit clips the artwork does not provide.
- Set a normalized `[x, y]` anchor and a world-space frame `footprint`. Transparent padding is included in that footprint. Changing source dimensions never implicitly changes the draw size.
- Choose `rotate`, `mirror`, or an explicit four-direction idle/move map only where supplied art supports it. Set `nearest` or `smooth` sampling for the pack.
- Environment ground stamps tile an open arena, optionally blended over the floor color. Border stamps and substantial perimeter props are placed completely outside it. Flat ground variation must read as decoration.

To replace only the Keeper, copy the Assets mode's art definition, add its image key, and replace `art.actors.keeper`. Leave crawler, elite, environment, and palette unchanged. The renderer uses these roles rather than external filenames. Reuse other image keys if several actors share an atlas.

`footprint`, `anchor`, clip timing, sampling, decoration sizes, palettes, interface settings, and view zoom are visual values. Physical radii, health, speeds, attack cadence, ranges, damage, spawn timing, progression, and round rules remain in `src/games/last-light-clearing/content.ts` and the simulation modules. An actor's visual extent may exceed its physical body.

The loader checks all referenced frames against decoded image dimensions and validates pivots, footprints, and timing before applying a bundle. A pending selection leaves the current appearance visible. A failed replacement retains it and reports a short notice. Initial failure uses silhouettes. New selections and disposal invalidate late callbacks and release owned image sources.

## Interface styling

Each mode chooses its matching interface in `themes.ts`; `style.css` defines its `[data-skin]` custom properties. Classic accompanies Normal, Rune accompanies Assets, and Glass accompanies Quality. Keep the shared menu and native controls consistent. Independent interface and accent selectors are intentionally absent.

## Local Mosslight asset pack

The source is [Free Island Adventure Pixel Top-Down Minigame Kit](https://craftpix.net/freebies/free-island-adventure-pixel-top-down-minigame-kit/) by CraftPix. Archive: `craftpix-net-351300-free-island-adventure-pixel-top-down-minigame-kit.zip`, SHA-256 `0b436bf4193dd116bb1b16c084f4df5bcaa4d284d33655e49b98e8fffeb3d59b`.

The [CraftPix license](https://craftpix.net/file-licenses/) permits use in games but restricts redistribution of usable artwork. Raw redistribution permission for this repository has not been confirmed. Images and the local activation manifest stay in ignored `local-art/`, outside the public source and production bundle. Do not copy the archive, images, or PSD files into `src/games/last-light-clearing/art/` or `public/`.

The shareable, inspected definition is `src/games/last-light-clearing/art/mosslight.ts`. It maps Character_1 to Keeper, Character_7 to crawler, and Character_8 to elite. Their Idle.png and Walk.png are each 128×32, containing four 32×32 sideways frames with horizontal mirroring. The terrain atlas is 624×500. The supplied 160×96 fire sheet contains a five-frame 32×32 campfire row at y=64. Timing and footprints are authored. No attack/hurt/death clips or additional directions are claimed.

To reproduce locally:

1. Download that exact pack through CraftPix and extract it outside the public asset tree.
2. Create `local-art/mosslight/`. Copy `Tileset/Tiled.png` as `terrain.png` and `Tiled/Tiled_animation_32px.png` as `fire.png`. For characters 1, 7, and 8, copy `Idle.png` as `actor-N-idle.png` and `Walk.png` as `actor-N-walk.png`.
3. Create `local-art/appearances.ts`:

```ts
import { createMosslight } from '../src/games/last-light-clearing/art/mosslight.ts';
export default { mosslight: createMosslight({
  terrain: new URL('./mosslight/terrain.png', import.meta.url).href,
  fire: new URL('./mosslight/fire.png', import.meta.url).href,
  idle1: new URL('./mosslight/actor-1-idle.png', import.meta.url).href,
  move1: new URL('./mosslight/actor-1-walk.png', import.meta.url).href,
  idle7: new URL('./mosslight/actor-7-idle.png', import.meta.url).href,
  move7: new URL('./mosslight/actor-7-walk.png', import.meta.url).href,
  idle8: new URL('./mosslight/actor-8-idle.png', import.meta.url).href,
  move8: new URL('./mosslight/actor-8-walk.png', import.meta.url).href,
}) };
```

4. Restart `pnpm dev`. `vite.config.ts` substitutes this local manifest only during development when it exists. With no manifest, Assets uses bundled Ember Ruins. Production builds always use the empty `src/games/last-light-clearing/local-appearances.ts`, including on a machine with local artwork installed. Production uses Ember Ruins for Assets. Mosslight replaces the same Assets slot locally; it never adds an option.

This is a local typed-definition workflow. There is no runtime store connection, downloader, ZIP parser, upload editor, or asset auto-detection.

## Renderers

Assets uses Canvas and the inspected pack's animation, pivots and footprints. Quality uses Prism Garden's procedural 3D actors and needs no image bundle. Both consume the same run through the local presentation contract. Art sizes remain cosmetic.
