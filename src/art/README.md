# Artwork and visual definitions

`woodland.svg` and `moonglass.svg` are original Arcade Lab vector drawings under the repository's MIT license. Each contains three static actor frames, with different image dimensions and padding but identical authored world footprints (32/32/48). Ground marks, fallback silhouettes, gems, spell effects, and procedural sound are original application code.

**Ember Ruins** uses the original CC0 0x72 DungeonTileset II v1.7, downloaded from its official source. The unmodified atlas, supplied frame list, author README, and [provenance](ember-ruins/PROVENANCE.md) live together. All runtime images are local.

## Add an art pack or replace one role

`src/art-pack.ts` defines `ArtPack`, `ActorArt`, `Clip`, and `Decoration`. `src/themes.ts` holds the named visual presets: image bundle, semantic Keeper/crawler/elite actors, environment, effect palette, and default interface. Add a preset there after inspecting its source files and license.

- Give each local image a stable key in `images`, using `new URL('./art/file.png', import.meta.url).href`.
- Define explicit `[x, y, width, height]` frame rectangles with `still()` or `frame()`. `row()` is a small helper for an inspected regular row with known frame count and stride.
- Supply `idle` and `move` clips with positive frame durations in active seconds and a looping policy. Optional `hit` and `attack` clips are cosmetic event reactions. Omit clips the artwork does not provide.
- Set a normalized `[x, y]` anchor and a world-space frame `footprint`. Transparent padding is included in that footprint. Changing source dimensions never implicitly changes the draw size.
- Choose `rotate`, `mirror`, or an explicit four-direction idle/move map only where supplied art supports it. Set `nearest` or `smooth` sampling for the pack.
- Environment ground stamps tile an open arena, optionally blended over the floor color. Border stamps and substantial perimeter props are placed completely outside it. Flat ground variation must read as decoration.

To replace only the Keeper, copy a preset's art definition, add its image key, and replace `art.actors.keeper`. Leave crawler, elite, environment, and palette unchanged. The renderer uses these roles rather than external filenames. Reuse other image keys if several actors share an atlas.

`footprint`, `anchor`, clip timing, sampling, decoration sizes, palettes, interface settings, and view zoom are visual values. Physical radii, health, speeds, attack cadence, ranges, damage, spawn timing, progression, and round rules remain in `src/content.ts` and the simulation modules. An actor's visual extent may exceed its physical body.

The loader checks all referenced frames against decoded image dimensions and validates pivots, footprints, and timing before applying a bundle. A pending selection leaves the current appearance visible. A failed replacement retains it and reports a short notice. Initial failure uses silhouettes. New selections and disposal invalidate late callbacks and release owned image sources.

## Add an interface skin

Register a label in `src/interface.ts`, then define its `[data-skin='name']` custom properties in `src/style.css`: background, surface, panel, veil, button/hover, text/muted, accent/on-accent, danger, border, health/XP, font/heading font, radius, and shadow. Reserve focused classes/selectors for actual layout differences. Keep the existing HTML controls, focus, intents, and state bindings in `src/ui.ts`.

Classic retains the original interface treatment. Rune uses warm frames, square borders, monospace typography, and coral/gold health/XP. Glass uses translucent cool panels, fine borders, and a compact HUD. “Match appearance” follows the successfully loaded preset's default. Explicit interface and accent choices survive artwork changes, retries, and title transitions within a session.

## Optional local Mosslight appearance

The inspected source is [Free Island Adventure Pixel Top-Down Minigame Kit](https://craftpix.net/freebies/free-island-adventure-pixel-top-down-minigame-kit/) by CraftPix, downloaded through the signed-in browser on 2026-10-27. Archive: `craftpix-net-351300-free-island-adventure-pixel-top-down-minigame-kit.zip`, SHA-256 `0b436bf4193dd116bb1b16c084f4df5bcaa4d284d33655e49b98e8fffeb3d59b`.

The [CraftPix license](https://craftpix.net/file-licenses/) permits use in games but restricts redistribution of usable artwork. Raw redistribution permission for this repository has not been confirmed. Images and the local activation manifest stay in ignored `local-art/`, outside the public source and production bundle. Do not copy the archive, images, or PSD files into `src/art/` or `public/`.

The shareable, inspected definition is `src/art/mosslight.ts`. It maps Character_1 to Keeper, Character_7 to crawler, and Character_8 to elite. Their Idle.png and Walk.png are each 128×32, containing four 32×32 sideways frames with horizontal mirroring. The terrain atlas is 624×500. The supplied 160×96 fire sheet contains a five-frame 32×32 campfire row at y=64. Timing and footprints are authored. No attack/hurt/death clips or additional directions are claimed.

To reproduce locally:

1. Download that exact pack through CraftPix and extract it outside the public asset tree.
2. Create `local-art/mosslight/`. Copy `Tileset/Tiled.png` as `terrain.png` and `Tiled/Tiled_animation_32px.png` as `fire.png`. For characters 1, 7, and 8, copy `Idle.png` as `actor-N-idle.png` and `Walk.png` as `actor-N-walk.png`.
3. Create `local-art/appearances.ts`:

```ts
import { createMosslight } from '../src/art/mosslight.ts';
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

4. Restart `pnpm dev`. `vite.config.ts` substitutes this local manifest only during development when it exists. With no manifest, Mosslight is absent from the menu. Production builds always use the empty `src/local-appearances.ts`, including on a machine with local artwork installed. Previewing a production build therefore offers Lanternwood, Moonglass, and Ember Ruins.

This is a local typed-definition workflow. There is no runtime store connection, downloader, ZIP parser, upload editor, or asset auto-detection.

## Renderer reuse

Ember Conservatory consumes the same `emberRuins.art` manifest as Ember Ruins. The garden implementation uploads its decoded sheet once, shares nearest-filtered atlas materials, and updates each actor slot's UVs independently. Both renderers use `actorAnimation`/`clipFrame`, the authored pivots, footprints and orientation. Prism Garden has procedural actors and needs no image bundle. Art sizes remain cosmetic in both presentations.
