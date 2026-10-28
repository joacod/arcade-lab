# Skybreak artwork

`cover.svg`, Pacific Run's aircraft and ocean, Deep Space's ships, space scenery, fortress armor, combat warnings and effects are original Arcade Lab artwork under the repository's MIT license. The local Starfall Fleet installation supplies the Assets mode. All appearances use the same simulation, collision geometry, formations, supply schedule and fortress weak points.

## Appearance ownership

`../themes.ts` maps Normal to Pacific Run and Assets to the installed Starfall Fleet definition. Quality remains unavailable. `../art-pack.ts` defines sprite rectangles, frame stride and timing, source rotation and authored visual footprints. These values never determine physical geometry. `../assets.ts` loads and validates the entire selected bundle before it replaces the active appearance. A failed selection retains the old images and current run. New selections and session disposal invalidate pending work and release image sources.

`pixel-fleet.ts` maps semantic aircraft roles to inspected source frames. The fighter and corvette move sheets are each 1152×192, with six 192×192 frames. The manifest excludes transparent padding using explicit rectangles and rotates right-facing sprites upward. Enemy roles use Ship2 through Ship5 from the enemy pack, each on a 128×128 image. They remain visually distinct. Enemy engine light, impact glow, projectiles and the fortress's side armor/reactors are application-drawn. The corvette decorates the central flagship hull; its image does not move the three physical targets. Reduced motion freezes sprite animation alongside the existing cosmetic motion rules.

## Selected free assets

Downloaded through the account's browser on 2026-10-28:

| Source | Selection and fit |
| --- | --- |
| [Free Spaceship Pixel Art Sprite Sheets](https://craftpix.net/freebies/free-spaceship-pixel-art-sprite-sheets/) | The strongest player-ship choice: coherent red fighter, white bomber and larger corvette, with engine animation. Assets uses the red fighter; the inspected bomber is an alternative source for future art edits. The corvette supplies flagship detail. |
| [Free Pixel Art Enemy Spaceship 2D Sprites](https://craftpix.net/freebies/free-pixel-art-enemy-spaceship-2d-sprites/) | Distinct silhouettes suit Skybreak's four enemy roles. Selected complete ship images avoid coupling gameplay to Spriter body-part animation. |
| [Free Space Shooter Game Objects](https://craftpix.net/freebies/free-space-shooter-game-objects/) | Useful for a smooth/vector theme, but its vector finish differs from the selected pixel fleet. Current pickup symbols remain legible and consistent across appearances. |
| [Free Space Shooter Game GUI](https://craftpix.net/freebies/free-space-shooter-game-gui/) | A comprehensive vector interface, but adopting its window artwork would conflict with the pixel fleet and duplicate the existing accessible menu controls. |

Space scenery is authored for the portrait playfield: a cached nebula/planet layer, depth-separated stars, distant orbital stations. Keeping it subdued preserves the contrast of hostile rounds, supplies and boss warnings. Horizontal landscape backdrops are a poor fit for this continuously scrolling vertical field.

### Archive provenance

Author: **CraftPix**. License: [CraftPix File Licenses, section 2: Freebie Products](https://craftpix.net/file-licenses/). Preserve that license rather than treating the images as MIT artwork.

- Player/flagship archive: `craftpix-net-757069-free-spaceship-pixel-art-sprite-sheets.zip`, SHA-256 `862c7ecc170242850fa418dbd90b87f1711a31ed190919090e88bacb98f7a943`.
- Enemy archive: `craftpix-991101-free-pixel-art-enemy-spaceship-2d-sprites.zip`, SHA-256 `a2f1ccb0d2e73abcb5cb00451bc260c4fa8ae365112350e4448f1108f384dde7`.
- Selected PNGs are copied unchanged. The supplied `Licens.txt` / `License.txt` point to the license URL above. Rectangles, rotations, timing, footprints, role mapping and scene composition are authored locally.

Follow the repository's existing restricted-artwork convention: downloads and the activation manifest live in ignored `local-art/`. Do not add raw images, archives or PSD files to the shareable source tree. Development can use the local installation; production builds use the empty `../local-skybreak.ts`, so only Normal is available.

## Reproduce the local installation

Download the two archives above through CraftPix. Copy these files unchanged:

| Archive path | Local path under `local-art/skybreak/` |
| --- | --- |
| `Fighter/Move.png` | `ships/fighter/move.png` |
| `Corvette/Move.png` | `ships/corvette/move.png` |
| `PNG_Parts&Spriter_Animation/Ship2/Ship2.png` | `enemies/ship2.png` |
| `PNG_Parts&Spriter_Animation/Ship3/Ship3.png` | `enemies/ship3.png` |
| `PNG_Parts&Spriter_Animation/Ship4/Ship4.png` | `enemies/ship4.png` |
| `PNG_Parts&Spriter_Animation/Ship5/Ship5.png` | `enemies/ship5.png` |

Create `local-art/skybreak.ts`:

```ts
import { createPixelFleet } from '../src/games/skybreak/art/pixel-fleet.ts';
export default createPixelFleet({
  fighter: new URL('./skybreak/ships/fighter/move.png', import.meta.url).href,
  corvette: new URL('./skybreak/ships/corvette/move.png', import.meta.url).href,
  scout: new URL('./skybreak/enemies/ship2.png', import.meta.url).href,
  raider: new URL('./skybreak/enemies/ship3.png', import.meta.url).href,
  gunship: new URL('./skybreak/enemies/ship4.png', import.meta.url).href,
  interceptor: new URL('./skybreak/enemies/ship5.png', import.meta.url).href,
});
```

Restart `pnpm dev` after adding the manifest. The Starfall definition fills the single Assets slot; extra local variants do not add menu options. Vite substitutes only this game's exact local import in development. No account credentials, store connection or asset-download logic ships with the game.
