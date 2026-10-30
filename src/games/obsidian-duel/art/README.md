# Obsidian Duel artwork

`cover.svg` is the collection cover. `eclipse-foundry/` contains the original Assets theme and its editable generator. All artwork in this folder is original Arcade Lab work under the repository's [MIT license](../../../../LICENSE). No third-party images, fonts or downloads are required.

## Eclipse Foundry creative brief

A ruined astronomical foundry, poised between cold sky and warm metal. Flat illustrated planes, dark ink contours and restrained etched details connect the arena and costumes. A copper eclipse and orbital bands occupy the upper sky; distant basalt spires and an aqueduct form a low-contrast backdrop. The unobstructed fight lane has engraved bronze inlays. Braziers and columns stay at the edges and behind the lane.

Nera has a slim ivory split mantle, turquoise plates, light boots, a crescent hair crest and luminous stormglass. Kael has a square crown, broad charcoal armor, bronze edges and oversized gauntlets with angular ember seams. Their existing attacks remain unarmed. Both profiles face right in source art and mirror with facing. Strong costume values distinguish them from the subdued scenery and one another.

Inspiration only:

- [CraftPix modular warriors](https://craftpix.net/freebies/free-warrior-4-direction-character-sprites/): independent illustrated costume parts as an alternative to baking every articulated action into a full-body sheet.
- [Nagoriyuki, Guilty Gear Strive](https://www.guiltygear.com/ggst/en/character/nag/): bold silhouette and clear material blocks. The Foundry costumes, faces, crest and unarmed animations are original.
- [Sifu combat VFX, Sébastien Gabriel](https://clamz.artstation.com/projects/0lKKZV): contact effects communicate combat information. Foundry uses a pointed warm strike burst and a cool polygonal guard seal.

## Image specifications

All SVGs have explicit intrinsic dimensions and use smooth Canvas sampling. They contain no external references. `asset-art.ts` owns decoded dimension validation and part columns. The renderer maps these cosmetic footprints to the same world transform as Normal; physical bodies and reach come from gameplay content.

| Image | Intrinsic size | Layout and use |
| --- | --- | --- |
| `stage.svg` | 1600 × 896 | Opaque side-view arena plate, viewBox 1000 × 560. Drawn over the fixed world rectangle without independent stretching. The near floor begins at world y=420; fighters stand at the gameplay floor. |
| `nera.svg`, `kael.svg` | 1024 × 160 each | Transparent articulated atlas. Eight adjacent 128 × 160 cells, no gutters. Columns: torso, head, upper arm, gauntlet, thigh, shin, boot, mantle. Source rectangles are `[column × 128, 0, 128, 160]`. |
| `effects.svg` | 512 × 128 | Four transparent 128-square cells, no gutters: right-facing Stormglass bolt, hit burst, guard seal, ground seal. Each cell anchors at its center. |

There are no sequential animation frames. The existing pose observations supply idle breathing, movement stride, jumping, crouching, guard, startup, active strikes, recovery, hitstun, knockdown and wake-up. Each part is drawn in a fixed cell; its transparent margins remain part of its mapped footprint. Limbs run top to bottom and pivot at the top center of their destination rectangle, with five world units of overlap across joints. Boots pivot at the foot; torso and head attach to their named joints. The mantle pivots behind the shoulder, gathers above the floor when crouched, and adds a small cosmetic flutter unless reduced motion is requested.

`asset-presentation.ts` owns destination sizes: head footprints are roughly 45–49 × 58 world units, torso widths 61–76, and the mantle 83–98 × 112–116. Segment lengths follow observed joints, with Nera's narrow plates and Kael's broader armor. Artwork dimensions include source padding and are not collision dimensions. The bolt uses a 76 × 46 footprint, mirrors with its own facing, and does not imply extra reach. Contact images expand briefly within the existing bounded effect lifetime.

## Editing

Edit the authored paths, gradients and palettes in `eclipse-foundry/generate.mjs`, then regenerate the committed SVGs from the repository root:

```sh
node src/games/obsidian-duel/art/eclipse-foundry/generate.mjs
```

The generator has no dependencies or runtime role. A fresh checkout loads the committed outputs directly. Keep independent moving parts and reaction effects out of the static stage. Preserve quiet space behind the fighters, the right-facing profiles, fixed cell rectangles and joint overlaps when refining art.
