# Obsidian Duel artwork

`cover.svg` is the collection cover. `eclipse-foundry/` contains the original Assets theme. Stage and effects have editable SVG sources; fighter art uses painted PNG drawings generated for this project with the built-in ImageGen tool. Project artwork is distributed under the repository's [MIT license](../../../../LICENSE). All required images and source sheets are committed, with no third-party artwork inputs or external downloads.

## Eclipse Foundry creative brief

A ruined astronomical foundry, poised between cold sky and warm metal. A quiet geometric stage frames expressive, painted human fighters. Selective contour lines and soft shading describe connected muscles, faces and clothing volumes. A copper eclipse and orbital bands occupy the upper sky; distant basalt spires and an aqueduct form a low-contrast backdrop. The unobstructed fight lane has engraved bronze inlays. Braziers and columns stay at the edges and behind the lane.

Nera wears an ivory wrap tunic, a flowing turquoise sash, dark teal trousers, soft boots and small wrist wraps. Her dark ponytail and crescent clasp carry the Stormweaver identity. Kael has short dark hair, a neat beard, a charcoal sleeveless wrap tunic, a copper sash and a small bronze forearm wrap. Broad connected shoulders and bare muscular arms convey his power. Clothing folds continue across the hips, elbows and knees. Armor boundaries and outlines do not divide every anatomical segment. Both remain unarmed, face right in source art, and mirror with facing. Strong costume values separate them from the subdued scenery and one another.

Inspiration only:

