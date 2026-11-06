# Blastline artwork

[Game guide](../../../../docs/games/blastline/README.md) | [Shared artwork workflow](../../../../docs/arcade.md)

Iron coast uses original pixel-inspired SVG sprites under the repository's [MIT license](../../../../LICENSE). Teal Nova and ochre Bolt remain distinct from muted security uniforms and the broad tracked Bastion. Complete silhouettes and baked aim variants keep the renderer small. The industrial background and breakable terrain remain procedural.

| Image | Layout | Drawing contract |
| --- | --- | --- |
| `operators.svg` | 320 × 512, 64-square cels. Five columns: up, diagonal up, forward, diagonal down, down. Four rows per operator: idle, two steps, airborne. Nova precedes Bolt. | Right-facing, sole pivot (27, 60), 48-square world footprint including padding. Mirror the entire cel for facing. Aim selects a drawing; no arms or weapons rotate at runtime. Reduced motion holds idle during grounded travel. |
| `enemies.svg` | 192 × 192. Three columns: idle and two steps. Rows: guard, heavy, Bastion. | Complete right-facing figures; mirror at their world center. Bastion has a larger authored footprint. Hit flashes and target lines remain separate cues. |
| `objects.svg` | 512 × 64. Live relay, offline relay, barrel, dormant supply post, supplied post, rescue cage, then a double-width extraction aircraft. | Object rectangles and world footprints live in `presentation.ts`. Text labels remain separate. |

`../sprite-art.ts` defines image URLs, decoded-dimension checks and operator cel selection. `generate.mjs` preserves the editable whole-cel drawings and object illustrations. Regenerate with:

```sh
node src/games/blastline/art/generate.mjs
```

Every required output is committed.

## Ember Coast / Arcade

### Creative brief

Keep the occupied industrial coast and the same cast, with a detailed 16-bit arcade finish. Nova wears teal with a red scarf and a compact rifle; Bolt wears ochre with a shoulder launcher. Muted olive security and rust-armored heavy units lead to the squat tracked Bastion with its orange optic. Dark navy contours, clustered metal highlights, amber windows and warm coastal skies tie the scene together. Green supply equipment, red barrels and glowing amber relays remain readable against quieter teal harbor silhouettes. Riveted blue structural steel, ochre brick and X-braced rust armor distinguish immutable routes from breakable cover. The interface carries matching brass accents.

Complete right-facing operator cels include idle, a six-frame running cycle and a tucked airborne pose for all five aim observations. The running cycle includes contact, support and passing poses for each half-stride, without inserting idle between steps. Machines have complete idle/two-step cels, with track/vent variations for the Bastion. Damage flashes, target lines, health bars and readable labels stay separate from the artwork. Object drawings include live/offline relays, dormant/supplied posts and intact/damaged cover; effects include a muzzle flare, explosion and smoke. Two panoramic plates depict Border Station's harbor and Foundry Run's furnace district without baking actors or objectives into scenery.

### Runtime atlas contracts

All files below live in `ember-coast/`. PNG sprites have transparency and use nearest-neighbor sampling. Typed `blastLayouts` in `sprite-art.ts` owns atlas cells, actor rows, draw footprints, origins, object roles and environment source rectangles. Update that mapping when replacing artwork; physical geometry remains in `content.ts`.

| Image | Layout | Anchors and playback |
| --- | --- | --- |
| `operators.png` | 640 × 1024, 128-square cells; five aim columns: up, diagonal up, forward, diagonal down, down. Rows 0–3 Nova, 4–7 Bolt; each group idle, original stride A/B, airborne. Arcade uses the idle and airborne rows; running uses the dedicated sheets below. | Sole pivot (54, 120), drawn in a 48-square world rectangle. Mirror complete cells for facing. Grounded reduced-motion travel uses idle. Aim follows `operatorCel` in `sprite-art.ts`. |
| `nova-run.png`, `bolt-run.png` | Each 768 × 640, 128-square cells. Six columns form a complete stride. Five rows aim up, diagonal up, forward, diagonal down, down. | Same sole pivot (54, 120) and 48-square draw footprint as idle. The packer aligns each complete cel's opaque boot baseline, retaining a uniform illustration scale. |
| `enemies.png` | 384 × 384, 128-square cells. Three columns idle/step A/step B. Rows guard, heavy, Bastion. | Bottom-center pivot (64, 120). Guard/heavy draw in 36 × 34 world rectangles, Bastion in 72 × 64. Travel uses the same grounded-distance observation as operators, with one cel per half-stride; still actors use idle. Mirror whole cells. |
| `objects.png` | 512 × 512, sixteen 128-square cells in row-major order. | Live relay, offline relay, barrel, dormant post; supplied post, cage, helicopter, grenade; steel, brick, armor, damaged brick; damaged armor, muzzle, explosion, smoke. Objects fill local draw rectangles, including the helicopter's 128 × 64 world rectangle. Labels and telegraphs are separate. |
| `backdrop.webp` | 1536 × 1024; top 1536 × 512 harbor, bottom 1536 × 512 foundry. | One bounded panorama per mission, with cosmetic horizontal parallax. Covers tall viewports without repeating seams. No collision or interaction data. |

