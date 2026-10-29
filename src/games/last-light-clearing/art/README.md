# Artwork and visual definitions

`cover.svg` is an editable vector illustration. Normal draws a hooded lantern Keeper, crawling silhouettes, ground marks, gems and spell effects procedurally without image assets. Briar chargers use the existing crawler treatment with a forked procedural crest; the persistent overlay carries that identity and locked attack warnings across every theme.

**Ember Ruins** uses 0x72 DungeonTileset II v1.7. The atlas, frame list, upstream README, and [source credit and license](ember-ruins/PROVENANCE.md) live together. All runtime images are committed and bundled for development and production.

## Add an art pack or replace one role

`src/games/last-light-clearing/art-pack.ts` defines `ArtPack`, `ActorArt`, `Clip`, and `Decoration`. `src/games/last-light-clearing/themes.ts` owns the mode definitions: image bundle, semantic Keeper/crawler/elite actors, environment, effect palette, and default interface. Replace the Assets definition there after inspecting its frames and animation layout; keep the same mode selector.

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

Each mode chooses its matching interface in `themes.ts`; `style.css` defines its `[data-skin]` custom properties. Classic accompanies Normal, Rune accompanies Assets, Glass accompanies Quality, and Abyss accompanies Custom. Keep the shared menu and native controls consistent. Independent interface and accent selectors are intentionally absent.

## Renderers

Assets uses Canvas and the inspected pack's animation, pivots and footprints. Quality uses Prism Garden’s procedural 3D actors and needs no image bundle. A petal-caged lantern, faceted creatures, etched floor seal and perimeter crystals form its visual vocabulary. Broad, cool stone stays quiet underneath attack cues, while directional shadows and warm dawn lighting establish depth. Engravings are flat decoration, and substantial crystals remain outside traversable ground. Both consume the same run through the local presentation contract. Art sizes remain cosmetic.