- [Nagoriyuki, Guilty Gear Strive](https://www.guiltygear.com/ggst/en/character/nag/): bold silhouette and clear material blocks. The Foundry costumes, faces, crest and unarmed animations are original.
- [Sifu combat VFX, Sébastien Gabriel](https://clamz.artstation.com/projects/0lKKZV): contact effects communicate combat information. Foundry uses a pointed warm strike burst and a cool polygonal guard seal.

## Action cels and animation direction

Assets uses painted whole-character drawings for every action. The idle figure must already read as one person: shoulders flow into upper arms, elbows have soft volume, hands grow from wrists, and fabric wraps around the body. Attack and recovery drawings continue those forms while the torso, hips and shoulders work together. A file containing a complete cel is only a storage format; the drawing itself establishes cohesion.

The selected painted poses fill the existing timed atlas slots, including explicit contact holds and retraction drawings. Normal's skeleton is not an artwork template for these images. The procedural limb-and-torso drawing generator has been removed from the Assets workflow.

Technique references, not sources of artwork:

- [Ed Boon interviewed by NPR](https://www.wkms.org/2023-09-30/how-mortal-kombat-conquered-gaming): early Mortal Kombat filmed performers for its sprites. The useful lesson here is observing a complete body's coordinated motion, rather than independently moving extremities. No actor footage or game sprites are included.
- [Capcom's Akiman interview](https://game.capcom.com/cfn/sfv/column-112429): character animation and sprite memory were authored together. Our compact sheets preserve deliberate action drawings with a stable pivot.
- [Mariel Cartwright's GDC animation talk](https://www.gdcvault.com/play/1020575/Animation-Bootcamp-Fluid-and-Powerful): strong keys, anticipation and timing under fighting-game frame restrictions, with examples including Street Fighter III and Darkstalkers. Prioritize a clear chamber, decisive contact, recoil and settle over interpolating every pose uniformly.

`animation.ts` owns semantic clip selection and the procedural poses used by Normal. Assets consumes the action sample only. `painted/layout.json` maps those timed samples to independently painted source drawings and their cosmetic pivots. `painted/pack.mjs` extracts each complete silhouette and applies uniform scale and translation to pack the runtime PNGs. It preserves source color, shading and alpha; it does not reconstruct or draw anatomical parts.

## Image specifications

Runtime images use smooth Canvas sampling and contain no external references. The fighter atlases preserve transparent silhouettes, and their original source sheets stay in `painted/`. `asset-art.ts` owns decoded dimension validation and source rectangles. The renderer maps these cosmetic footprints to the same world transform as Normal; physical bodies and reach come from gameplay content.

| Image | Intrinsic size | Layout and use |
| --- | --- | --- |
| `stage.svg` | 1600 × 896 | Opaque side-view arena plate, viewBox 1000 × 560. Drawn over the fixed world rectangle. The near floor begins at world y=420; fighters stand at the gameplay floor. |
| `nera.png`, `kael.png` | 2560 × 2240 each | Transparent whole-body atlas. 320 × 224 cells packed consecutively, eight per row. Every frame has a ground pivot at cell (144, 208) and a 320 × 224 world-unit footprint, including transparent padding. Compact packing avoids allocating a separate mostly empty row for short clips. |
| `effects.svg` | 512 × 128 | Four transparent 128-square cells: right-facing Stormglass bolt, hit burst, guard seal, ground seal. Each cell anchors at its center. |

`duelClips` defines clip order and timed-slot counts; `foundryFrame` computes packed rectangles. Painted drawings may be reused for holds, retraction and settling. All 16 clips are covered: idle, walk, jump, crouch, standing guard, crouching guard, light, heavy, sweep, aerial, special, hurt, block recoil, knockdown, rise and landing. Source rectangles, source-sheet dimensions, per-sheet scale, selected cels and pivot corrections are maintained together in `painted/layout.json`.

Grounded drawings align by their support contacts. Airborne drawings have an explicit virtual ground pivot, retaining tucked feet above the baseline while the simulation supplies jump elevation. Cosmetic contact shifts are applied to the complete cel. They never move the simulation body. Artwork faces right and mirrors with the fighter. There is no runtime part assembly, nonuniform scaling or limb rotation.

Idle loops gently unless reduced motion is requested. Walk phase follows signed ground travel. Attack samples use the simulation's own move time: startup draws the anticipation, active draws contact and follow-through, and recovery selects retraction and settling. Contact artwork never appears during startup. Reaction clips follow observed state durations. Pausing freezes observation time; restart resets the observers.

The bolt uses a 76 × 46 footprint and mirrors with its own facing. Contact images expand briefly within the existing bounded effect lifetime. These footprints do not imply extra collision reach.

## Editing

The source sheets and exact prompts are retained as the visual maintenance inputs:

- [Nera poses](eclipse-foundry/painted/nera-poses.png) and [prompt](eclipse-foundry/painted/nera-poses.prompt.txt).
- [Nera actions](eclipse-foundry/painted/nera-actions.png) and [prompt](eclipse-foundry/painted/nera-actions.prompt.txt).
- [Kael poses](eclipse-foundry/painted/kael-poses.png) and [prompt](eclipse-foundry/painted/kael-poses.prompt.txt).
- [Kael actions](eclipse-foundry/painted/kael-actions.png) and [prompt](eclipse-foundry/painted/kael-actions.prompt.txt).

Reauthor complete character drawings when changing anatomy, costume or motion. Preserve identity, camera, light direction, clothing volume and transparency across the sequence. Inspect the relaxed stance first, then the chamber, contact and recoil together. Source sheets can have uneven spacing, so inspect and update explicit source rectangles and pivots rather than assuming a uniform generated grid. Unselected source poses are not loaded by the game.

Repack the committed fighter atlases with Node and the repository's installed Playwright Chromium:

```sh
node src/games/obsidian-duel/art/eclipse-foundry/painted/pack.mjs
```

The packer selects each complete connected silhouette where source bounding rectangles overlap, preserves its antialiased edge, normalizes support pivots and rejects any clipped destination cell. It performs no creative retouching or joint reconstruction. Layout corrections are cosmetic and independent of move timing and geometry.

Edit stage and effects in `eclipse-foundry/generate.mjs`, then regenerate their SVGs:

```sh
node src/games/obsidian-duel/art/eclipse-foundry/generate.mjs
```

These tools have no runtime role. A fresh checkout loads the committed outputs directly. Keep moving fighters and reaction effects out of the static stage, and preserve quiet space behind the actors.
