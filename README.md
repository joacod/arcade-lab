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
pnpm check
```

`check` runs strict type checking, focused Node simulation and foundation checks, and the production build locally. There are no CI workflows.

Browser checks are optional. Run them when changing input or lifecycle behavior:

```sh
pnpm exec playwright install chromium
pnpm check:browser
```

The two Chromium session tests cover lifecycle and input together, without screenshot or browser matrices.

## Play

Enter the clearing to start a **three-minute survival round**. Your **Spark fires automatically** at the nearest living crawler. Keep moving to avoid contact damage and survive until dawn. Move with **WASD / arrows**, or press and drag inside the arena with a finger, pen, or mouse. The floating movement control has a small dead zone and proportional strength. Release or cancel the pointer to stop. Diagonal movement is normalized.

**Escape / P** or **Pause** opens the pause menu. Resume, restart with a fresh Keeper, or return to the title. Victory and defeat show survival time, remaining health, kills, shots and damage, with Retry and Return to title. Focus loss, leaving the application, and page hiding pause the game and clear held input. Resume is deliberate. Keyboard movement belongs to the focused canvas; touch gesture suppression belongs to the canvas. Menus use normal HTML buttons and keyboard focus.

## Step 2 of 4

The movement foundation now has a complete basic survival loop: the Keeper, ordinary crawlers, rank-1 Spark, pursuit/contact damage, swept projectile hits, visible spawn warnings, increasing pressure, pause, victory/defeat, and fresh retry. Canvas shapes provide attack trails, hit flashes, crawler health bars and defeat rings. The HUD and result screens read simulation-owned time, health and statistics.

The baseline values live in `src/content.ts`:

| Content | Rules |
| --- | --- |
| Keeper | 100 HP, 150 world units/s, body radius 10 |
| Crawler | 20 HP, 45 world units/s, radius 11, 10 contact damage |
| Spark | Nearest living target, 10 damage, 0.7 s cadence, speed 300, lifetime 3 s, radius 4 |
| Contact immunity | Shared 0.7 s window across all touching enemies; persistent contact hurts again after it expires |
| Round | 180 active seconds; lethal contact on the final simulation step takes precedence over victory |
| Ordinary entries | Every 1 s, then 0.65 s from 60 s, then 0.4 s from 120 s; living enemies plus pending entries capped at 60; capped slots are discarded |

The entire 960×640 arena still fits the canvas with letterboxing. Physical radii are independent of art and CSS/backing resolution. New entries use the reference's farthest visible edge fallback, with a 0.7 s cross/ring warning and at least 160 units of separation when scheduled. Pending entries cannot move, take damage, be targeted or hurt the Keeper. Gameplay uses a run-owned seeded random stream (currently only to break equally distant entry ties), independent of presentation.

Temporary scope differences from the complete reference:

- **No progression yet:** Spark stays at rank 1. Deaths count as kills but produce no gems, XP, levels, upgrades or healing. There is no hidden XP balance. Kiting makes the round playable with the baseline weapon and spawn pressure; no combat values were boosted to replace upgrades. Progression and remaining weapons belong to Step 3.
- **Ordinary enemies only:** the reference's two-minute elite is deferred. The ordinary 120-second pressure increase remains.
- **Full-arena view:** all entries are visible and warned, rather than preferring unmarked offscreen entries under a following camera. The Step 1 centered start is retained (480, 320 rather than 430, 320); the initial crawler starts at the reference's (640, 320).
- Original modest Canvas presentation, with no audio, imported assets, saves or persistence. The fuller presentation pass belongs to Step 4. Touch is checked with Chromium pointer input and touch emulation, not a physical device.

`tests/combat.test.mjs` advances simulation directly, including complete winning and losing rounds without browser waits. Focused checks cover swept/overlapping hits, dead targets, one-time kills, nearest targeting, shared immunity, final-step outcome precedence, pause, retry, spawn phases/caps and warning safety. The optional Chromium checks retain the two combined input/lifecycle scenarios, including repeated restart, input clearing and disposal.

## Responsibilities

| Location | Owns |
| --- | --- |
| `src/browser/host.ts` | Owned root/canvas, backing resolution, resize observation, the single frame loop, listener lifetime, cleanup |
| `src/browser/viewport.ts` | Shared world-to-CSS transform and inverse pointer mapping |
| `src/browser/input.ts` | Physical keyboard/pointer input translated into movement actions, capture/cancellation, input clearing |
| `src/browser/clock.ts` | Fixed 60 Hz step, 100 ms elapsed clamp, at most five catch-up steps, timing reset |
| `src/game.ts` | Run-owned movement, health, targeting, attacks/hits, spawning, active time, statistics, pause and outcomes; no browser dependencies |
| `src/presentation.ts` | Clearing/actors/projectiles/warnings, facing and short effects; reads gameplay state and consumes explicit occurrences once |
| `src/ui.ts`, `src/style.css` | HTML title/pause/result menus, focus targets, authoritative-state HUD, controls, responsive presentation |
| `src/content.ts` | Readonly typed gameplay values and presentation definitions |
| `src/app.ts` | Composition, screen transitions, run replacement, suspension, session disposal |
| `src/main.ts` | Mount into `#app` and dispose on Vite hot reload |

`mountClearing(container)` returns an idempotent `dispose()`. Each mount owns its root, listeners through an AbortController, ResizeObserver, pointer capture, and animation scheduling. Dispose removes those resources and only its own root. Restart replaces run and presentation state while retaining the browser session, clearing objects, cooldowns, spawn schedule, held input and pending notifications. Composition drains the simulation event list once per frame (across all fixed steps) and hands it to presentation. Effects age in active simulation time and draw calls never create gameplay occurrences. Paused or hidden time never becomes simulation catch-up time.

## Gameplay reference

Read-only reference: [Last Light Clearing in joacod/godot-games](https://github.com/joacod/godot-games/tree/2fc1de05248537b21cf9b9eed656ce877d3e1561/survivors).

Inspected commit: **`2fc1de05248537b21cf9b9eed656ce877d3e1561`**. Later steps should use this baseline unless deliberately updating it.

Step 1 inspected `survivors/README.md`, `docs/DESIGN.md`, `scripts/player_movement.gd`, `scenes/player.tscn`, `scenes/arena.tscn`, `data/characters/keeper.tres`, and `data/theme.tres`. This adaptation preserves the Keeper's speed, normalized movement, body radius, arena dimensions, and basic menu flow. It uses a browser-native lifecycle and a full-arena view rather than the reference's following camera. No Godot scenes, assets, tooling, or test suites were transplanted.

Step 2 also read the pinned `docs/DESIGN.md`, `data/run.tres`, `data/enemies/crawler.tres`, `data/weapons/spark.tres`, the character/enemy/run/spawn-phase/weapon data schemas, `scenes/run.tscn`, `scenes/enemy.tscn`, `scenes/attacks/projectile.tscn`, and the run, spawn director, enemy, health, weapon rack, projectile and player gameplay scripts. Rules/data informed this browser implementation; Godot architecture and tests were not copied.
