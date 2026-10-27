# Arcade Lab

A personal workshop for creating small, beautiful, fun browser games with our own evolving browser-native game engine. Complete, enjoyable games and a better internal engine are complementary goals.

The collection starts with survival/action and vertical shooting, with room for platformers, beat 'em ups and other arcade genres. Over time, established game foundations should make it faster to create a focused game: choose a game type, give a coding agent the desired theme, artwork, assets, story and gameplay requirements, and adapt the foundation. This is one private application, with an internal engine serving its games.

Choose a game from the collection screen. **Game selection** in its title, pause or result menu returns to the collection; each visit starts an independent session. The application fills the browser viewport, with menus scrolling inside the game. Last Light Clearing also exposes **Fullscreen** for the arena, HUD and menus when supported by the browser.

## Last Light Clearing

![Last Light Clearing in Close view: the Keeper uses Spark and Halo while crawlers approach and green XP gems lie nearby](docs/images/last-light-clearing.png)

Move the Keeper through a crowded forest, collect XP gems and choose upgrades while weapons fire automatically. Spark, Halo, Pulse and Shard offer different ways to survive, with a Spark evolution and a late elite encounter. Survive **Until dawn** for three minutes or try the 90-second **Brief dusk** round.

Choose SVG, animated pixel, sculpted Three.js or procedural WebGPU appearances with the same gameplay rules. Appearance, interface, accent, Close/Whole arena view and sound settings are available at title or pause; round selection is at title. Settings persist through retries until reload. Appearance changes retain the paused run and require Resume. Failed artwork/audio can fall back to silhouettes/silence; unavailable graphics retain a working appearance or restore Canvas.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Hold and drag in the arena | Move with mouse, touch or pen; release to stop |
| Escape / P / Pause | Pause; use Resume to continue |
| Click / tap, or arrows + Enter / Space | Choose an upgrade, then release to continue |
| Tab / Shift+Tab | Focus menu controls |
| Fullscreen / Exit fullscreen | Change display mode |

See [Clearing gameplay and visual settings](docs/last-light-clearing.md) and [art setup and provenance](src/art/README.md), including the development-only CraftPix experiment.

## Skybreak

![Skybreak: upgraded forward and spread fire face the Iron Tempest fortress above the ocean](docs/images/skybreak.png)

Fly a 2–3 minute ocean sortie through fifteen formations to **Iron Tempest**, an armored flying fortress with three telegraphed attack patterns. Collect Power, temporary Spread and Repair supplies. Three lives and a rechargeable evasive roll help you reach the boss and earn a survival bonus. Original procedural Canvas artwork and synthesized sound require no downloaded art or audio.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Steer |
| Space / J | Hold to fire |
| Shift / K / Roll button | Evade; recharges between rolls |
| Hold and drag on the playfield | Steer and fire with touch, mouse or pen; release to stop |
| Escape / Pause | Pause; use Resume flight to continue |

The portrait playfield scales uniformly and stays centered. Roll supports a second touch while steering. Both games pause and clear held input on focus loss or display changes, and restart with fresh gameplay state. Sound can be muted, and unavailable audio never prevents play. See [Skybreak gameplay](docs/skybreak.md) for pickups, boss patterns and tuning.

## Run locally

Use **Node 24.x** (developed with **24.22.1**, recorded in `.node-version`) and **pnpm 12.15.0** (recorded in `package.json`).

```sh
git clone https://github.com/joacod/arcade-lab.git
cd arcade-lab
pnpm install
pnpm dev
```

Open the local URL printed by Vite. `pnpm build` creates `dist/`; `pnpm preview` serves the production build. `pnpm check` runs TypeScript, focused invariant tests and the build.

For changes to input or browser lifecycle, also run the existing Chromium check:

```sh
pnpm exec playwright install chromium
pnpm check:browser
```

## Technologies and documentation

TypeScript and Vite support the application. Canvas 2D renders Skybreak and several Clearing appearances; Three.js and vgpu/WebGPU power Clearing's lazy-loaded garden and Abyssal Bloom presentations. A game uses the renderer or renderers that suit it. Abyssal Bloom needs WebGPU; an unavailable adapter leaves the working appearance playable. Current sound uses the shared Web Audio voice owner. [AudioBits](https://github.com/joacod/audiobits) is installed and selected for procedural audio integration in the next implementation pass.

- [Architecture and source map](docs/architecture.md): current ownership, rendering, shared infrastructure and focused verification, including WebGPU checks.
- [Development guidance](AGENTS.md): durable architectural principles, dependency policy and verification scope.
- [Two-game review](docs/two-game-review.md) and [earlier foundation review](docs/foundation-review.md): historical reuse decisions, experiments and measurements.

Code is available under the [MIT license](LICENSE).
