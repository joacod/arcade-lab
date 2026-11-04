# Midnight Circuit artwork

[Game presentations](../../../../docs/games/midnight-circuit/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

Original vector artwork and AI-generated painted fighters and environment plates ship under the repository's [MIT license](../../../../LICENSE). All runtime images live here. The Normal and Assets generators are editable sources; painted assets retain their creation prompts. Generation is an artwork maintenance step, independent of runtime preparation.

## Direction across modes

Keep one city and recognizable cast through the [standard progression](../../../../docs/architecture.md#development-progression). Rook has a teal dispatch jacket, ivory sleeves and red scarf. Strikers wear narrow red security uniforms, Bruisers have ochre utility armor, and the Warden has massive ivory ceramic armor and an orange core. Size, silhouette and costume distinguish roles alongside color. Actors, repairs and hostile intent lead the hierarchy, followed by the road and then architecture.

### Normal: Street sketch

A modest flat illustration of the same people and setting. Complete, simple vector cels use broad clothing shapes, faces and a few color blocks. Silhouette skyline, broad shop windows and plain industrial cabinets establish location without a dedicated scenery polish pass. No rain, reflected figures, detailed materials or dense decoration. Preserve every significant combat cel and the same warnings as the richer modes. `normal/generate.mjs` retains the authored whole-figure contours and exports the sheet and simple repair case. No runtime anatomy assembly or independently transformed parts.

### Assets: Signal / Rain

A classic painted-arcade cast against an inked industrial city in charcoal, oxidized teal, brass and warm paper. Heavy outlines, selective hatching and broad shadow planes give the architecture a retro comic identity. Keep the existing painted fighter cels and coordinate their setting rather than flattening them into the background.

The street has three distinct bays: a lantern-lit noodle counter with a striped canopy, a shuttered radio shop with a repair window and paper poster, and a glazed laundrette with circular washing-machine fronts. Upper apartment windows, masonry courses, copper drains, gutters, railway trusses and sagging wire join the scene. The power station replaces shop interiors with finned transformer pairs, ceramic insulators, warning bands, gauges and a main control panel. Align the central panel with the Warden arena.

The road stays quiet: sparse broken ink reflections replace the old dense perspective grid. Scenery cannot look like an obstacle in the playable lane. Warm paper menus, restrained rain and shadowed actor reflections complete the treatment. The editable source is `signal-rain/generate.mjs`; Canvas uses smooth sampling for the illustrated contours.

### Quality: Afterglow

The same city receives a modern painted finish: weathered brick, oxidized railway steel and copper, teal enamel, smoked glass and aged ivory ceramic. Warm shielded lamps and shop interiors illuminate petrol-blue shadows. Match the existing finished painted fighters with substantial environmental artwork rather than geometric stand-ins. Preserve the original cast and action drawings.

The street plate contains the radio shop, noodle bar and laundrette beneath the railway. The station has recessed transformer bays and a grand brick control hall with meters, insulators and copper busbars. Architecture remains parallel to the fighting plane, with the whole road open. Textured asphalt carries soft horizontal practical-light reflections; actor reflections and soft contact shadows are composed separately. Keep painted texture quieter than the people and bright telegraphs. The dark perimeter, ivory instruments, warm contact sparks and mint repairs carry this finish through the scene. Rain is sparse, freezes with active time and disappears with reduced motion. Victory warms the facade and restores separate live indicator cues.

`afterglow/streets.webp` and `station.webp` are AI-generated environment plates. A separate painted `skyline.webp` fills the distant city above them on portrait displays. Full prompts sit beside each plate as `*.prompt.txt`. Preserve the environment-only composition and broad quiet road when replacing them, then inspect and update curb anchors in `quality-art.ts`. The detailed repair case is an original SVG with painted material gradients. Canvas delivers this treatment directly; no graphics library, bloom pipeline or runtime 3D geometry is needed.

## Layout and integration

| Image | Dimensions | Drawing contract |
| --- | --- | --- |
| `normal/fighters.svg`, `fighters/fighters.png` | 2048 × 1024 | Four rows: Rook, Striker, Bruiser, Warden. Eight complete 256-square cels: idle, left step, right step, anticipation, punch, kick, hurt, down. Transparent background. |
| `normal/repair.svg`, `signal-rain/repair.svg`, `afterglow/repair.svg` | 64 × 64 | A whole case, drawn at 42 × 42 world units and grounded at pickup lane + 4. No cosmetic hover that shifts the interaction cue. |
| `signal-rain/skyline.svg` | 1920 × 480 | 1280 × 320 world units, top at ground − 480, distant parallax 0.18. |
| `signal-rain/backstreets.svg`, `station.svg` | 1920 × 600 | 1280 × 400 world-unit facade, bottom aligned to the rear curb. World-aligned with the road. |
| `signal-rain/pavement.svg` | 1920 × 480 | 1280 units wide, at least 320 units tall, filling below the curb. |
| `afterglow/skyline.webp` | 1774 × 887 | Distant 1600 × 800 world-unit city layer at 0.18 parallax, bottom hidden behind the facade. |
| `afterglow/streets.webp`, `station.webp` | 1774 × 887 | 1280 world units wide. Inspected source curb at y=605 and y=586 respectively. Facade scales uniformly; quiet road alone extends to fill tall displays. Alternate tiles mirror to join edge pixels. |

Both sheets face right and mirror around the foot origin. Each cel has a (128, 240) ground pivot and 160 × 160 world-unit footprint including padding. Bruisers scale uniformly by 1.2 and the Warden by 1.48. Elevation translates the whole drawing independently of ground lane. No body parts are transformed separately. Artwork dimensions and anchors never supply collision geometry.

`animation.ts` selects cels from observed displacement and actual attack windows. Warnings, impact arcs, health bars, pickups, encounter locks and the Warden's recovery label stay separate semantic cues. Reduced motion holds idle during walking, preserves combat poses and suppresses decorative motion. All scenery and effects use active run time, including when a theme replaces a paused presentation.

## Maintaining outputs

From the repository root:

```sh
node src/games/midnight-circuit/art/normal/generate.mjs
node src/games/midnight-circuit/art/signal-rain/generate.mjs
node src/games/midnight-circuit/art/fighters/pack.mjs
```

The painted fighters retain their transparent source, creation prompt, transparency correction, source rectangles and pivots in `fighters/`. Packing isolates each complete connected figure and aligns the whole drawing to the stable pivot, preserving antialiased edges and rejecting clipping. It does not reconstruct anatomy.

Afterglow's committed WebP plates use quality 90. Inspect any new source at gameplay scale before exporting, retain its prompt, and validate the decoded dimensions and rear curb. Keep all architecture, furniture and cables behind that curb. Do not bake independent actors, repairs, warnings or restored-grid state into scenery. All necessary output files must remain committed.

`asset-art.ts`, `quality-art.ts` and `sprite-art.ts` own validation. `assets.ts` and `quality.ts` own their prepared bundles, while the Canvas presentation owns Normal's initial images. Preparation and release follow the [shared replacement contract](../../../../docs/architecture.md#replacement-and-recovery).
