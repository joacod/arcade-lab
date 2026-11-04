# Skybreak artwork

[Game presentations](../../../../docs/games/skybreak/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

All standard modes depict an aircraft sortie over the Pacific coast. Normal uses simple readable aircraft, Assets uses the warm arcade Aurora Fleet palette, and Quality uses shaded metal aircraft over the [Tempest Coast background](tempest-coast/README.md). Original vector artwork uses the repository's [MIT license](../../../../LICENSE).

## Complete aircraft sheets

`aircraft/generate.mjs` is the editable source. Each mode has six transparent SVG sheets, prefixed `normal-`, `assets-` or `quality-`. Artwork faces north; hostile aircraft and the flagship turn south as complete sprites. Authored exhaust cels advance at 0.09 seconds per frame and freeze for reduced motion.

| Role | Frame size | Frames | World footprint |
| --- | --- | --- | --- |
| Fighter | 64 × 80 | 6 | 56 × 70 |
| Scout | 64 × 64 | 6 | 48 × 62 |
| Raider | 64 × 64 | 6 | 66 × 58 |
| Gunship | 64 × 64 | 6 | 78 × 64 |
| Interceptor | 64 × 64 | 6 | 48 × 68 |
| Flagship | 336 × 168 | 6 | 336 × 168 |

Frames advance horizontally. Their pivot is the frame center. Banking, roll and facing transform complete images. `objects.svg` contains five 64-square cells: Power, Spread, Repair, a weak-point nacelle and the central reactor. Independently moving weak points follow simulation coordinates; they are complete mechanical objects, with separate semantic glow and warnings.

```sh
node src/games/skybreak/art/aircraft/generate.mjs
```

`aircraft.ts` maps mode variants to roles. `../art-pack.ts` defines frame timing and footprints; `../assets.ts` prepares and validates sheets. Quality retains the same image-based actors in its Canvas layer and uses the illustrated coastal plate and restrained Canvas atmosphere. There are no modeled aircraft, joint rigs or orbital assets.
