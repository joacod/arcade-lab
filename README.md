# Arcade Lab

A small browser application for experimenting with game architecture through actual play. Its first game is **Last Light Clearing**. One private package, strict TypeScript, Vite, HTML/CSS, and Canvas 2D. No runtime dependencies.

## Run

Use Node **24.x** (developed with **24.22.1**, recorded in `.node-version`) and **pnpm 12.15.0** (`packageManager` in `package.json`).

```sh
pnpm install
pnpm dev
```

Open the printed local URL. `pnpm build` produces `dist/`; `pnpm preview` serves that build.

```sh
pnpm exec playwright install chromium
pnpm check
```

`check` runs strict type checking, three focused Node invariant tests, the production build, and two Chromium session tests. The one CI job runs the same command after installing Chromium and its system dependencies. Browser tests cover lifecycle and input together, without screenshot or browser matrices.

## Play

Enter the clearing to start. Move with **WASD / arrows**, or press and drag inside the arena with a finger, pen, or mouse. The floating movement control has a small dead zone and proportional strength. Release or cancel the pointer to stop. Diagonal movement is normalized.

**Escape / P** or **Pause** opens the pause menu. Resume, restart with a fresh Keeper, or return to the title. Focus loss, leaving the application, and page hiding pause the game and clear held input. Resume is deliberate. Keyboard movement belongs to the focused canvas; touch gesture suppression belongs to the canvas. Menus use normal HTML buttons and keyboard focus.

## Step 1

This step implements a playable movement arena, original forest/lantern shapes, a title screen, active-time HUD, pause/resume, restart, return to title, and application cleanup. The Keeper moves at 150 world units/second with a radius of 10 inside a 960×640 arena. The entire arena fits the available canvas with letterboxing. CSS size and backing resolution do not affect physical geometry or movement.

There are no enemies, weapons, damage, XP, upgrades, audio, saves, or win/loss conditions in this step. Touch behavior is verified through Chromium pointer input and touch emulation, not a physical device.

## Responsibilities

| Location | Owns |
| --- | --- |
| `src/browser/host.ts` | Owned root/canvas, backing resolution, resize observation, the single frame loop, listener lifetime, cleanup |
| `src/browser/viewport.ts` | Shared world-to-CSS transform and inverse pointer mapping |
| `src/browser/input.ts` | Physical keyboard/pointer input translated into movement actions, capture/cancellation, input clearing |
| `src/browser/clock.ts` | Fixed 60 Hz step, 100 ms elapsed clamp, at most five catch-up steps, timing reset |
| `src/game.ts` | Fresh run state, player movement, elapsed simulation time, arena containment; no browser dependencies |
| `src/presentation.ts` | Specific clearing/player drawing and facing state; reads gameplay state |
| `src/ui.ts`, `src/style.css` | HTML menus, focus targets, HUD, controls, responsive presentation |
| `src/content.ts` | Readonly typed gameplay values and presentation definitions |
| `src/app.ts` | Composition, screen transitions, run replacement, suspension, session disposal |
| `src/main.ts` | Mount into `#app` and dispose on Vite hot reload |

`mountClearing(container)` returns an idempotent `dispose()`. Each mount owns its root, listeners through an AbortController, ResizeObserver, pointer capture, and animation scheduling. Dispose removes those resources and only its own root. Restart replaces run and presentation state while retaining the browser session. Paused or hidden time never becomes simulation catch-up time.

## Gameplay reference

Read-only reference: [Last Light Clearing in joacod/godot-games](https://github.com/joacod/godot-games/tree/2fc1de05248537b21cf9b9eed656ce877d3e1561/survivors).

Inspected commit: **`2fc1de05248537b21cf9b9eed656ce877d3e1561`**. Later steps should use this baseline unless deliberately updating it.

Inspected `survivors/README.md`, `docs/DESIGN.md`, `scripts/player_movement.gd`, `scenes/player.tscn`, `scenes/arena.tscn`, `data/characters/keeper.tres`, and `data/theme.tres`. This adaptation preserves the Keeper's speed, normalized movement, body radius, arena dimensions, and basic menu flow. It uses a browser-native lifecycle and a full-arena view rather than the reference's following camera. No Godot scenes, assets, tooling, or test suites were transplanted.
