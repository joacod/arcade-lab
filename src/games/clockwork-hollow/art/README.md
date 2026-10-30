# Clockwork Hollow artwork

Normal is Verdant clockwork, drawn directly by `presentation.ts`. Assets is **Porcelain Bellgarden**, an original illustrated image treatment. Quality is **Lumen Conservatory**, original code-native copper-and-glass artwork. All three use the same simulation, camera and world transform.

## Creative direction

A small porcelain keeper with a coral ribbon explores a mechanical botanical sanctuary. Warm ivory landing rims and glazed tilework sit against ink-blue shadows. Rounded beetle crowns identify safe stomp surfaces, pointed coral teeth identify danger, and flower lanterns identify return points. Fine brass inlay and five-petal flowers repeat across the keeper, architecture and bells.

The aqueduct layers jade plants and ceramic spillways. The Emberworks replaces the greenery with rose-glazed kilns, grilles and brass pipework. The belfry uses indigo stone, leaded glass, hanging ornaments and a crescent moon. Scenery is deliberately quieter than the ivory keeper, platform edges and coral threats. No background feature is physical geometry.

## Committed images

All sheets are transparent SVG images with antialiased sampling. They are original Arcade Lab artwork distributed under the repository's [MIT license](../../../../LICENSE). They contain no remote images, fonts or other dependencies. Runtime loads the committed SVGs through the shared image owner; running the generator is unnecessary for development or production.

| Sheet | Layout and roles | Drawing contract |
| --- | --- | --- |
| `bellgarden/keeper.svg` | 512 × 80; eight 64 × 80 frames, facing right. Idle, four stride poses, ascent, descent, defeat | Sole anchor (32, 76). Draw 51.2 × 64 world units, mirror around the player's horizontal center. Ground gait follows observed travel; jumping follows vertical velocity. Reduced motion uses a still ground pose. |
| `bellgarden/beetle.svg` | 256 × 48; four 64 × 48 frames. Three walking poses, one disabled shell | Sole anchor (32, 43). Draw 51.2 × 38.4 units. Walk cycles at 10 frames per presentation second; disabled shells flatten. Mirror for facing. Reduced motion holds the first pose. |
| `bellgarden/objects.svg` | 1024 × 160; eight 128 × 160 cells. Dormant lantern, saved lantern, bell, arch, mote, thorns, vent mouth, foliage | Exact source rectangles live in `asset-art.ts`. Lanterns draw 80 × 100, bell 82 × 102, arch 152 × 190, motes 18 × 22 and foliage 44 × 55 units. Lantern bases align with the checkpoint's feet. Bell and arch are separate so the bell can swing. Thorns fill the authored hazard rectangle; vent mouths align with the bottom of the pressure column. |
| `bellgarden/terrain.svg` | 384 × 192; three 128-wide district columns in journey order. Body tile at y=0 (128 × 128), landing rim at y=128 (128 × 32) | Bodies repeat at 96 × 96, clipped to authored solids. Rims repeat at 96 × 24, with a continuous ivory line at the actual landing edge. Thin ledges retain their physical height. |
| `bellgarden/<district>-far.svg` | 960 × 640 for aqueduct, emberworks and belfry | Quiet silhouettes repeat horizontally at 16% camera displacement. |
| `bellgarden/<district>-near.svg` | 960 × 640 for the same districts | Decorated arches and district props repeat at 38% camera displacement. |

`asset-art.ts` owns decoded dimension validation, object rectangles and keeper pose selection. `asset-presentation.ts` owns image footprints, tiling, mirroring and scenery composition. Effects, signs, celestial marks, vent columns and their timing displays remain procedural. Existing semantic effects and reduced-motion behavior apply to both presentations. Source image dimensions never define collisions or routes.

## Editing and regeneration

Edit the geometric shapes, colors and compositions in `bellgarden/generate.mjs`, then run:

```sh
node src/games/clockwork-hollow/art/bellgarden/generate.mjs
```

Commit the updated SVG outputs alongside the generator. Keep frame anchors stable and update the local layout metadata when changing sheet dimensions or source rectangles. Inspect silhouettes and continuous landing edges at gameplay size, especially thin ledges, beetle crowns and thorn tips. The generator uses only Node built-ins and deterministic geometry.

## Lumen Conservatory

`quality-presentation.ts` is the editable source for Quality. It combines layered cathedral ribs, a mechanical waterwheel, copper pressure vessels and astronomical glass windows with mineral blockwork, bevelled brass landing bands and fine rivets. A glass-hearted keeper uses piston limbs, an inset visor and a saffron scarf. Rounded copper beetles, faceted motes, caged lanterns, engraved bells and pointed coral thorns share the same material language. Brightness is concentrated on the actor, true landing edges, objectives and active danger.

District colors belong to `themes.ts`; material gradients, cosmetic footprints and architectural geometry belong to the Quality drawing. Decorative geometry does not change collisions. Background layers are cached for the current district only, with bounded dimensions independent of display DPR. Changing districts, replacing Quality or disposing the session releases those buffers. No external images, fonts, graphics libraries or generation step are required. The original artwork is distributed under the repository's MIT license.

The session imports this drawing only when Quality is selected and validates it against the current run before releasing the previous artwork. Failed preparation keeps the working theme. Runtime drawing failure pauses and restores Normal. The existing presentation owns the camera, distance-driven gait, landing response and semantic sparks across all themes. Reduced motion suppresses wheel rotation, drifting lights, scarf flutter and decorative ground gait while retaining physical movement and pressure timing.
