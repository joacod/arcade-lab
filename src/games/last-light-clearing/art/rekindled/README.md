# Ember Ruins · Rekindled artwork

[Presentation brief](../../../../../docs/games/last-light-clearing/README.md#quality-direction-ember-ruins--rekindled) | [Creative prompts](prompts.md)

Compact painted dark-fantasy miniatures reinterpret Arcade' knight, goblins, demon and ruined courtyard. Large expressive heads, broad connected bodies, short legs and controlled material shapes are authored for the game's overhead combat scale. All images in this directory and `sources/` are original AI-generated artwork included under the repository's MIT license. The separate Arcade atlas retains its [CC0 provenance](../ember-ruins/PROVENANCE.md).

## Images and registration

| Runtime image | Dimensions | Complete artwork |
| --- | --- | --- |
| `keeper.webp` | 1024 × 512, 4 × 2 cells | Ivory-steel knight: breathing idle row, grounded walk row |
| `goblins.webp` | 1024 × 512, 4 × 2 cells | Teal-hood scavenger walk row, burgundy double-crested charger walk row |
| `elite.webp` | 1024 × 512, 4 × 2 cells | Squat horned demon: breathing idle row, heavy walk row |
| `props.webp` | 768 × 512, 3 × 2 cells | Top: pillar, broken stump, brazier. Bottom: XP crystal, Halo mote, Shard |
| `ground.webp` | 1536 × 1024 | Quiet overhead slate cobbles and moss seams |

Actor cels are 256-square. Actors face right and slightly toward the viewer, with an elevated orthographic camera; leftward travel mirrors the complete sprite. Keeper and elite have separate idle rows. Goblin idle holds its first cel. Grounded walking cycles use opposite contacts and passing poses with short steps and minimal vertical bob. `themes.ts` owns their timing, visual footprints, silhouette envelopes, displacement per cycle and role mappings.

The gameplay anchor is `(0.5, 0.64)`, within the lower body. Authored sole contact is `(0.5, 200/256)`, below that center. Shadows consume the contact point; hit/protection feedback and labels consume the silhouette envelope. Neither defines physical collision geometry. Halo, Pulse and projectile positions remain simulation-owned. Props register at `(0.5, 220/256)`; spell and gem cels are centered.

`registration.json` is the editable packing input: source pivots, destination contact points and a fixed scale per sequence. Source coordinates refer to each cell, independently of the row/column position. Inspect planted soles, pelvis and helmet together before choosing those pivots. Do not shift individual passing poses to whichever pixel is lowest. Props have independent whole-object registrations. Alpha bounds trim transparent storage only; they never determine an animation pivot.

`sources/*.png` preserve the 1536 × 1024 authored sheets. `layout.json` records inspected source bounds, pivots, scales and packed envelopes. `ground-source.png` preserves the separate floor artwork. The floor contains no dynamic objects, raised obstacles or baked gameplay warnings. Runtime WebP atlases retain alpha with lossless compression; the opaque floor uses quality 88.

## Edit and export

Repaint complete cels, keeping camera, proportions, costume and registered contact consistent. Inspect a full loop and the idle/walk transition at gameplay size. Replace a representative Keeper, enemy and spell together on the floor before expanding the family. After repacking, update `themes.ts`'s silhouette envelopes when the authored drawings change.

```sh
node src/games/last-light-clearing/art/rekindled/pack.mjs
```

The packer uses the existing Sharp dependency and exports the actor/object atlases and ground. Source artwork and packing are maintenance inputs; a fresh clone loads committed images without generation or packing.
