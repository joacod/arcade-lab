# Midnight Circuit artwork

[Game presentations](../../../../docs/games/midnight-circuit/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

Signal / Rain uses original SVG artwork under the repository’s [MIT license](../../../../LICENSE). Afterglow’s geometry and generated sign/contact-shadow textures live in `../three/art.ts`, `../three/scenery.ts` and `../three/fighters.ts`; its [creative brief](../../../../docs/games/midnight-circuit/README.md#quality-art-direction-afterglow) lives in the game guide.

## Signal / Rain creative brief

A rain-soaked industrial city printed in charcoal ink, oxidized teal, vermilion and warm paper. Angular cut-paper silhouettes, asymmetric jackets, heavy outlines and sparse hatching replace Normal's soft neon illustration. Rook wears a teal dispatch jacket, cream headband and red scarf. Strikers wear red security uniforms, Bruisers wear ochre work armor, and the Warden wears oversized ivory armor with a red reactor. Quiet wet pavement leaves combat lanes readable. Red remains reserved for hostile intent, while cream and mint highlight recovery and repairs.

Both stages share the same palette, perspective and material treatment. The backstreets have shuttered radio shops, posters and dark windows; the station has paired transformers, warning bands and a grid-control wall. UI, rain, shadows, impact rings and sparks remain procedural to preserve clear state cues and match the printed palette.

## Files and drawing contract

The editable source is [signal-rain/generate.mjs](signal-rain/generate.mjs). Run `node src/games/midnight-circuit/art/signal-rain/generate.mjs` from the repository root to regenerate the committed SVG images. Canvas uses smooth sampling for their outlined illustration. Keep shape edges bold enough to read at the default gameplay scale.

| Image | Dimensions | Role and footprint |
| --- | --- | --- |
| `fighters.svg` | 512 × 256 | Four rows: Rook, Striker, Bruiser, Warden. Eight 64 × 64 independent parts per row: head, torso, upper arm, forearm, thigh, shin, boot, hand. Each frame rectangle starts at `(column × 64, row × 64)`. |
| `skyline.svg` | 960 × 320 | Repeating distant skyline at 0.18 camera parallax; 960 × 320 world units, top at ground − 360. |
| `backstreets.svg`, `station.svg` | 960 × 340 | Repeating stage facade, 960 × 270 world units above the ground at 0.78 parallax. Subdued detail sits behind actors. |
| `pavement.svg` | 960 × 240 | Camera-aligned repeating street surface, 960 units wide, extending from the ground to the viewport bottom with a minimum height of 240 units. |
| `repair.svg` | 64 × 64 | Transparent repair case drawn at 42 × 42 units, centered on the pickup's x coordinate and grounded at lane + 4 with a gentle two-unit hover. |

Fighters face right and mirror around their foot origin for left facing. Head and torso frame origins are `(-32, -140)` and `(-32, -91)`. Limb images pivot at `(32, 8)` and stretch along a 40-unit joint span. Boot and hand anchors are `(32, 54)` and `(32, 32)`. Transparent padding keeps adjacent frames isolated. The normal-size standing silhouette is approximately 80 × 130 units; Bruisers scale by 1.2 and the Warden by 1.48.

This part atlas uses `fighterPose` observations to place knees, ankles, elbows and hands. The [game guide](../../../../docs/games/midnight-circuit/README.md#theme-modes) owns gait and combat-animation behavior. Immunity flicker, hit flashes and attack arcs stay in the Canvas overlay.

`asset-art.ts` validates this layout; `assets.ts` maps images to roles. Preparation and release follow the [shared replacement contract](../../../../docs/architecture.md#replacement-and-recovery).
