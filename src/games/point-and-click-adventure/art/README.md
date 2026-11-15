# The Thirteenth Guest artwork

[Blackthorn Nocturne · Deluxe](DELUXE.md) owns the enhanced art direction,
source sheets and export contract. Both presentations share the game-owned
Canvas compositor and preserve the same room geometry.

## Blackthorn by Candlelight · Arcade

The visual direction is an illustrated Gothic comedy: theatrical frontal rooms,
fine ink contours, textured gouache, midnight blue, bottle green, tarnished brass
and candle amber. Ghosts use restrained spectral turquoise. Wren's long teal coat,
overstuffed satchel and small lantern contrast with the household's silhouettes.
Keep clues readable and the lower floor open.

These original illustrations were generated for this project with the built-in
imagegen tool. There are no third-party asset packs or required credits.
The complete source PNG drawings are in `source/`; the production prompts and
targeted edit instructions are in [prompts.md](prompts.md).

## Exporting and replacing artwork

Run `node src/games/point-and-click-adventure/art/pack.mjs` from the repository root.
It exports WebP paintings and sheets, retaining transparent alpha. It crops whole
drawings and records their bounds; it does not assemble characters from parts.
Edit complete cels or room plates in the source PNGs, then export again.

| Source | Layout and runtime contract |
| --- | --- |
| `rooms.png` | 1366 × 1151, two columns and three rows: hall/gallery, library/kitchen, bell/spare hall. Inspected seams and floor-edge registration live in `pack.mjs`. The five runtime plates are 960 × 540, with the wall/floor edge registered to y=365. |
| `cast.png` | 1536 × 1024, four columns and three rows. Wren's standing, reach and lantern poses and the five household characters. The original walk studies remain in the source but are superseded by `walk.png`. Explicit crop rectangles and hip/boot anchors live in `../art.ts`. |
| `walk.png` | 1536 × 1024, four columns and two rows. Eight complete Wren cels in chronological stride order, registered to a common hip column and boot baseline. The runtime uses `walk.webp`; frame roles, source-scale adjustment and stride distance live in `../art.ts`. |
| `props.png` | 1254 × 1254, five columns and rows of complete doors, clues, equipment and object states. `prop-frames.ts` records alpha bounds. |
| `equipment.png` | 1254 × 1254, three columns and rows of inventory tools, casebook, console table, brush and satchel. `equipment-frames.ts` records alpha bounds. |

All artwork uses smooth sampling. Wren's standing and action cels use a common
.48 world-unit source scale and individually registered hips/feet, including the
shorter bent reach drawing. The larger walk drawings use a two-thirds adjustment
to retain the same apparent height. His eight-cel stride follows observed travel, with its distance defined in
`../art.ts` to keep the steps readable at the game's walking speed;
standing is separate. Facing mirrors complete cels around their anchor.
NPCs use their authored target height, while the Guest occupies its separate
hovering target inside the bell. Prop drawings fit the target's visual footprint
without stretching their aspect ratio. Door arches use a tall architectural
registration above their hotspot, with thresholds on the authored floor, so
the opening fits a person. Inventory uses the same prop drawings and separate
equipment roles. The satchel and casebook drawings also provide the labeled corner controls. Geometry and approach points remain in `../content.ts`.

Closed/open service tube and cabinet, screaming/quiet portrait, empty/inhabited
frame, loose/attached chain and outward/inward mirror have separate authored
images. Lantern light, chalk, contact shadows, music motes and dust are bounded
Canvas effects. The bell is drawn before its independent inhabitant.

Walking, reaching and lantern operation observe commands, displacement and
completed approaches. They never delay an action or alter a puzzle result.
Examination keeps the standing pose; brief reach and lantern poses mark physical
interactions. Walls and mounted objects are cached at display resolution and rebuilt for
room, prop-state or display changes. Floor objects, tables, their contents and
characters share a depth pass using foot contact or authored support depth, so
nearer objects occlude Wren. Physical table clearances remain in content. Light
stamps and the vignette are rasterized once instead of painting gradients every
frame, and live sprites use smooth low-cost sampling.
Active-run time freezes cosmetic motion while paused. Reduced motion removes
dust, ghost drift and light flicker while retaining locomotion and object states.
Room changes and new runs reset cosmetic registration. Required artwork is
prepared and validated before play, including continuation from a saved case.
The session releases failed/cancelled resources and offers Retry artwork.

Follow the shared [Arcade workflow](../../../../docs/arcade.md) and
[collection preview workflow](../../../../docs/architecture.md#collection-previews-and-site-identity)
when replacing this artwork.
