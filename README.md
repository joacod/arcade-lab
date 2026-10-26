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

The Chromium checks combine input/lifecycle coverage with one complete playable round. There are no per-weapon browser suites or browser matrices.

## Play

Enter the clearing to start a **three-minute survival round** as the Keeper. **Spark fires automatically** at the nearest living crawler. Collect the green XP gems, choose upgrades, and keep moving until dawn. Other weapons unlock through level choices. A larger elite crawler arrives at two minutes.

Move with **WASD / arrows**, or press and drag inside the arena with a finger, pen, or mouse. The floating movement control has a dead zone and proportional strength. Release or cancel the pointer to stop. Diagonal movement is normalized.

Choose an upgrade with a click/tap, **arrows then Enter/Space**, or normal Tab focus. Choices pause all gameplay. Each earned level offers three distinct effective choices. Multiple earned choices queue in order, preserving excess XP. Release confirmation before the next choice or gameplay can resume. Manual pause is available after resolving choices.

**Escape / P** or **Pause** opens the pause menu. Resume, restart with a fresh Keeper, or return to the title. Victory and defeat show active survival time, health, level, kills, elite kills and combat statistics, with Retry and Return to title. Focus loss, leaving the application, and page hiding stop gameplay and clear held input. Resume is deliberate, including after completing a choice interrupted by focus loss. Keyboard movement belongs to the focused canvas; touch gesture suppression belongs to the canvas. Menus use HTML buttons and keyboard focus.

## Step 3 of 4

The complete reference gameplay is implemented with typed content and small TypeScript weapon functions. Step 2's rank-1-only weapon and no-XP/ordinary-only simplifications are removed. There are no runtime dependencies, saves, meta-progression, shops, extra objectives or score economy. The fuller presentation/audio pass remains Step 4.

