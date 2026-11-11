# The Sunward Route

Original AI-generated Cloudwake artwork, then mechanically cropped, sized and encoded with Sharp. The complete prompt set is retained in [prompts.json](prompts.json). These assets are distributed under the repository's [MIT license](../../../../LICENSE). No third-party game imagery, fonts, branding or source artwork is used.

## Visual brief and roles

A cheerful courier with amber goggles, cream helmet, rust-orange scarf and a satchel rides an ivory/teal turbine scooter. Ivory ruins carry dangerous coral crystals. Turquoise energy fragments contrast with coral hazards; scenery uses quiet blue shadows and warm golden clouds. Each actor cel depicts the complete character and vehicle, with no articulated parts or rig.

| File | Contract |
| --- | --- |
| `courier.webp` | 1024×1024 transparent sheet; four equal 512×512 cells in reading order: glide, thrust A, thrust B, release glide |
| `pillar.webp` | 160×445 transparent upright ruin, coral spikes at the top; flipped for overhead ruins |
| `mine.webp` | 192×193 transparent floating coral storm mine |
| `fragment.webp` | 192×287 transparent turquoise energy fragment |
| `cloud.webp` | 480×189 transparent cloud bank for three depth layers |
| `sky.webp` | 1536×1024 painted sky and distant ruins; mirrored adjacent tiles make continuous scenery |
| `checkpoint.webp` | 1024×1024 transparent sheet; four equal 512×512 complete winged-lantern cels in reading order: dormant, opening amber, activated turquoise, activated pulse |

The courier's stable anchor is near the vehicle center, with a common square cel footprint. Collision excludes cosmetic scarf/exhaust padding. `presentation.ts` owns footprints, role dimensions, anchors and clips. It validates the decoded assets before play and releases image sources with the session. Preserve those semantics when replacing artwork, and change physical geometry only through `content.ts` for a gameplay reason.

The original generated sheets were 1254×1254: four equal 627×627 cells. The courier was resized as a whole to 1024×1024. Object cells were extracted in reading order, trimmed to their alpha content and resized to their listed widths with aspect ratio preserved. The generated 1536×1024 sky was encoded at WebP quality 86; transparent runtime sprites use lossless WebP. All required runtime images live here. Regeneration should use the saved prompts, inspect complete silhouettes and alpha, then update local dimensions if necessary.

The checkpoint is an ivory-and-brass floating lantern with wing-shaped fins and a turquoise crystal. Its separate original 1254×1254 generated sheet was resized as a whole to 1024×1024 and encoded as lossless WebP, preserving alpha. Each 512-pixel cel draws in a 124-unit square with an anchor at 52% across and 48% down. On passing, the dormant cel opens to amber, blooms once on the pulse cel, then holds the steady turquoise cel. The pulse cel is not a loop. A reduced-motion view switches directly to the still activated cel. The lantern marks passage through the entire clear-air pocket; it has no collision body and does not require touching the illustration. A short ring on the lantern is the only activation effect. The `checkpoint` entry in `prompts.json` retains the complete creative prompt.

Follow the shared [Arcade artwork workflow](../../../../docs/arcade.md) for replacements and [canonical preview workflow](../../../../docs/architecture.md#collection-previews-and-site-identity) for the collection screenshot.

Deluxe has its own [Sunward Radiance artwork bundle](sunward-radiance/README.md), source illustrations and packing script. Arcade remains independently playable.
