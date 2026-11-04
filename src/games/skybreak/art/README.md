# Skybreak artwork

[Game presentations](../../../../docs/games/skybreak/README.md#theme-modes) | [Shared artwork workflow](../../../../docs/assets-themes.md)

Aurora Fleet’s editable SVG sheets live in `aurora-fleet/`; Orbital Foundry’s background specification and prompt live in [its artwork guide](orbital-foundry/README.md).

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

## Presentation ownership

`../themes.ts` maps Assets to `aurora-fleet.ts`. `../art-pack.ts` defines sprite rectangles, frame stride/timing, source rotation and visual footprints; `../assets.ts` validates the sheet layout. The [game guide](../../../../docs/games/skybreak/README.md#presentation-and-source-ownership) owns renderer composition; preparation follows the [shared replacement contract](../../../../docs/architecture.md#replacement-and-recovery).
