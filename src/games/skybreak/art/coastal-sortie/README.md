# Coastal sortie artwork

[Skybreak](../../../../../docs/games/skybreak/README.md) | [Arcade workflow](../../../../../docs/arcade.md) | [Deluxe workflow](../../../../../docs/deluxe.md)

## Direction and functional composition

Aurora Fleet and Tempest Coast depict the same Pacific coastal operation. The ivory/petrol player with gold wing tips, orange scout, ochre twin-boom raider, plum heavy bomber, sage interceptor and steel-blue flying wing retain their identities across both modes. Aircraft are complete north-facing images, rotated south for enemies. The five silhouettes communicate the light straight formation, broad crossing attack, heavy trident bomber and narrow fast interceptor before their warning cells fill.

**Arcade · Aurora Fleet** uses richly shaded arcade pixels, hard sampling, an inked fleet, stepped reef shelves, stippled sea currents and compact supply badges. **Deluxe · Tempest Coast** repaints that fleet with dimensional metal, cockpit glazing, panel seams and worn wing markings. Higher-resolution supplies, turbine housings, reactor vanes and a dedicated fortress hull carry the same finish through the combat scene. Its painted shoals preserve the retro coast's setting and open-water route.

The world travels toward the bottom at 96 world units per active second in both modes. Offshore reefs pass along the margins, keeping the middle quiet for fire and evasion. Clouds beneath the combat layer pass faster, at 156 units/second, to establish altitude. These are decorative depths, never collision objects. All actors and warnings share the same uniform world projection. Scenery positions derive from active run time, so a paused theme change preserves travel position and Resume continues the existing sortie. Reduced motion freezes these layers while physical aircraft, bullets and semantic warnings keep working.

The fortress hull deliberately contains no glowing reactor or empty circular engine sockets. Independently moving, complete nacelle images follow `bossTargets` coordinates. Their turbine detail stays visible beneath a translucent cue, with the central reactor and attack warnings drawn above the hull. Do not bake targets, muzzle warnings, ammunition or supplies into scenery or decorative armor. A detailed static scenic vista is unsuitable for this scrolling flight mechanic.

## Image contracts

AI-generated source illustrations and retained prompts live here. Original artwork is distributed with the repository's [MIT license](../../../../../LICENSE). `prompts.json` describes the two fleets and coast; `fortress-prompt.txt` describes the corrected hulls. The source fleet images are 1448 × 1086 with inspected, irregular rectangles recorded in `pack.mjs`. Do not infer equal source grid cells: the original fortress is wider than its nominal cell. That original hull is omitted from the packed atlas in favor of `fortress-source.png`.

| Output | Dimensions | Treatment |
| --- | --- | --- |
| `assets-fleet.png` | 384 × 288 | Twelve 96-square slots, nearest-neighbor runtime sampling |
| `quality-fleet.png` | 1024 × 768 | Twelve 256-square slots, smooth runtime sampling |
| `assets-fortress.png` | 288 × 96 | Complete separate retro hull |
| `quality-fortress.png` | 768 × 256 | Complete separate painted hull |
| `reef-route.svg` | 480 × 1600 | Editable pixel reef route, seamless vertical repetition |
| [Deluxe coast](../tempest-coast/) | 1024 × 1536 | Painted repeat with an 80-unit incoming-edge overlap |

The packed fleet uses four columns and three rows. In reading order: player, scout, raider, bomber; interceptor, unused original-hull slot, Power, Spread; Repair, nacelle, reactor, cloud. Each illustration is trimmed only for transparent padding and centered inside its slot. The source art remains complete, without cut-up actor parts. `../aircraft.ts` owns rectangles and footprints. Aircraft use 72 / 62 / 78 / 88 / 72 square world footprints, with transparent padding preserving their illustrated proportions. The fortress's full 3:1 frame uses a 408 × 136 footprint. Supplies use 44-square frames; the nacelle, reactor and cloud use 84, 64 and 96. Frame centers are stable pivots, independent of physical circles.

The fleet drawings are single cels with painted propeller discs. Whole-sprite banking and roll follow the observed aircraft state. Offset cast shadows establish height; cloud travel supplies scene motion. Protection, charge filling, live weak-point movement and impact flashes remain semantic overlays rather than alternative collision geometry.

`reef-route.mjs` owns the pixel scenery source. `../../scenery.ts` computes wrapped tile placements; the Canvas owner caches the painted tile's incoming alpha ramp once at source resolution, blends it over the preceding tile, and releases the buffer on disposal. No scenery buffer grows with flight distance. Frame and scenery dimensions are validated together before a candidate can replace the working presentation.

## Editing and export

Update the complete illustrations or source rectangles, then regenerate the committed bundles:

```sh
node src/games/skybreak/art/coastal-sortie/pack.mjs
node src/games/skybreak/art/coastal-sortie/reef-route.mjs
node src/games/skybreak/art/tempest-coast/pack.mjs
```

The atlas exporter uses local Chromium for alpha-aware trimming and image resampling. Keep generated sources and committed outputs together. These commands prepare artwork; the running game never depends on generation services or export tools.
