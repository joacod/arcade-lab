# Obsidian Duel artwork

`cover.svg` is the collection cover. `eclipse-foundry/` contains the original Assets theme and its editable generator. All artwork in this folder is original Arcade Lab work under the repository's [MIT license](../../../../LICENSE). No third-party images, fonts or downloads are required.

## Eclipse Foundry creative brief

A ruined astronomical foundry, poised between cold sky and warm metal. Flat illustrated planes, dark ink contours and restrained etched details connect the arena and costumes. A copper eclipse and orbital bands occupy the upper sky; distant basalt spires and an aqueduct form a low-contrast backdrop. The unobstructed fight lane has engraved bronze inlays. Braziers and columns stay at the edges and behind the lane.

Nera has a slim ivory split mantle, turquoise plates, light boots, a crescent hair crest and luminous stormglass. Kael has a square crown, broad charcoal armor, bronze edges and oversized gauntlets with angular ember seams. Their existing attacks remain unarmed. Both profiles face right in source art and mirror with facing. Strong costume values distinguish them from the subdued scenery and one another.

Inspiration only:

- [Nagoriyuki, Guilty Gear Strive](https://www.guiltygear.com/ggst/en/character/nag/): bold silhouette and clear material blocks. The Foundry costumes, faces, crest and unarmed animations are original.
- [Sifu combat VFX, Sébastien Gabriel](https://clamz.artstation.com/projects/0lKKZV): contact effects communicate combat information. Foundry uses a pointed warm strike burst and a cool polygonal guard seal.

## Action cels and animation direction

Assets uses complete character drawings, with 74 cels per fighter across 16 clips. The retired atlas of independent torso, head and limb parts is no longer used. Each frame can express its own silhouette, overlapping arms, chest turn, hand shape, cloth silhouette and contact emphasis. The generator redraws complete cels from authored whole-body keys; it does not bake transforms of the old part images.

Technique references, not sources of artwork:

- [Ed Boon interviewed by NPR](https://www.wkms.org/2023-09-30/how-mortal-kombat-conquered-gaming): early Mortal Kombat filmed performers for its sprites. The useful lesson here is observing a complete body's coordinated motion, rather than independently moving extremities. No actor footage or game sprites are included.
- [Capcom's Akiman interview](https://game.capcom.com/cfn/sfv/column-112429): character animation and sprite memory were authored together. Our compact sheets preserve deliberate action drawings with a stable pivot.
- [Mariel Cartwright's GDC animation talk](https://www.gdcvault.com/play/1020575/Animation-Bootcamp-Fluid-and-Powerful): strong keys, anticipation and timing under fighting-game frame restrictions, with examples including Street Fighter III and Darkstalkers. Prioritize a clear chamber, decisive contact, recoil and settle over interpolating every pose uniformly.

`animation.ts` owns semantic clip selection, authored whole-body keys and the anatomy constraints used by Normal and the cel generator. It does not supply hitboxes. `fighters.mjs` owns the illustrated treatment of each complete cel, including pose-specific contours and costume details. The runtime Assets renderer only selects and draws a complete cel. The two presentations share observations and action timing, not a runtime part rig.

## Image specifications

All SVGs have explicit intrinsic dimensions and use smooth Canvas sampling. They contain no external references. `asset-art.ts` owns decoded dimension validation and source rectangles. The renderer maps these cosmetic footprints to the same world transform as Normal; physical bodies and reach come from gameplay content.

| Image | Intrinsic size | Layout and use |
| --- | --- | --- |
| `stage.svg` | 1600 × 896 | Opaque side-view arena plate, viewBox 1000 × 560. Drawn over the fixed world rectangle. The near floor begins at world y=420; fighters stand at the gameplay floor. |
| `nera.svg`, `kael.svg` | 2560 × 2240 each | Transparent whole-body atlas. 320 × 224 cells packed consecutively, eight per row. Every frame has a ground pivot at cell (144, 208) and a 320 × 224 world-unit footprint, including transparent padding. Compact packing avoids allocating a separate mostly empty row for short clips. |
| `effects.svg` | 512 × 128 | Four transparent 128-square cells: right-facing Stormglass bolt, hit burst, guard seal, ground seal. Each cell anchors at its center. |

Clip order and counts are defined in `duelClips`; `foundryFrame` computes the packed rectangles. The order is idle (4), walk (8), jump (3), crouch (1), standing guard (1), crouching guard (1), light (8), heavy (8), sweep (8), aerial (8), special (8), hurt (3), block recoil (2), knockdown (4), rise (4), landing (3). Artwork faces right and mirrors with the fighter. Cell padding and the pivot stay fixed during mirroring; there is no runtime whole-body rotation, part assembly or nonuniform scaling.

Idle loops gently unless reduced motion is requested. Walk phase follows signed ground travel, with a 100-world-unit cycle and a planted support interval. Jump observations choose ascent, apex or descent. Attacks use the simulation's own move time: cels 0–2 anticipate, 3–4 contact and follow through, and 4–7 retract and settle during recovery. Normal interpolates the authored keys while solving constant-length limbs; Assets selects discrete cels. Reaction clips use observed state durations. Pausing freezes observation time, and restart resets the cosmetic observers.

The bolt uses a 76 × 46 footprint and mirrors with its own facing. Contact images expand briefly within the existing bounded effect lifetime. These footprints do not imply extra collision reach.

## Editing

Edit stage and effects in `eclipse-foundry/generate.mjs`, whole-cel contours and costume details in `eclipse-foundry/fighters.mjs`, and action keys in `../animation.ts`. Regenerate the committed SVGs from the repository root:

```sh
node src/games/obsidian-duel/art/eclipse-foundry/generate.mjs
```

The generator uses Node’s built-in TypeScript support and has no runtime role. A fresh checkout loads the committed outputs directly. Keep moving fighters and reaction effects out of the static stage. Preserve quiet space behind the fighters, right-facing profiles, fixed pivots and cell rectangles when refining art. Every cel has a stable `clip-frame` SVG group ID. Refine complete silhouettes and transitions at gameplay size; changing a sheet cannot change move timing or geometry.
