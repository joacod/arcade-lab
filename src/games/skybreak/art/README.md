# Artwork and visual definitions

Skybreak combines procedural scenery, editable SVG sprites, 3D models and an AI-generated orbital background. All artwork ships with the game. Normal, Assets and Quality use the same simulation, collision geometry, formations, supply schedule and fortress weak points in development and production.

## Aurora Fleet

The Assets presentation uses six transparent SVG sprite sheets in `aurora-fleet/`. Their generator builds editable geometric paths and colors for each role.

The ivory/teal player has paired swept wings, a narrow canopy and animated twin drives. The hostile fleet shares layered gunmetal armor, with distinct amber forked scouts, coral crescent raiders, violet twin-boom gunships and needle interceptors. The broad flagship supplies the fortress hull; existing procedural turrets, reactor and attack telegraphs remain above it. The original planet, orbital structures, pickups, projectiles, effects and accessible UI complete the presentation without another image pack.

| Sheet | Frame size | Frames | Role |
| --- | --- | --- | --- |
| `fighter.svg` | 64 × 80 | 6 | Player and movement exhaust |
| `scout.svg` | 64 × 64 | 6 | Straight formation |
| `raider.svg` | 64 × 64 | 6 | Crossing formation |
| `gunship.svg` | 64 × 64 | 6 | Swooping formation |
| `interceptor.svg` | 64 × 64 | 6 | Interceptor |
| `flagship.svg` | 336 × 168 | 6 | Iron Tempest hull and drives |

Frames face north, advance horizontally at 0.09 seconds per frame and freeze at the first frame for reduced motion. The renderer turns enemies and the flagship south; player banking and evasive-roll animation remain cosmetic transforms. To edit the source drawings and regenerate the committed sheets:

```sh
node src/games/skybreak/art/aurora-fleet/generate.mjs
```

Generation is an artwork maintenance step. Running or building the game never requires it.

## Presentation ownership

`../themes.ts` maps Normal to Pacific Run and Assets to `aurora-fleet.ts`. Quality maps to Orbital Foundry, with editable models and an AI-generated background. See [its artwork template and prompt](orbital-foundry/README.md). `../art-pack.ts` defines sprite rectangles, frame stride and timing, source rotation and authored visual footprints. These values never determine physical geometry. `../assets.ts` reuses the shared image loader and validates every frame before replacing the active appearance. A failed selection retains the working images and current run. New selections and session disposal invalidate pending work and release image sources.

Commit replacement art with its role mappings and useful generation or editing instructions. Define its image URLs and roles in the game, preserving the same appearance preparation and ownership boundaries.
