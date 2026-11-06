# Obsidian Duel artwork

[Game and combat presentation](../../../../docs/games/obsidian-duel/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/arcade.md)

All required outputs and editable inputs live here. New raster illustrations were generated with the built-in image generation tool; prompts accompany the source sheets. Project artwork uses the repository's [MIT license](../../../../LICENSE). No third-party artwork inputs are included.

## Direction across modes

Keep the same cast, astronomical citadel, unarmed moves and teal/copper role separation throughout the progression. Nera has a long dark ponytail and crescent clasp, ivory wrap tunic, turquoise sash, dark teal trousers and soft boots. Kael has short dark hair, a neat beard, broad bare arms, a charcoal wrap tunic, copper sash, dark trousers and bronze forearm wraps. Heavier form and horizontal punches distinguish him from Nera's light silhouette and kicks. Mirror the complete figures with facing, preserving stable support feet and purposeful hands.

### Eclipse Foundry · Arcade

The outlined contours, broad value blocks and soft shading suit an old-school hand-painted arcade presentation. Movement and combat drawings share a guarded neutral stance, connected anatomy and costume proportions. Frame them with a ruined astronomical foundry: enormous weathered basalt columns, copper eclipse and orbital bands overhead, teal banners, aqueducts, distant mountains and warm forge openings. Architectural density stays high and at the sides. The central head/body band stays subdued, and the level fight lane has no apparent pits, steps or blocking scenery.

The new arena is in `eclipse-foundry/sources/stage.png`. The existing fighter inputs, exact crops and pivots remain in `eclipse-foundry/painted/`. Eight editable SVG effect cels cover Stormglass, strike contact, guard, ground seal, Crescent heel, punch pressure, low sweep and aerial slash. Their graphic shapes suit the arcade fighters and distinguish attacks without implying extra damage.

### Moonfall Sanctum · Deluxe

Reinterpret those same costumes as detailed modern painted sprites with embroidered hems, cloth volume, stitched leather, scuffed boots, bronze trim, dimensional faces and connected anatomy. Independent movement and combat sheets in `moonfall-sanctum/fighters/` retain those identities and action vocabulary. The original 36-drawing sheets continue to supply jumps, injury, knockdown and wake-up. Assess the character drawings themselves at gameplay size before adding atmosphere.

The retained illustrated observatory provides carved basalt, weathered bronze, jade ornament, a fractured lunar instrument, distant aqueducts and waterfalls. Quiet mist separates the cast from the backdrop. A wet uninterrupted terrace grounds the characters. Edge pillars and lanterns remain scenery behind the lane. Sparse motes, low mist and faint reflections support the detailed artwork.

The new transparent jade-and-gold atlas coordinates projectile, contact, protection, ground ring and four move ribbons. Pearl cores make small threats readable. Keep bursts compact, ground rings flattened and decorative motion subordinate to guards, attack height and opponent labels. Kael's Riftbreaker pressure stays horizontal and copper; Nera's heel crescent is tall and teal. Neither a trail nor a charge glint confirms contact. Menus, meters and announcements use the lunar bronze/jade palette.

## Cel layout and timing

All runtime fighter atlases are **2560 × 2240 RGBA PNGs**, packed eight 320 × 224 cells per row. Every cell has a cosmetic ground pivot at **(144, 208)** and a 320 × 224 world-unit draw footprint including transparent padding. The shared layout is a drawing contract, not shared artwork or physical geometry. Arcade and Deluxe each load their own Nera and Kael PNGs. Smooth Canvas sampling preserves contours.

`animation.ts` observes the simulation and supplies 16 semantic clips. `asset-art.ts` computes rectangles. Authored holds fill the 74 timed slots: idle, walking, jump, crouch, standing/crouching guard, light, heavy, sweep, aerial, special, hurt, block recoil, down, rise and landing. Attack slots 0–2 anticipate, 3–4 contact and 5–7 retract/settle, selected inside the actual simulation windows. Walking follows signed distance instead of a wall-clock loop and preserves phase through stops. Contact pause freezes the animation clock with the fight.

Each fighter in each theme has a `*-motion.png` source with four columns and four rows: four restrained breathing drawings with planted feet, eight guarded shuffle cels, then standing guard, crouching guard, crouch and standing block recoil. High guard must raise both forearms above the ordinary fighting stance. Keep shuffle steps low with steady hips and raised hands; distinguish lead-foot advance from the rear foot catching up. The Nera gait cleanup prompts record lowering excessive knee lift.

The `*-combat.png` sources contain four columns across five inspected rows: light, heavy, sweep, aerial and special. Each row supplies anticipation, contact, retraction and settling. Nera uses palm/heel/low-kick/descending-kick/two-palm actions; Kael uses short punch/long punch/low kick/descending fist/lunging punch. Grounded support boots stay registered through the action, including Nera's one-leg heel strike. Standing endpoints use the exact neutral drawing from the motion sheet. Air cels keep a virtual ground reference; no limb is stretched to meet collision reach.

`pack-motion.mjs` mechanically registers these complete drawings over the base atlas. It finds four complete connected silhouettes in each inspected row, preserving wide attacks that cross nominal column boundaries, removes isolated export specks, keeps transparency, applies uniform sheet scale and records support pivots. Travel uses the source hip column so moving feet cannot pull the torso sideways. The `*-motion-layout.json` and `*-combat-layout.json` outputs record rectangles, pivots, scale and slot selections; these are the final overrides to the base mappings. Export rejects missing figures and clipped runtime cels.

`art/pack-fighters.mjs` supplies the retained Deluxe jump and reaction drawings from six-row sheets. Its `layout.json` records those base sources. Foundry retains its `painted/layout.json` and base packer for the corresponding original jump/reaction cels. Both exporters apply `pack-motion.mjs` last. Keep uneven source row boundaries explicit rather than imposing a grid on the illustrations.


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
# Deluxe base cels plus registered motion/combat replacements and metadata
node src/games/obsidian-duel/art/pack-fighters.mjs
# Arcade base cels plus registered motion/combat replacements and metadata
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
- [Cartwright's GDC slides](https://media.gdcvault.com/GDC2014/Presentations/Cartwright_Muriel_Animation_Bootcamp_Fluid.pdf): key silhouettes, deliberate holds, follow-through, contact pause and returning to a moving idle stance.
- [Sifu combat VFX](https://clamz.artstation.com/projects/0lKKZV): contact shapes that communicate combat information.
