# Last Light Clearing artwork

[Game presentations](../../../../docs/games/last-light-clearing/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

`cover.svg` is an editable vector illustration. Normal draws the Keeper, crawlers, ground marks, gems and spells procedurally. Briar chargers add a forked crest; the persistent overlay carries their locked attack warnings across themes.

**Ember Ruins** uses 0x72 DungeonTileset II v1.7. The atlas, frame list, upstream README, and [source credit and license](ember-ruins/PROVENANCE.md) live together.

## Add an art pack or replace one role

`src/games/last-light-clearing/art-pack.ts` defines `ArtPack`, `ActorArt`, `Clip`, and `Decoration`. `src/games/last-light-clearing/themes.ts` owns the mode definitions: image bundle, semantic Keeper/crawler/elite actors, environment, effect palette, and default interface. Replace the Assets definition there after inspecting its frames and animation layout.

- Give each local image a stable key in `images`, using `new URL('./art/file.png', import.meta.url).href`.
- Define explicit `[x, y, width, height]` frame rectangles with `still()` or `frame()`. `row()` is a small helper for an inspected regular row with known frame count and stride.
- Supply `idle` and `move` clips with positive frame durations in active seconds and a looping policy. Optional `hit` and `attack` clips are cosmetic event reactions. Omit clips the artwork does not provide.
- Set a normalized `[x, y]` anchor and a world-space frame `footprint`. Transparent padding is included in that footprint.
- Choose `rotate`, `mirror`, or an explicit four-direction idle/move map only where supplied art supports it. Set `nearest` or `smooth` sampling for the pack.
- Environment ground stamps tile an open arena, optionally blended over the floor color. Border stamps and substantial perimeter props are placed completely outside it. Flat ground variation must read as decoration.

To replace only the Keeper, copy the Assets mode's art definition, add its image key, and replace `art.actors.keeper`. Leave crawler, elite, environment, and palette unchanged. The renderer uses these roles rather than external filenames. Reuse other image keys if several actors share an atlas.

The loader validates referenced frames, pivots, footprints and timing. Initial image failure uses silhouettes; subsequent replacements follow the [shared recovery contract](../../../../docs/architecture.md#replacement-and-recovery).

## Interface styling

Each mode chooses its matching interface in `themes.ts`; `style.css` defines its `[data-skin]` custom properties. Classic accompanies Normal, Rune accompanies Assets, Glass accompanies Quality, and Abyss accompanies Custom.

## Prism Garden sources

`../three/floor.ts` generates cached paving, gold rings and botanical roots. The [game guide](../../../../docs/games/last-light-clearing/README.md#quality-direction-prism-garden) owns the Garden brief, scene composition and renderer details.
