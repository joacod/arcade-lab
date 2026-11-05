# Last Light Clearing artwork

[Game presentations](../../../../docs/games/last-light-clearing/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

Normal uses complete Keeper and crawler cels in `grove/actors.svg` and the committed `grove/gem.svg`. Ground marks and spells remain procedural. Briar chargers add a forked crest; the persistent overlay carries their locked attack warnings across themes.

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

The loader validates referenced frames, pivots, footprints and timing. Required initial artwork gates Play with retry on failure; theme replacements follow the [shared recovery contract](../../../../docs/architecture.md#replacement-and-recovery).

## Interface styling

Each mode chooses its matching interface in `themes.ts`; `style.css` defines its `[data-skin]` custom properties. Classic accompanies Normal, Rune accompanies Assets, and Ember accompanies Quality.

## Rekindled artwork and scenery

Quality uses a new [illustrated actor, prop and spell bundle](rekindled/README.md) based on Ember Ruins' knight, goblin and demon designs. It does not load `dungeon.png`. New complete character cels, a separate charger, bronze-and-stone props, gems, Halo bodies and Shard projectiles share a modern painted finish. `../ember-scene.ts` composes the ground, new perimeter props, cached soft light stamps and a fixed ember field. Authored sprite footprints and animation layout remain separate from physical geometry. The [game guide](../../../../docs/games/last-light-clearing/README.md#quality-direction-ember-ruins--rekindled) owns the presentation brief.

## Normal sprite sources

`grove/generate.mjs` authors connected whole-creature contours in `actors.svg`. It exports a 256 × 192 sheet: four 64-square cels in each of three rows, Keeper, crawler and elite. The pivot is the cell center. Footprints are 40, 38 and 72 world units respectively; physical radii remain in content. Idle uses the first cel; movement cycles at 0.12 seconds per cel. The shared gem image is 32-square and drawn at its own gameplay footprint.

```sh
node src/games/last-light-clearing/art/grove/generate.mjs
```
