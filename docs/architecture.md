# Architecture and ownership

Arcade Lab is one private application with no runtime dependencies. Keep behavior specific to Last Light Clearing until another complete game demonstrates a real shared need.

## Dependency direction

- `content.ts` defines typed gameplay data, physical geometry, tuning, and round profiles. `content-validation.ts` validates it before a session starts.
- `game.ts` / `game-state.ts`, combat, weapons, and progression own world state and rules. They depend on content and action-level input, never DOM, audio, camera, or presentation.
- `browser/host.ts` owns its root/canvas, DOM measurement, capped backing ratio, browser fullscreen, the single frame loop, listeners, ResizeObserver, and cleanup. `browser/input.ts` translates physical keys and pointers into movement actions. Neither imports clearing content or camera geometry.
- `art-pack.ts` defines local named image bundles, semantic actor roles, frame clips, normalized pivots, authored visual footprints, orientation, sampling, and decorative environment stamps. `themes.ts` combines these with effect colors and default interface skins as visual presets. `art/mosslight.ts` is an optional local CraftPix definition, activated only through an ignored development manifest.
- `animation.ts` owns bounded actor movement/facing observations outside gameplay. Composition updates them after each simulation step; render-only frames cannot reset a moving actor to idle.
- `view.ts` computes a pure presentation transform from explicit world bounds, CSS surface dimensions, target, and view mode. `presentation.ts` reads the run and transform to draw artwork, combat, warnings, and effects.
- `ui.ts` owns HTML menus, focus targets, settings controls, notices, and the authoritative-state HUD. Its typed callback object emits intents. It does not advance gameplay or call browser fullscreen.
- `app.ts` connects these owners, supplies the selected round to new runs and bounds/player to the camera, and coordinates screen transitions and suspension. `main.ts` mounts the application and disposes it on HMR.

## Session and run lifetime

`mountClearing(container)` returns an idempotent `dispose()`. A browser session retains appearance, interface override, accent, round, view, and sound settings. Start, Retry, Restart, and Return to title construct a fresh run rather than clearing selected fields. Run state owns enemies, entries, weapons/cooldowns, gems, progression, active time, outcomes, and pending gameplay notifications. Presentation reset discards effects and reseeds movement/facing history from the fresh run. A successful appearance replacement changes artwork without resetting the run or replaying notifications. Camera position is derived from the fresh player's position, so no previous offset survives.

`browser/clock.ts` advances fixed 60 Hz steps, clamps elapsed time to 100 ms, and allows at most five catch-up steps. A transition clears input and resets timing. Pause, page hiding, external focus loss, layout/backing changes, and fullscreen transitions never turn suspended wall time into simulation catch-up. Completing an upgrade interrupted by suspension returns to Pause, requiring explicit Resume. Escape and P only pause; Escape never resumes and remains available to the browser for fullscreen exit.

Composition drains gameplay notifications once per frame after the fixed steps, then gives the same batch to visuals and sound. Drawing never creates gameplay occurrences. Bounded effects age in active simulation time. Sound coalesces immediate cues, caps voices, and discards events received while silent; there is no playback queue or separate timer loop.

## Coordinates and display

Gameplay uses the unchanged 960×640 world. Collision radii belong to gameplay content. Source frame dimensions, transparent padding, cosmetic scales, and camera zoom do not determine collision geometry.

The host measures canvas CSS width/height and uses a device-pixel ratio capped at 2 for backing resolution. `view.ts` calculates one uniform world-to-CSS transform. World drawing uses backing ratio multiplied by that transform for all actors, weapons (including Halo and Pulse), projectiles, effects, and warnings. Rendering then restores the backing-ratio-only transform for CSS-space joystick and offscreen cues. `toScreen` and `toWorld` are the matching pure mappings.

Movement origin/tip and displacement live in CSS pixels relative to the canvas: a 6-pixel dead zone, full strength at 42 pixels, proportional strength in between. Camera motion cannot change a held action. Actual surface or fullscreen changes cancel the gesture and clear keys, requiring a fresh press after Resume. Pointer capture, release, cancellation, and focus clearing belong to browser input.

Fullscreen is requested directly from a button interaction on the session root, which contains HUD, canvas, and menus. Browser integration reports actual `fullscreenchange` state. Composition pauses, resets timing/input, and guards asynchronous status delivery after disposal. Rejected requests leave the viewport layout usable. Menus scroll inside the stage, safe-area insets protect chrome, and bounded failure notices cannot increase page height.

## Assets, sound, and disposal

Themes own art definitions, palettes, environment decoration, and cosmetic timing. The bundle loader decodes every local image and validates referenced frame bounds, pivots, footprints, and clips before replacing the active appearance atomically. It leaves the old pack visible during preparation, releases failed/stale preparations, and releases replaced image sources after successful delivery. Failure retains the current pack, or silhouettes on initial failure.

Animation uses only active run time. Keeper and enemy observations update after each fixed simulation step and persist between draws, including while paused. Cosmetic hit/attack clips, flashes, and defeat effects consume the existing notification batch; they cannot apply damage, set weapon cadence, retain dead enemies, or change sound delivery. Animation and image handles never enter RunState.

Interface tokens live in `style.css`, with names and accent choices in `interface.ts`. One HTML UI and callback set serves Classic, Rune, and Glass. “Match appearance” resolves the current successfully loaded preset’s default; explicit skin and accent selections persist independently. Visual settings are available at title/pause and never resume a paused run.

CraftPix image files and the activation manifest stay in ignored `local-art/`. Vite substitutes that manifest only for development when present; production builds always use an empty local registry. See [art definitions and provenance](../src/art/README.md) for the inspected mappings and reproduction steps. Sound owns one lazy Web Audio context, gain ramps, mute/volume, and short procedural cues. Pause/retry cancel voices; disposal disconnects nodes and closes the context.

Composition disposes assets and sound; host aborts listeners, disconnects observation, cancels scheduling, releases its DOM root, and input releases capture. Queued focus work and pending asset/fullscreen status completions guard session disposal. Retries retain the session without accumulating resources.

## Local verification

- `pnpm check`: strict types, fast simulation/presentation invariants, production build.
- For input or lifecycle work: `pnpm exec playwright install chromium` if needed, then `pnpm check:browser`.
- Focused layout inspection at laptop, narrow portrait, and short landscape sizes is useful when changing display behavior. Chromium emulation does not establish physical-device behavior or subjective audio quality.

Keep checks local and focused. Do not add CI, per-interaction suites, screenshot matrices, or more browsers/devices without an explicit request.
