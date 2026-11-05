# Clockwork Hollow artwork

[Game presentations](../../../../docs/games/clockwork-hollow/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

Normal and Assets use original transparent SVG actor and object sheets. Quality uses AI-generated raster actor cels with the shaded SVG object sheet. The artwork is distributed with this repository under its [MIT license](../../../../LICENSE).

## Creative direction

### Assets · Porcelain Bellgarden

An illustrated retro adventure through a mechanical botanical sanctuary. A round ivory keeper with a coral scarf and turquoise glass heart explores glazed ruins. Use confident ink contours, a small set of flat material tones, brass inlay and restrained five-petal ornaments. Tall arches and a broad waterwheel frame the aqueduct; rose kilns and pipes frame the Emberworks; an indigo rose window frames the belfry. Background silhouettes use quieter values than the keeper, pale landing rims and coral threats. Keep tile ornament sparse and architecture large enough to establish depth without turning every surface into a bright outline.

### Quality · Lumen Conservatory

Reinterpret the same porcelain keeper, coral scarf, flower lanterns and botanical machinery as dimensional ceramic, aged brass and luminous glass. Preserve the sanctuary and cast from Assets. The keeper is a pre-rendered miniature with a spherical ivory helmet, recessed curved teal visor, mint eyes, a turquoise heart and sturdy rounded boots. Worn glaze, painted botanical sprigs, brushed brass rims, contact shading and a soft warm key light establish volume in the artwork itself. The coral scarf stays part of each full-body cel. Beetles share the ceramic, botanical and brass treatment: broad jade-ivory domes with a coral enamel band, brass rivets, a winding key and six short feet. Their spent cel lowers the cracked crown and retracts the feet. Lantern glass sits inside a shaded metal cage; bells have a reflective body, dark open mouth and separate clapper. Faceted motes, bevelled vent grilles and shaded thorn teeth carry the material treatment through interactive objects.

Layered cathedral ribs, mineral masonry, copper landing bands, ferns and monumental machinery give the world depth. Fine highlights and shadowed edges describe material thickness below each actual landing surface. Slow parallax, a turning aqueduct wheel and broad shafts of light establish scale. These layers stay behind the route and its warnings. Use Canvas 2D with complete image cels and cached architectural layers; volume comes from the artwork and material drawing.

### Motion and functional appearance

- Complete keeper cels include idle, eight sequential stride cels, ascent, descent and defeat. Keep the sole anchor fixed. Ground travel advances the full cycle forward, independently of frame rate, without reversing half the poses or adding a whole-sprite vertical bob. Small velocity lean and brief landing compression pivot at the feet. The scarf belongs to the authored cel.
- Beetle steps follow distance travelled, including patrol reversals. Their spent shell has its own low contour, without another runtime flattening. Rounded crowns remain distinct from pointed thorns.
- Landing lips follow authored geometry continuously. Decorative plants sit below rims, and architectural details stay behind the gameplay layer. Lanterns, bells and motes remain separate from scenery so their live state remains readable. Preserve explicit pressure-column boundaries, warning silhouettes and countdowns.
- Reduced motion uses a still grounded stance and removes decorative lean, compression, swing and drift. Airborne poses and physical movement still communicate play. Shared presentation timing belongs to the [appearance contract](../../../../docs/architecture.md#appearance-changes).

## Committed images

Normal uses the `-normal` brass variants of keeper, beetle and objects. Quality uses `lumen/keeper.png`, `lumen/beetle.png` and `bellgarden/objects-quality.svg`. Assets uses the unsuffixed porcelain sheets and the illustrated terrain and scenery. The modes share semantic frame order while keeping independent image resolution, anchors and draw footprints in `asset-art.ts`. Keeper cels are complete connected figures.

All sheets use antialiased sampling. `bellgarden/generate.mjs` owns the SVG sources. Quality’s retained source sheets, production prompts and atlas preparation live in `lumen/`; runtime loads only the packed images and never the source sheets.

| Sheet | Layout and roles | Drawing contract |
| --- | --- | --- |
| `bellgarden/keeper.svg` | 768 × 80; twelve 64 × 80 frames, facing right. Idle, eight sequential stride poses, ascent, descent, defeat | Sole anchor (32, 76). Draw 57.6 × 72 world units, mirror around the player's horizontal center. Ground gait follows observed travel; jumping follows vertical velocity. Reduced motion uses a still ground pose. |
| `lumen/keeper.png` | 2304 × 240; twelve 192 × 240 complete cels in the same semantic order | Sole anchor (96, 228), draw 64 × 80 world units. Orthographic right-facing three-quarter view, mirrored for left. The ascent cel tucks its boots above the anchor; the defeated cel slumps naturally without another rotation. |
| `lumen/beetle.png` | 768 × 144; four 192 × 144 complete cels: three patrol poses and the spent shell | Sole anchor (96, 132), draw 51.2 × 38.4 world units. Preserve the broad domed stomp silhouette, direction mirroring and distance-driven patrol cels. |
| `bellgarden/beetle.svg` | 256 × 48; four 64 × 48 frames. Three walking poses, one disabled shell | Sole anchor (32, 43). Draw 51.2 × 38.4 units. Three walking poses cycle by observed position; the fourth cel is an already compressed spent shell. Mirror for facing. Reduced motion holds the first pose. |
| `bellgarden/objects.svg` | 1024 × 160; eight 128 × 160 cells. Dormant lantern, saved lantern, bell, arch, mote, thorns, vent mouth, foliage | Exact source rectangles live in `asset-art.ts`. Lanterns draw 80 × 100, bell 82 × 102, arch 152 × 190, motes 18 × 22 and foliage 44 × 55 units. Lantern bases align with the checkpoint's feet. Bell and arch are separate so the bell can swing. Thorns fill the authored hazard rectangle; vent mouths align with the bottom of the pressure column. |
| `bellgarden/terrain.svg` | 384 × 192; three 128-wide district columns in journey order. Body tile at y=0 (128 × 128), landing rim at y=128 (128 × 32) | Bodies repeat at 96 × 96, clipped to authored solids. Rims repeat at 96 × 24, with a continuous ivory line at the actual landing edge. Thin ledges retain their physical height. |
| `bellgarden/<district>-far.svg` | 960 × 900 for aqueduct, emberworks and belfry | Quiet silhouettes repeat horizontally at 12% camera displacement. |
| `bellgarden/<district>-near.svg` | 960 × 900 for the same districts | Decorated arches and district props repeat at 32% camera displacement. |

`asset-art.ts` owns decoded-dimension validation, object rectangles and keeper pose selection. `asset-presentation.ts` owns footprints, tiling, mirroring and scenery composition. Quality’s thorn frame contains two complete 64 × 56 copper teeth with brass sockets; alternate these cells across each hazard at approximately their native proportions, with the mounting rail entirely inside the authored rectangle. Lantern artwork has its visible sole at source y=156, independently of the 160-pixel cell height. Signs, celestial marks, vent columns and timing displays remain procedural. Sign `groundY` values in `content.ts` name the supporting surface; keep plaques clear of raised solids and foreground interaction cues.

## Editing and regeneration

Edit the geometric shapes, colors and compositions in `bellgarden/generate.mjs`, then run:

```sh
node src/games/clockwork-hollow/art/bellgarden/generate.mjs
```

For the raster actors, `lumen/keeper-source.png` is a 1254 × 1254 four-column, three-row sheet, and `lumen/beetle-source.png` is a 1254 × 1254 two-column, two-row sheet. `lumen/pack.mjs` crops complete cels, resamples them uniformly and packs horizontal strips while preserving their alpha. It uses fixed per-family camera and sole anchors, leaving the jump tuck and defeat slump intact. The [retained prompts](lumen/prompts.md) describe the character identity, materials and action layout. After editing or replacing source drawings, inspect alignment and update packing measurements as needed, then run:

```sh
node src/games/clockwork-hollow/art/lumen/pack.mjs
```

Inspect continuous landing edges, thin ledges, beetle crowns and thorn tips at gameplay size. The generator uses only Node built-ins and deterministic geometry; follow the [shared source-retention and layout workflow](../../../../docs/assets-themes.md#preserve-the-direction-and-assess-the-result) when committing changes.

## Lumen Conservatory

`../quality-presentation.ts` is the editable source for Quality’s architectural drawing, material gradients and cached background layers. Its actors, lanterns, bells, motes and hazards use the committed complete sprites through `asset-presentation.ts`. The `materials` definitions and Quality object drawings in `bellgarden/generate.mjs` own the SVG surfaces; the raster actor treatment is defined above. District colors live in `../themes.ts`; the [game guide](../../../../docs/games/clockwork-hollow/README.md) describes cache and replacement ownership.
