# Skybreak artwork

[Game presentations](../../../../docs/games/skybreak/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

All standard modes depict an aircraft sortie over the Pacific coast. The [coastal sortie guide](coastal-sortie/README.md) owns the Aurora Fleet and Tempest Coast art direction, source illustrations, role layouts, moving scenery, separate fortress hulls and export commands. Original artwork uses the repository's [MIT license](../../../../LICENSE).

## Pacific Run baseline

`aircraft/generate.mjs` owns Normal's six transparent SVG sheets. The fighter uses six horizontal 64 × 80 cells; scout, raider, gunship and interceptor use six 64-square cells; the flagship uses six 336 × 168 cells. Exhaust advances every 0.09 active seconds and freezes for reduced motion. Frame centers are pivots. `aircraft.ts` supplies footprints and north-facing role mappings; the renderer rotates hostile aircraft south.

`objects.svg` contains five 64-square cells: Power, Spread, Repair, a weak-point nacelle and the central reactor. These simple baseline drawings remain independent from the two directed modes' newly illustrated object assets.

```sh
node src/games/skybreak/art/aircraft/generate.mjs
```

`../art-pack.ts` validates role frames and footprints. `../assets.ts` prepares each complete appearance bundle through the shared image owner. The Canvas renderer consumes those images and simulation observations without deriving physical geometry from artwork dimensions.
