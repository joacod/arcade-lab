# Obsidian Duel artwork

[Game presentations](../../../../docs/games/obsidian-duel/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

`cover.svg` is the collection cover. `eclipse-foundry/` contains SVG stage/effects and AI-generated painted PNG fighters. `moonfall-sanctum/` contains Quality arena/effects artwork. Project images use the repository’s [MIT license](../../../../LICENSE); no third-party artwork inputs are included.

## Eclipse Foundry creative brief

A ruined astronomical foundry, poised between cold sky and warm metal. A quiet geometric stage frames expressive, painted human fighters. Selective contour lines and soft shading describe connected muscles, faces and clothing volumes. A copper eclipse and orbital bands occupy the upper sky; distant basalt spires and an aqueduct form a low-contrast backdrop. The unobstructed fight lane has engraved bronze inlays. Braziers and columns stay at the edges and behind the lane.

Nera wears an ivory wrap tunic, a flowing turquoise sash, dark teal trousers, soft boots and small wrist wraps. Her dark ponytail and crescent clasp carry the Stormweaver identity. Kael has short dark hair, a neat beard, a charcoal sleeveless wrap tunic, a copper sash and a small bronze forearm wrap. Broad connected shoulders and bare muscular arms convey his power. Clothing folds continue across the hips, elbows and knees. Armor boundaries and outlines do not divide every anatomical segment. Both remain unarmed, face right in source art, and mirror with facing. Strong costume values separate them from the subdued scenery and one another.

Inspiration only:

- [Nagoriyuki, Guilty Gear Strive](https://www.guiltygear.com/ggst/en/character/nag/): bold silhouette and clear material blocks. The Foundry costumes, faces, crest and unarmed animations are original.
- [Sifu combat VFX, Sébastien Gabriel](https://clamz.artstation.com/projects/0lKKZV): contact effects communicate combat information. Foundry uses a pointed warm strike burst and a cool polygonal guard seal.

## Action cels and animation direction

Eclipse Foundry uses painted whole-character action drawings. The relaxed stance, chamber, contact and recoil should retain connected muscles, purposeful hands and continuous garment folds across Nera’s sash and Kael’s bare shoulders.

Selected poses fill the timed atlas slots, including contact holds and retraction drawings. All three modes share these complete fighter cels.

Technique references, not sources of artwork:

- [Ed Boon interviewed by NPR](https://www.wkms.org/2023-09-30/how-mortal-kombat-conquered-gaming): early Mortal Kombat filmed performers for its sprites. The useful lesson here is observing a complete body's coordinated motion, rather than independently moving extremities. No actor footage or game sprites are included.
- [Capcom's Akiman interview](https://game.capcom.com/cfn/sfv/column-112429): character animation and sprite memory were authored together. Our compact sheets preserve deliberate action drawings with a stable pivot.
- [Mariel Cartwright's GDC animation talk](https://www.gdcvault.com/play/1020575/Animation-Bootcamp-Fluid-and-Powerful): strong keys, anticipation and timing under fighting-game frame restrictions, with examples including Street Fighter III and Darkstalkers. Prioritize a clear chamber, decisive contact, recoil and settle over interpolating every pose uniformly.

`animation.ts` owns semantic clip selection for every mode. Each renderer consumes the same action sample. `painted/layout.json` maps those timed samples to independently painted source drawings and their cosmetic pivots. `painted/pack.mjs` extracts each complete silhouette and applies uniform scale and translation to pack the runtime PNGs. It preserves source color, shading and alpha.

## Image specifications

Runtime images use smooth Canvas sampling. The fighter source sheets stay in `painted/`; `asset-art.ts` owns decoded-dimension validation and source rectangles.

| Image | Intrinsic size | Layout and use |
| --- | --- | --- |
| `stage.svg` | 1600 × 896 | Opaque side-view arena plate, viewBox 1000 × 560. Drawn over the fixed world rectangle. The near floor begins at world y=420; fighters stand at the gameplay floor. |
| `nera.png`, `kael.png` | 2560 × 2240 each | Transparent whole-body atlas. 320 × 224 cells packed consecutively, eight per row. Every frame has a ground pivot at cell (144, 208) and a 320 × 224 world-unit footprint, including transparent padding. Compact packing avoids allocating a separate mostly empty row for short clips. |
| `effects.svg` | 512 × 128 | Four transparent 128-square cells: right-facing Stormglass bolt, hit burst, guard seal, ground seal. Each cell anchors at its center. |

`duelClips` defines clip order and timed-slot counts; `foundryFrame` computes packed rectangles. Painted drawings may be reused for holds, retraction and settling. All 16 clips are covered: idle, walk, jump, crouch, standing guard, crouching guard, light, heavy, sweep, aerial, special, hurt, block recoil, knockdown, rise and landing. Source rectangles, source-sheet dimensions, per-sheet scale, selected cels and pivot corrections are maintained together in `painted/layout.json`.

Grounded drawings align to support contacts. Airborne drawings use a virtual ground pivot, retaining tucked feet above the baseline while simulation supplies jump elevation. Cosmetic contact shifts move the complete cel. Artwork faces right and mirrors with the fighter.

Idle loops gently; walk phase follows signed travel. Attack samples select anticipation, contact/follow-through and retraction/settling drawings from the simulation’s move time. Reaction clips follow observed state durations. The [game guide](../../../../docs/games/obsidian-duel/README.md#source-ownership) owns reduced-motion and semantic animation behavior.

The bolt uses a 76 × 46 footprint and mirrors with its own facing. Contact images expand briefly within the existing bounded effect lifetime.

## Editing

The source sheets and exact prompts are retained as the visual maintenance inputs:

- [Nera poses](eclipse-foundry/painted/nera-poses.png) and [prompt](eclipse-foundry/painted/nera-poses.prompt.txt).
- [Nera actions](eclipse-foundry/painted/nera-actions.png) and [prompt](eclipse-foundry/painted/nera-actions.prompt.txt).
- [Kael poses](eclipse-foundry/painted/kael-poses.png) and [prompt](eclipse-foundry/painted/kael-poses.prompt.txt).
- [Kael actions](eclipse-foundry/painted/kael-actions.png) and [prompt](eclipse-foundry/painted/kael-actions.prompt.txt).

Source sheets can have uneven spacing: inspect and update explicit source rectangles and pivots in `painted/layout.json` rather than assuming a uniform grid. Unselected source poses are not loaded. Use the [shared cel-authoring guidance](../../../../docs/assets-themes.md#specify-artwork-before-integrating-it) when replacing drawings.

Repack the committed fighter atlases with Node and the repository's installed Playwright Chromium:

```sh
node src/games/obsidian-duel/art/eclipse-foundry/painted/pack.mjs
```

The packer selects each complete connected silhouette where source bounding rectangles overlap, preserves its antialiased edge, normalizes support pivots and rejects any clipped destination cell. It performs no creative retouching or joint reconstruction.

Edit stage and effects in `eclipse-foundry/generate.mjs`, then regenerate their SVGs:

```sh
node src/games/obsidian-duel/art/eclipse-foundry/generate.mjs
```

## Moonfall Sanctum

Quality reuses the complete painted Nera and Kael atlases and their full set of semantic action cels. It adds an AI-generated illustrated arena and transparent effect artwork, with the original PNG sources and prompts in `moonfall-sanctum/sources/`. The [game guide](../../../../docs/games/obsidian-duel/README.md#moonfall-sanctum-art-direction) owns the creative brief and visual hierarchy.

| Image | Intrinsic size | Role |
| --- | --- | --- |
| `moonfall-sanctum/stage.webp` | 1600 × 896 | Moonlit observatory background, quiet mist behind fighters, unobstructed wet floor. Drawn in the same 1000 × 560 arena as the other themes. |
| `eclipse-foundry/nera.png`, `kael.png` | 2560 × 2240 each | Shared complete-character atlases. Use the existing cel rectangles, stable pivots, authored visual footprints and semantic timing. |
| `moonfall-sanctum/effects.png` | 768 × 768 | Four transparent 384-square cells in two rows: jade bolt, warm hit burst, blue guard seal, ground aura. Authored contact pivots live in `quality-art.ts`. |

The original stage source is 1659 × 948 and the final transparent effects source is 1254 × 1254. [Stage prompt](moonfall-sanctum/sources/stage.prompt.txt) and [effects prompts](moonfall-sanctum/sources/effects.prompt.txt) preserve the intended artwork and atlas correction. The export scales complete images and preserves alpha. Export with local Chromium:

```sh
node src/games/obsidian-duel/art/moonfall-sanctum/pack.mjs
```

`quality-art.ts` validates decoded dimensions, maps effect cells to contact points and records the painted Crescent heel contact mark. For mist, reflections and contact composition, see the [Moonfall Sanctum brief](../../../../docs/games/obsidian-duel/README.md#moonfall-sanctum-art-direction).
