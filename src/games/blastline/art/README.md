# Blastline artwork

[Game guide](../../../../docs/games/blastline/README.md) | [Shared artwork workflow](../../../../docs/assets-themes.md)

Iron coast uses original pixel-inspired SVG sprites under the repository's [MIT license](../../../../LICENSE). Teal Nova and ochre Bolt remain distinct from muted security uniforms and the broad tracked Bastion. Complete silhouettes and baked aim variants keep the renderer small. The industrial background and breakable terrain remain procedural.

| Image | Layout | Drawing contract |
| --- | --- | --- |
| `operators.svg` | 320 × 512, 64-square cels. Five columns: up, diagonal up, forward, diagonal down, down. Four rows per operator: idle, two steps, airborne. Nova precedes Bolt. | Right-facing, sole pivot (27, 60), 48-square world footprint including padding. Mirror the entire cel for facing. Aim selects a drawing; no arms or weapons rotate at runtime. Reduced motion holds idle during grounded travel. |
| `enemies.svg` | 192 × 192. Three columns: idle and two steps. Rows: guard, heavy, Bastion. | Complete right-facing figures; mirror at their world center. Bastion has a larger authored footprint. Hit flashes and target lines remain separate cues. |
| `objects.svg` | 512 × 64. Live relay, offline relay, barrel, dormant supply post, supplied post, rescue cage, then a double-width extraction aircraft. | Object rectangles and world footprints live in `presentation.ts`. Text labels remain separate. |

`../sprite-art.ts` defines image URLs, decoded-dimension checks and operator cel selection. `generate.mjs` preserves the editable whole-cel drawings and object illustrations. Regenerate with:

```sh
node src/games/blastline/art/generate.mjs
```

Every required output is committed. No missing Assets or Quality presentation is implied by this sprite set.
