# Sunward Radiance

Original AI-generated artwork, distributed under the repository's [MIT license](../../../../../LICENSE). No third-party assets are incorporated. The [prompts](prompts.json), original PNG sources and [packing script](pack.mjs) preserve the artwork for further adaptation. The [game guide](../../../../../docs/games/cloudwake/README.md#deluxe--sunward-radiance) owns the art direction.

## Runtime roles

| File | Contract |
| --- | --- |
| `courier.webp` | 1024×1024 transparent sheet, four 512×512 complete rider-and-scooter cels: glide, thrust A, thrust B, release |
| `checkpoint.webp` | 1024×1024 transparent sheet, four 512×512 whole lantern cels: dormant, opening amber, turquoise active, bright pulse |
| `pillar.webp` | 192×480 transparent ivory-and-brass ruin with coral crystal crown at its top, inverted for overhead ruins |
| `mine.webp` | 256×256 transparent coral-crystal storm mine in a brass gyroscope cage |
| `fragment.webp` | 192×288 transparent turquoise crystal with a gold collar |
| `cloud.webp` | 640×252 transparent cream-and-blue cloud bank |
| `sky.webp` | 1536×1024 quiet sky above distant ivory terraces, mirrored in adjacent scrolling tiles |

The courier draws in a 90-unit square with a stable anchor at 58% across and 52% down. This registers the rider and scooter to the existing pickup silhouette without changing gameplay geometry. Held thrust uses the first thrust cel as a steady pose, with exhaust trails providing motion. The alternate thrust cel remains in the source sheet. The lantern shares Arcade's 124-unit footprint and anchor; its pulse is a single checkpoint response rather than a repeating animation.

## Repacking

Run `node src/games/cloudwake/art/sunward-radiance/pack.mjs` from the repository root. Courier and lantern sources are 1254×1254 and are resized as complete sheets, preserving cel pivots. The 1263×1245 object source uses explicit extraction rectangles because the cloud extends beyond its nominal quadrant. Objects are trimmed to alpha, resized to their runtime footprints and encoded as lossless WebP. The 1536×1024 scenery is encoded at WebP quality 88. Originals retain transparency and are never required by the browser.

`deluxe-art.ts` owns the lazy URL bundle and decoded dimension contract. `presentation.ts` owns visual footprints and cels, uses the same uniform projection for both themes and bounds the backing buffer to DPR 2. Required art preparation, cancellation and recovery follow the [shared presentation workflow](../../../../../docs/architecture.md#replacement-and-recovery).
