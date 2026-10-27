# Arcade Lab

A playground for building small browser games and discovering useful reusable parts through complete games. Each game is a reason to explore an idea, play it, and find out which pieces deserve to grow.

**Last Light Clearing** is the first playable game: a little light, a crowded forest, and a survival round that lasts until dawn.

![Last Light Clearing in Close view: the Keeper uses Spark and Halo while crawlers approach and green XP gems lie nearby](docs/images/last-light-clearing.png)

## Play the clearing

Move the Keeper, collect green XP gems, and choose upgrades while weapons fire automatically. Spark starts your loadout; Halo, Pulse, and Shard bring different ways to hold back the crawlers. Combine the right upgrades to evolve Spark. A larger elite arrives late in the round.

Choose **Until dawn** for the original three-minute round or **Brief dusk** for a shorter 90-second challenge. **Lanternwood**, **Moonglass**, and the animated pixel-art **Ember Ruins** offer distinct appearances with the same physical rules. **Prism Garden** brings a sculpted stone arena, faceted creatures, and luminous crystals. **Ember Conservatory** puts the Ember pixel actors in the same lit garden. **Abyssal Bloom** turns the clearing into a living bioluminescent world, rendered procedurally with vgpu/WebGPU. Energy currents react to movement and combat, spectral organisms replace sprites, and the elite forms an unstable eclipse. Choose Classic, Rune, Glass, or Abyss interface styling independently, with an optional accent color. The locally installed CraftPix experiment **Mosslight** is available in development only; see [art setup and provenance](src/art/README.md). Procedural sound has mute and volume controls, and play continues with silhouettes or silence if artwork or audio cannot load.

The game fills the browser viewport. **Close view** follows the Keeper with larger characters and screen-edge warnings for distant entries and the elite. **Whole arena** fits the entire clearing. Change appearance, interface, accent, view, and sound in the title or pause menu; choose the round at the title. Selections last through retries and title transitions until reload. Visual changes preserve a paused run and require explicit Resume. The current scene stays visible while the new appearance prepares. If graphics fail, the game keeps a working appearance or restores Lanternwood silhouettes on the same paused run. “Match appearance” follows its default interface; an explicit interface choice survives appearance changes.

**Fullscreen** includes the arena, HUD, and menus when the browser supports it. Display changes and focus loss pause the action and clear held movement. Use **Resume** when ready. On short screens, scroll inside the menu to reach its settings; the game page stays fixed.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move while the arena has focus |
| Press and drag in the arena | Move with mouse, touch, or pen; release to stop |
| Escape / P / Pause | Pause; use Resume to continue |
| Click / tap an upgrade | Choose, then release to continue |
| Arrows + Enter / Space | Navigate and confirm an upgrade |
| Tab / Shift+Tab | Focus menu controls |
| Fullscreen / Exit fullscreen | Change display mode; browser Escape can exit |

## Run locally

Use **Node 24.x** (developed with **24.22.1**, recorded in `.node-version`) and **pnpm 12.15.0** (recorded in `package.json`).

```sh
git clone https://github.com/joacod/arcade-lab.git
cd arcade-lab
pnpm install
pnpm dev
```

Open the local URL printed by Vite. `pnpm build` creates `dist/`; `pnpm preview` serves the production build. `pnpm check` runs TypeScript, focused invariant tests, and the build.

For changes to input or browser lifecycle, also run the existing Chromium check:

```sh
pnpm exec playwright install chromium
pnpm check:browser
```

This is one private application/package. **Three.js and vgpu are its two runtime graphics dependencies**, loaded only when their appearances are selected. The other appearances use Canvas 2D. Abyssal Bloom needs WebGPU; if it cannot prepare, the current appearance stays playable. Device loss pauses the same run and restores Canvas. TypeScript, Vite, Playwright, Three.js types, and the matching WGSL build loader are development tools.

## Where to change things

| Area | Location |
| --- | --- |
| Gameplay and progression | `src/game.ts`, `src/combat.ts`, `src/progression.ts`, `src/weapons/` |
| Balance and round configurations | `src/content.ts` |
| Artwork and cosmetic values | `src/themes.ts`, `src/art-pack.ts`, `src/art/` |
| Camera and rendering | `src/view.ts`, `src/world-presentation.ts`, `src/presentation.ts`, `src/three/garden.ts`, `src/vgpu/` |
| Menus, HUD, interface skins | `src/ui.ts`, `src/interface.ts`, `src/style.css` |
| Browser integration | `src/browser/`; composition in `src/app.ts` |
| Sound | `src/sound.ts` |

Abyssal Bloom's semantic colors live in `themes.abyss.palette` in `src/themes.ts`. Its field speed, vein brightness, glow, resolution limits, and effect budgets live in `bloomTuning` in `src/vgpu/bloom.ts`; procedural shapes live in its WGSL files. A color variation only needs a palette object. Image-backed presets retain their authored sprites while palette colors drive their environment, energy, weapons, and feedback.

The existing browser suite includes two focused rendering checks. Default headless Chromium may lack a WebGPU adapter; that path verifies initialization failure retains the run and skips the GPU-only assertions. To exercise actual shader rendering, switching, cleanup, and native device loss on a WebGPU-capable Chromium installation:

```sh
pnpm check:browser --grep 'Abyss switching' --headed
pnpm exec vgpu check src/vgpu/field.wgsl --require-validation
pnpm exec vgpu check src/vgpu/organisms.wgsl --require-validation
```

Native shader validation also requires an available adapter. The Vite WGSL loader resolves and reflects both shader modules during every build.

## Explore further

Arcade Lab is an experiment, with game-specific behavior kept close to the game until actual reuse justifies extraction. There is room for more games and shared parts, guided by what proves useful in play.

Read the [architecture and ownership notes](docs/architecture.md), [gameplay reference and adaptation choices](docs/last-light-clearing.md), [contributor guidance](AGENTS.md), and [art provenance](src/art/README.md). Code is available under the [MIT license](LICENSE).
