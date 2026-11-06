# Midnight Circuit artwork

[Game presentations](../../../../docs/games/midnight-circuit/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

Original vector artwork and AI-generated painted fighters and environment plates ship under the repository's [MIT license](../../../../LICENSE). All runtime images live here. The Normal and Assets generators are editable sources; painted assets retain their creation prompts. Generation is an artwork maintenance step, independent of runtime preparation.

## Direction across modes

Keep one city and recognizable cast through the [standard progression](../../../../docs/architecture.md#development-progression). Rook has a teal dispatch jacket, ivory sleeves and red scarf. Strikers wear narrow red security uniforms, Bruisers have ochre utility armor, and the Warden has massive ivory ceramic armor and an orange core. Size, silhouette and costume distinguish roles alongside color. Actors, repairs and hostile intent lead the hierarchy, followed by the road and then architecture.

### Normal: Street sketch

A modest flat illustration of the same people and setting. Complete, simple vector cels use broad clothing shapes, faces and a few color blocks. Silhouette skyline, broad shop windows and plain industrial cabinets establish location without a dedicated scenery polish pass. No rain, reflected figures, detailed materials or dense decoration. Preserve every significant combat cel and the same warnings as the richer modes. `normal/generate.mjs` retains the authored whole-figure contours and exports the sheet and simple repair case. No runtime anatomy assembly or independently transformed parts.

### Assets: Signal / Rain

A classic painted-arcade cast against an inked industrial city in charcoal, oxidized teal, brass and warm paper. Heavy outlines, selective hatching and broad shadow planes give the architecture a retro comic identity. Keep the classic painted combat cels and add a matching movement sheet with distinct contact/passing steps and guarded neutral jumps. The runtime `fighters/animated.webp` combines these whole drawings; it never borrows the Quality cast.

The street has three distinct bays: a lantern-lit noodle counter with a striped canopy, a shuttered radio shop with a repair window and paper poster, and a glazed laundrette with circular washing-machine fronts. Upper apartment windows, masonry courses, copper drains, gutters, railway trusses and sagging wire join the scene. The power station replaces shop interiors with finned transformer pairs, ceramic insulators, warning bands, gauges and a main control panel. Align the central panel with the Warden arena.

The road stays quiet: sparse broken ink reflections replace the old dense perspective grid. Scenery cannot look like an obstacle in the playable lane. Warm paper menus, restrained rain and shadowed actor reflections complete the treatment. The editable source is `signal-rain/generate.mjs`; Canvas uses smooth sampling for the illustrated contours.

### Quality: Afterglow

The same city receives a modern painted finish: weathered brick, oxidized railway steel and copper, teal enamel, smoked glass and aged ivory ceramic. Warm shielded lamps and shop interiors illuminate petrol-blue shadows. Redraw the cast as dimensional modern illustrations: more defined faces and hair, layered clothing with seams and folds, scuffed leather, heavy ochre work armor and beveled ivory ceramic plating. Preserve recognizable identities while authoring new complete cels for every role and action. `afterglow/fighters/` owns the independent higher-resolution sheet, four source drawings, prompts and inspected packing layout.

The street plate contains the radio shop, noodle bar and laundrette beneath the railway. The station has recessed transformer bays and a grand brick control hall with meters, insulators and copper busbars. Architecture remains parallel to the fighting plane, with the whole road open. Textured asphalt carries soft horizontal practical-light reflections; actor reflections and soft contact shadows are composed separately. Keep painted texture quieter than the people and bright telegraphs. The dark perimeter, ivory instruments, warm contact sparks and mint repairs carry this finish through the scene. Rain is sparse, freezes with active time and disappears with reduced motion. Victory warms the facade and restores separate live indicator cues.

`afterglow/streets.webp` and `station.webp` are AI-generated environment plates. A separate painted `skyline.webp` remains visible above the lower foreground facades on both desktop and portrait displays. The station roof exposes that city through transparent sky, instead of carrying an opaque background rectangle. Full prompts sit beside each plate as `*.prompt.txt`. Preserve the environment-only composition and broad quiet road when replacing them, then inspect and update curb anchors in `quality-art.ts`. The detailed repair case is an original SVG with painted material gradients. Canvas delivers this treatment directly; no graphics library, bloom pipeline or runtime 3D geometry is needed.

## Layout and integration

| Image | Dimensions | Drawing contract |
| --- | --- | --- |
| `normal/fighters.svg` | 3072 × 1024 | Four rows: Rook, Striker, Bruiser, Warden. Twelve complete 256-square cels per row. |
| `fighters/animated.webp` | 4096 × 1024 | Four rows of sixteen complete 256-square cels, with eight-frame walking clips. Independent Assets artwork. |
| `afterglow/fighters/fighters.webp` | 8192 × 2048 | Four rows of sixteen newly drawn complete 512-square cels. Independent modern Quality artwork, not enlarged Assets pixels. |
| `normal/repair.svg`, `signal-rain/repair.svg`, `afterglow/repair.svg` | 64 × 64 | A whole case, drawn at 42 × 42 world units and grounded at pickup lane + 4. No cosmetic hover that shifts the interaction cue. |
| `signal-rain/skyline.svg` | 1920 × 480 | 1280 × 320 world units, top at ground − 480, distant parallax 0.18. |
| `signal-rain/backstreets.svg`, `station.svg` | 1920 × 600 | 1280 × 400 world-unit facade, bottom aligned to the rear curb. World-aligned with the road. |
| `signal-rain/pavement.svg` | 1920 × 480 | 1280 units wide, at least 320 units tall, filling below the curb. |
| `afterglow/skyline.webp` | 1774 × 887 | Distant 1600 × 800 world-unit city layer at 0.18 parallax, bottom hidden behind the facade. |
| `afterglow/streets.webp`, `station.webp` | 1774 × 887 | 800 world units wide. Inspected source curb at y=605 and y=632 respectively. Facade scales uniformly; quiet road alone extends to fill tall displays. Alternate tiles mirror to join edge pixels. |

The first twelve columns retain the semantic order idle, left contact, left passing, right contact, right passing, anticipation, punch, kick, neutral rise, neutral fall, hurt and down. Painted sheets use the walk sequence `[1, 12, 2, 13, 3, 14, 4, 15]`; columns 12–15 supply the in-betweens. Normal retains its separate four-cel walk. Figures face right and mirror around the foot origin. Normal and Assets have a (128, 240) ground pivot and 160 × 160 world-unit footprint including padding. Quality uses the equivalent (256, 480) pivot and a 168-square footprint; source resolution and padding remain cosmetic. Bruisers scale uniformly by 1.2 and the Warden by 1.48. Elevation translates the whole drawing independently of ground lane. No body parts are transformed separately. Artwork dimensions and anchors never supply collision geometry.

`animation.ts` selects cels from observed displacement and actual attack windows. Warnings, impact arcs, health bars, pickups and the Warden's recovery label stay separate semantic cues. Painted walking uses eight complete contact, weight-transfer and passing drawings over a relaxed 152-unit full stride, scaled for larger fighters. Keep a guarded upper body and alternate the near/far leg through the two contacts. Register the upper torso horizontally as a whole, since centering a source cell or a changing boot silhouette introduces jitter. Preserve a shared ground baseline rather than snapping each lifted foot down. Repeated render observations without simulation travel cannot advance it. Reduced motion preserves these travel cues and neutral jump poses while suppressing decorative motion and flashes. Jumping alone never selects a kick; aerial attack startup/recovery use the guarded airborne pose around the actual kick contact. All scenery and effects use active run time, including when a theme replaces a paused presentation.

## Maintaining outputs

From the repository root:

```sh
node src/games/midnight-circuit/art/normal/generate.mjs
node src/games/midnight-circuit/art/signal-rain/generate.mjs
node src/games/midnight-circuit/art/fighters/pack.mjs
node src/games/midnight-circuit/art/fighters/pack-animation.mjs
```

The classic painted fighters retain their original transparent source, creation prompt, transparency correction, source rectangles and pivots in `fighters/`. The original eight-cel `fighters.png` remains an input to the animation packer, rather than a runtime atlas. New Assets movement artwork and its inspected layout live in `fighters/movement/`. Quality retains one 4 × 3 source sheet per role for its combat cels and its own packing layout in `afterglow/fighters/`. `fighters/walking/` owns four 4 × 4 source sheets: eight classic Assets walk cels in the upper half and eight independent Quality cels in the lower half, in contact/down/pass/reach order for each leg. The adjacent prompt and inspected layout retain their contracts. Packing isolates each complete connected figure and aligns the whole drawing to the stable pivot, preserving antialiased edges and rejecting clipping. It does not reconstruct anatomy.

The animation packer exports transparent WebP atlases at quality 96. It isolates each complete connected figure, aligns stable pivots, excludes near-transparent matte noise, and rejects clipped destinations. It never warps body parts. Grounded scale stays uniform across each role’s live cels; the horizontal defeat drawing is fitted as a whole. Afterglow's committed WebP environment plates use quality 90. Inspect any new source at gameplay scale before exporting, retain its prompt, and validate the decoded dimensions and rear curb. Keep all architecture, furniture and cables behind that curb. Do not bake independent actors, repairs, warnings or restored-grid state into scenery. All necessary output files must remain committed.

`asset-art.ts`, `quality-art.ts` and `sprite-art.ts` own validation. `assets.ts` and `quality.ts` own their prepared bundles, while the Canvas presentation owns Normal's initial images. Preparation and release follow the [shared replacement contract](../../../../docs/architecture.md#replacement-and-recovery).
