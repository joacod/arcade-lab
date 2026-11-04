# Ember Ruins · Rekindled artwork

[Presentation brief](../../../../../docs/games/last-light-clearing/README.md#quality-direction-ember-ruins--rekindled) | [Creative prompts](prompts.md)

Rekindled is a new modern illustrated asset family based on the knight, green goblins, red demon and ruined dungeon setting of Assets. Those designs are the reference; Quality does not reuse or load the pixel atlas. The new actors, props, crystals and spell bodies share sculpted volume, weathered steel and bronze, cool stone and warm ember light.

All images in this directory and `sources/` are original AI-generated artwork included under the repository's MIT license. The separate Assets atlas retains its [CC0 provenance](../ember-ruins/PROVENANCE.md).

## Image roles and layout

| Runtime image | Dimensions | Complete artwork |
| --- | --- | --- |
| `keeper.webp` | 1024 × 512, 4 × 2 cells | Silver-blue knight: breathing idle row, running row |
| `goblins.webp` | 1024 × 512, 4 × 2 cells | Teal-hood goblin running row, red-crested charger running row |
| `elite.webp` | 1024 × 512, 4 × 2 cells | Horned crimson demon: breathing idle row, advancing walk row |
| `props.webp` | 768 × 512, 3 × 2 cells | Top: intact column, broken stump, brazier. Bottom: emerald gem, golden Halo, violet Shard |
| `ground.webp` | 1536 × 1024 | Flat weathered limestone and moss, quiet beneath combat |

Every packed actor cell is 256-square with foot anchor `(0.5, 0.89)`. Whole-character source drawings retain their connected anatomy and authored poses. The packer aligns and resamples complete cels without assembling bodies or deriving geometry. Actors face right and mirror for leftward travel. The four cels in each row play in order. Goblin/charger idle holds their row's first cel. `themes.ts` owns visual footprints and animation timing; physical radii remain in gameplay content.

Props use the same foot anchor; gem/Halo/Shard cels are centered. Their dynamic locations and sizes come from the presentation mapping, independently of the scenery and physical hit bodies. The floor contains no actors, pickups, hazards, raised obstacles or baked gameplay warnings.

`sources/*.png` preserve the 1536 × 1024 authored sheets before packing. `layout.json` records source alpha bounds, packing scale and destination rectangles. `ground-source.png` preserves the ground source. Runtime WebP atlases preserve alpha and use lossless compression; the ground uses an opaque quality-88 export. Referenced frames, props, optional charger and decoded ground dimensions validate before activation.

## Edit and export

Repaint complete source cels or replace them with new full-body drawings using the same role and pose specification. Keep a consistent camera, costume, lighting, scale and ground pivot across each sequence. Inspect standing poses, contact/passing strides and transitions at gameplay size. Assess the main knight, goblin and one prop together on the floor before expanding a replacement set.

```sh
node src/games/last-light-clearing/art/rekindled/pack.mjs
cwebp -q 88 src/games/last-light-clearing/art/rekindled/ground-source.png -o src/games/last-light-clearing/art/rekindled/ground.webp
```

Packing uses the repository's existing Chromium dependency for image decoding and resampling, plus `cwebp` for export. It updates the runtime atlases and layout metadata. Source artwork and packing are maintenance inputs; a fresh clone loads committed images without running either process.