Tuning lives in `src/content.ts`. The [pinned upstream design](https://github.com/joacod/godot-games/blob/2fc1de05248537b21cf9b9eed656ce877d3e1561/survivors/docs/DESIGN.md) remains the detailed gameplay reference. The adaptation includes:

- Spark, Halo, Pulse and Shard, each with three damage ranks and their distinct targeting, orbit/contact, radial activation and cardinal-burst behaviors. Fractional damage rounds up. Halo preserves each target's hit window across upgrades and orbit revolutions. Pulse hits only once per activation.
- One gem per death: 5 XP for crawlers and 50 for the elite. Attraction starts within pickup radius, persists after moving away, travels at 240 world units/s and collects within 12. Level costs start at 10 XP and increase by 5 each level.
- Deterministic upgrade priorities: one unowned weapon, Lens from level 3, eligible Spark ranks, then remaining eligible choices in authored order. Recovery, Power and Reach remain repeatable and effective after finite upgrades are exhausted. Recovery's unused healing becomes shield; Power adds rank-1 damage bonuses; Reach survives acquiring Lens.
- Immediate Arc Spark evolution with rank-3 Spark and Lens in either order. Evolution preserves slot, rank, cadence and other weapons, clears old Spark projectiles, and chains each new shot to at most three distinct living targets within its existing lifetime.
- Increasing ordinary spawn pressure, a 60-ordinary cap including pending entries, discarded capped slots, visible entry warnings and one elite at 120 seconds independent of that cap. The visible elite appears at the deadline with 240 HP, radius 18, speed 38, 20 contact damage and a harmless/invulnerable 0.7-second warning.
- A 180-active-second round. Shared contact immunity and shield apply before HP. Lethal final-tick contact takes precedence over victory. Outcomes stop attacks, entries and pickups, discard pending choices, and freeze the result. Retry reconstructs the whole run.

Intentional adaptation choices and reference details resolved from code:

- **Full-arena view:** the 960×640 arena still fits the canvas with letterboxing. Every entry is visible and warned, using the farthest safe edge. Offscreen unmarked entry under the reference's following camera does not occur. Seeded tie breaking from Step 2 is retained, whereas upstream picks the first farthest visible edge. The centered start (480, 320) remains instead of upstream's (430, 320); the initial crawler stays at (640, 320).
- **Evolution is automatic:** `upgrade_choices.gd` applies the recipe after either prerequisite is acquired. Although `arc_spark.tres` is an upgrade resource, it is never a fourth/manual choice. `weapon_rack.gd` and `projectile.gd` preserve the Spark slot, rank damage, cooldown and projectile lifetime, then retarget after each hit, with no chain distance limit. This adaptation follows that behavior.
- **Halo is an orbiting body:** its 36-unit orbit has an 8-unit collision radius and a three-second revolution, as defined by `orbit_attack.gd` and its scene. It is not a continuous damaging ring. Pulse samples its 72-unit activation circle once, including enemy body radii, as in `pulse_attack.gd`.
- **Warning safety:** upstream `enemy.gd` can report the entering elite as alive while health/collision is disabled. Here it is explicitly excluded from targeting as well as damage and contact until the warning ends, so no projectile is consumed against an invulnerable entry.
- **Tick boundaries:** the browser retains Step 2's swept projectile-radius collision and movement limited to remaining projectile lifetime. Upstream combines a center ray with cached area overlaps and expires before movement on its last tick. Drops/collections are resolved synchronously in the browser simulation, batching all same-tick gem XP before offering choices. Combat/outcome resolves before pickups so a terminal tick cannot open a stale upgrade panel.
- Original modest Canvas shapes show gems, orbit, radial pulses, projectiles, warnings and the labeled elite. There is no audio or imported art. Touch verification uses Chromium pointer input and touch emulation, not a physical device.

`pnpm check` covers movement/clock foundations, combat, spawn pressure, elite warning safety, queued progression and confirmation release, offered-only upgrade application, both evolution acquisition orders, repeatable modifiers/shield, distinct attacks, gem attraction, complete simulation wins/losses, immutable definitions and clean reset. Content validation reports field-specific invalid values and relationships before a run starts. The optional Chromium checks cover the session lifetime and a complete three-minute route through upgrades, evolution, the elite, results and Retry.

## Responsibilities

| Location | Owns |
| --- | --- |
| `src/browser/host.ts` | Owned root/canvas, backing resolution, resize observation, the single frame loop, listener lifetime, cleanup |
| `src/browser/viewport.ts` | Shared world-to-CSS transform and inverse pointer mapping |
| `src/browser/input.ts` | Physical keyboard/pointer input translated into movement actions, capture/cancellation, input clearing |
| `src/browser/clock.ts` | Fixed 60 Hz step, 100 ms elapsed clamp, at most five catch-up steps, timing reset |
| `src/game.ts`, `src/game-state.ts` | Run construction/state, movement, contact, spawning, active time, pause and outcomes; no browser dependencies |
| `src/progression.ts` | Gem attraction/collection, XP, queued choices, eligibility, upgrade application, evolution and confirmation-release state |
| `src/combat.ts`, `src/weapons.ts`, `src/weapons/` | Shared hits/targeting/projectile collision, cadence dispatch, and separately located Spark/Halo/Pulse/Shard behaviors |
| `src/content-validation.ts` | Small field and content-relationship checks before Start |
| `src/presentation.ts` | Clearing/actors/projectiles/warnings, facing and short effects; reads gameplay state and consumes explicit occurrences once |
| `src/ui.ts`, `src/style.css` | HTML title/pause/result menus, focus targets, authoritative-state HUD, controls, responsive presentation |
| `src/content.ts` | Readonly typed weapon/enemy/upgrade definitions, evolution recipe, run tuning and presentation definitions |
| `src/app.ts` | Composition, screen transitions, run replacement, suspension, session disposal |
| `src/main.ts` | Mount into `#app` and dispose on Vite hot reload |

`mountClearing(container)` returns an idempotent `dispose()`. Each mount owns its root, listeners through an AbortController, ResizeObserver, pointer capture, and animation scheduling. Dispose removes those resources and only its own root. Restart replaces run and presentation state while retaining the browser session, clearing objects, cooldowns, spawn schedule, held input and pending notifications. The simulation owns active, paused, choosing and finished status; the UI consumes the offered IDs and submits a selection. Composition translates physical confirmation release into a separate game action and clears movement between panels. Composition drains the simulation event list once per frame (across all fixed steps) and hands it to presentation. Effects age in active simulation time and draw calls never create gameplay occurrences. Paused or hidden time never becomes simulation catch-up time.

## Gameplay reference

Read-only reference: [Last Light Clearing in joacod/godot-games](https://github.com/joacod/godot-games/tree/2fc1de05248537b21cf9b9eed656ce877d3e1561/survivors).

Inspected commit: **`2fc1de05248537b21cf9b9eed656ce877d3e1561`**. Later steps should use this baseline unless deliberately updating it.

Step 1 inspected `survivors/README.md`, `docs/DESIGN.md`, `scripts/player_movement.gd`, `scenes/player.tscn`, `scenes/arena.tscn`, `data/characters/keeper.tres`, and `data/theme.tres`. This adaptation preserves the Keeper's speed, normalized movement, body radius, arena dimensions, and basic menu flow. It uses a browser-native lifecycle and a full-arena view rather than the reference's following camera. No Godot scenes, assets, tooling, or test suites were transplanted.

Step 2 also read the pinned `docs/DESIGN.md`, `data/run.tres`, `data/enemies/crawler.tres`, `data/weapons/spark.tres`, the character/enemy/run/spawn-phase/weapon data schemas, `scenes/run.tscn`, `scenes/enemy.tscn`, `scenes/attacks/projectile.tscn`, and the run, spawn director, enemy, health, weapon rack, projectile and player gameplay scripts. Rules/data informed this browser implementation; Godot architecture and tests were not copied.

Step 3 read the pinned design, all weapon/enemy/upgrade Resources and content schemas/validator, attack/enemy geometry, and `weapon_rack.gd`, `projectile.gd`, `orbit_attack.gd`, `pulse_attack.gd`, `xp_gem.gd`, `xp_progression.gd`, `upgrade_choices.gd`, `upgrade_menu.gd`, `enemy.gd`, `health.gd`, `spawn_director.gd`, `run.gd` and `main.gd`. The choices above record the behavior selected where documentation leaves implementation detail implicit or browser tick behavior differs.
