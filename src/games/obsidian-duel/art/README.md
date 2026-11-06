# Obsidian Duel artwork

[Game and combat presentation](../../../../docs/games/obsidian-duel/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/arcade.md)

All required outputs and editable inputs live here. New raster illustrations were generated with the built-in image generation tool; prompts accompany the source sheets. Project artwork uses the repository's [MIT license](../../../../LICENSE). No third-party artwork inputs are included.

## Direction across modes

Keep the same cast, astronomical citadel, unarmed moves and teal/copper role separation throughout the progression. Nera has a long dark ponytail and crescent clasp, ivory wrap tunic, turquoise sash, dark teal trousers and soft boots. Kael has short dark hair, a neat beard, broad bare arms, a charcoal wrap tunic, copper sash, dark trousers and bronze forearm wraps. Heavier form and horizontal punches distinguish him from Nera's light silhouette and kicks. Mirror the complete figures with facing, preserving stable support feet and purposeful hands.

### Eclipse Foundry · Arcade

Retain the established painted fighter cels and their expressive coordinated anatomy. Their outlined contours, broad value blocks and soft shading suit an old-school hand-painted arcade presentation. Frame them with a ruined astronomical foundry: enormous weathered basalt columns, copper eclipse and orbital bands overhead, teal banners, aqueducts, distant mountains and warm forge openings. Architectural density stays high and at the sides. The central head/body band stays subdued, and the level fight lane has no apparent pits, steps or blocking scenery.

The new arena is in `eclipse-foundry/sources/stage.png`. The existing fighter inputs, exact crops and pivots remain in `eclipse-foundry/painted/`. Eight editable SVG effect cels cover Stormglass, strike contact, guard, ground seal, Crescent heel, punch pressure, low sweep and aerial slash. Their graphic shapes suit the arcade fighters and distinguish attacks without implying extra damage.

### Moonfall Sanctum · Deluxe

Reinterpret those same costumes as detailed modern painted sprites with embroidered hems, cloth volume, stitched leather, scuffed boots, bronze trim, dimensional faces and connected anatomy. The new 36-drawing fighter sheets in `moonfall-sanctum/fighters/` replace the Foundry pixels while retaining their identities and attack vocabulary. Assess the character drawings themselves at gameplay size before adding atmosphere.

The retained illustrated observatory provides carved basalt, weathered bronze, jade ornament, a fractured lunar instrument, distant aqueducts and waterfalls. Quiet mist separates the cast from the backdrop. A wet uninterrupted terrace grounds the characters. Edge pillars and lanterns remain scenery behind the lane. Sparse motes, low mist and faint reflections support the detailed artwork.

The new transparent jade-and-gold atlas coordinates projectile, contact, protection, ground ring and four move ribbons. Pearl cores make small threats readable. Keep bursts compact, ground rings flattened and decorative motion subordinate to guards, attack height and opponent labels. Kael's Riftbreaker pressure stays horizontal and copper; Nera's heel crescent is tall and teal. Neither a trail nor a charge glint confirms contact. Menus, meters and announcements use the lunar bronze/jade palette.

## Cel layout and timing

All runtime fighter atlases are **2560 × 2240 RGBA PNGs**, packed eight 320 × 224 cells per row. Every cell has a cosmetic ground pivot at **(144, 208)** and a 320 × 224 world-unit draw footprint including transparent padding. The shared layout is a drawing contract, not shared artwork or physical geometry. Arcade and Deluxe each load their own Nera and Kael PNGs. Smooth Canvas sampling preserves contours.

`animation.ts` observes the simulation and supplies 16 semantic clips. `asset-art.ts` computes rectangles. Authored holds fill the 74 timed slots: idle, walking, jump, crouch, standing/crouching guard, light, heavy, sweep, aerial, special, hurt, block recoil, down, rise and landing. Contact drawings enter only at the active boundary; recovery retracts the attack. Guard hands stay in front, crouches reduce silhouette height, and sweeping feet stay near the floor. Walking follows signed distance instead of a wall-clock loop.

The new Deluxe source sheets each contain six rows of six full-body drawings: stance/travel, air/guard, light/heavy, sweep/aerial, special/reaction, and down/rise/settle. `art/pack-fighters.mjs` records the inspected row boundaries and maps drawings to timed holds. It selects complete connected silhouettes, removes disconnected export noise, preserves antialiased edges, applies uniform sheet scale and normalizes support pivots. Contact drawings apply a bounded translation of the whole cel to align the hand or heel with authored move reach while preserving body proportions and support. Air cels keep a virtual ground reference. The resulting `layout.json` files record source rectangles, dimensions, pivots, scale and clip mappings. Packing rejects clipped or empty cels and never assembles body parts.

Foundry retains its separate `painted/layout.json` mapping and packer, including the original selected drawings and contact offsets. Its source sheets can have uneven spacing; maintain explicit inspected crops rather than assuming a new grid.

## Arena and effect images

| Runtime image | Dimensions | Layout and anchors |
| --- | --- | --- |
| `eclipse-foundry/stage.webp` | 1600 × 896 | Complete arcade foundry plate over the fixed arena. Uninterrupted foreground terrace. |
| `eclipse-foundry/effects.svg` | 512 × 256 | Four columns, two rows of 128-square cells. Center anchors; right-facing bolt and punch ribbons. |
| `moonfall-sanctum/stage.webp` | 1600 × 896 | Illustrated lunar observatory and wet terrace, retained from the earlier arena pass. |
| `moonfall-sanctum/effects.png` | 1536 × 768 | Four columns, two rows of 384-square cells. Same eight semantic roles as Foundry. Contact pivots in `deluxe-art.ts`; bolt and punch anchor near their bright noses, other cells at their centers. |

Source stage/effect PNGs and prompts remain in each family's `sources/` folder. The Deluxe effect cleanup prompt records removal of unwanted background haze. Fighter cleanup preserves the exact pose layout and costume. Required outputs run without regeneration or external services. Use the [shared source and anchor workflow](../../../../docs/arcade.md#specify-artwork-before-integrating-it) for replacements.

## Editing and export

From the repository root, using Node and the installed Playwright Chromium:

```sh
# New Deluxe whole-character sheets and inspected layout metadata
node src/games/obsidian-duel/art/pack-fighters.mjs
# Retained Arcade fighter drawings
node src/games/obsidian-duel/art/eclipse-foundry/painted/pack.mjs
# Arcade arena and editable effect artwork
node src/games/obsidian-duel/art/eclipse-foundry/pack.mjs
node src/games/obsidian-duel/art/eclipse-foundry/generate.mjs
# Deluxe arena and eight-cell effects atlas
node src/games/obsidian-duel/art/moonfall-sanctum/pack.mjs
```

Changing source sheet layout requires inspecting and updating the owning packer and its recorded metadata together. Keep export operations mechanical; illustration defines body shape, clothing, anatomy and action.

## Inspiration

These are technique references, not artwork inputs:

- [Akiman's Capcom interview](https://game.capcom.com/cfn/sfv/column-112429): deliberate action drawings and sprite budgets.
- [Mariel Cartwright's animation talk](https://www.gdcvault.com/play/1020575/Animation-Bootcamp-Fluid-and-Powerful): clear keys, anticipation, contact and recovery under combat timing constraints.
- [Sifu combat VFX](https://clamz.artstation.com/projects/0lKKZV): contact shapes that communicate combat information.