Muzzle flashes follow weapon recovery, explosions expand during their existing 0.38-second visual lifetime, and smoke uses the bounded particle owner. No art clip advances simulation or derives collision dimensions. Reduced motion preserves action/aim observations and warning cues while suppressing decorative motion and flashes.

`animation.ts` accumulates grounded horizontal travel, with one complete left/right stride per 96 world units. Reversing direction preserves phase; absolute world coordinates never select a frame. Pausing freezes the phase. Stopping, jumping, landing, redeployment-sized discontinuities and restart begin a fresh stride.

### Sources, provenance and export

Original AI-generated artwork was created for this repository and ships under the repository's [MIT license](../../../../LICENSE), with no third-party asset dependencies. `ember-coast/sources/` retains the final full-resolution PNG illustration sheets, [production prompts](ember-coast/sources/prompts.md) including transparency cleanup, and [run-cycle prompts](ember-coast/sources/run-prompts.md). Edit complete illustrations there; do not split actors into articulated pieces.

`ember-coast/pack.mjs` crops and resamples the existing whole drawings, normalizes operator and enemy pivots, and exports the committed runtime bundle. Object crops are inspected coordinates, including the wider helicopter. Backdrop WebP export uses quality 0.94. Export after changing source sheets with:

```sh
node src/games/blastline/art/ember-coast/pack.mjs
```

The packer uses the installed Playwright Chromium for offline Canvas export. Runtime preparation uses `assets.ts` and the shared image owner; regeneration is never required to play a fresh checkout.

## Ember Reforged / Deluxe

The [game guide](../../../../docs/games/blastline/README.md#theme-modes) owns the creative brief. This is a newly illustrated, smooth painted interpretation of Ember Coast's cast, equipment and occupied industrial coast. The artwork supplies volume, cloth, weathered metal and warm edge lighting before any effects. All actors are complete sprites, including authored aim, standing recoil, tucked airborne and running cels. Quiet harbor and furnace plates leave the dynamic action separate. No existing retro sprite is enlarged to form the Deluxe cast.

### Runtime atlas contracts

All files below live in `ember-reforged/`. PNG atlases retain transparency and use high-quality smooth sampling. Physical bodies, material health and mission placements remain in gameplay content. World draw rectangles and atlas role mappings live in `sprite-art.ts`.

| Image | Layout | Anchor and playback |
| --- | --- | --- |
| `operators.png` | 960 × 1152; five columns and six rows of 192-square cels. Columns aim up, diagonal up, forward, diagonal down, down. Rows 0–2 Nova idle, recoil, airborne; rows 3–5 Bolt idle, recoil, airborne. | Sole pivot (80, 180), 48-square world draw rectangle. Mirror whole cels. Existing weapon recovery selects standing recoil; airborne takes precedence. Reduced motion holds idle instead of recoil. |
| `nova-run.png`, `bolt-run.png` | Each 1152 × 960; six stride columns and five aim rows of 192-square cels. | Same operator pivot and world draw rectangle. The existing grounded-distance phase drives one complete left/right stride. Uniform per-sheet scale and aligned opaque boot baselines avoid size changes between contact and passing poses. |
| `enemies.png` | 576 × 576; three columns idle, step A, step B; rows guard, heavy, Bastion. | Bottom-center pivot (96, 180), preserving the existing enemy draw rectangles. The packer centers each complete illustration and uses one scale per role. Bastion cels vary tracks and vent illumination. |
| `objects.png` | 768 × 768; sixteen 192-square cels, row-major. | Same semantic object order as Ember Coast: live/offline relay, barrel, dormant/supplied post, cage, aircraft, grenade, steel, brick, armor, damaged brick/armor, muzzle, explosion, smoke. Inspected crops retain complete objects, the wide aircraft and flush tile edges. |
| `backdrop.webp` | 2048 × 1024; top 2048 × 512 harbor, bottom 2048 × 512 foundry. | Two opaque panoramas, preserving the source aspect ratio. The existing bounded mission-relative parallax follows the same camera as the other modes. |

Muzzle flashes, explosions, smoke, damage cues and extraction observe the existing presentation events and run time. UI colors and surfaces match the painted art. Pixel-mode scanlines are omitted. Reduced motion preserves movement and warning lines while suppressing decorative recoil, shake, flash and moving effects.

### Sources and exports

Original AI-generated artwork ships under the repository's [MIT license](../../../../LICENSE), with no third-party asset dependencies. `ember-reforged/sources/` retains the full-resolution transparent operator, running, enemy and object PNGs, the opaque scenery PNG and the [production prompt set](ember-reforged/sources/prompts.md). Edit whole illustrations; never split characters into body parts.

`ember-reforged/pack.mjs` records the inspected source row boundaries and object crops, aligns grounded soles, matches full-body scale between idle and running sources, and exports the committed runtime atlases. It checks source transparency before packing sprites. Source dimensions can differ from the runtime atlas; `deluxe.ts` validates decoded dimensions and checks the local role mappings against sheet bounds before activation. Regenerate the bundle with:

```sh
node src/games/blastline/art/ember-reforged/pack.mjs
```

An optional sheet name, such as `bolt-run`, exports only that sheet. The packer uses offline Chromium Canvas with smooth resampling and WebP quality 0.94 for scenery. Runtime never loads production sources or invokes generation.
