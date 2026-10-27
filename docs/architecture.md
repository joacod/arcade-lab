# Architecture and ownership

This document maps the current implementation and its ownership boundaries. [AGENTS.md](../AGENTS.md) defines development principles, technology choices and verification scope; [CATALOG.md](../CATALOG.md) describes the playable games.

## Source map

Paths below are relative to `src/`.

| Responsibility | Owner |
| --- | --- |
| Game selection and lazy entry imports | `main.ts`, `selection.ts` |
| Active session and mount point | `application.ts`; page sizing in `application.css` |
| Browser measurement, fullscreen, frame scheduling and lifetime signal | `browser/host.ts` |
| Bounded fixed steps and relative swept-circle math | `browser/clock.ts`, `collision.ts` |
| Clearing composition | `app.ts` |
| Clearing simulation and typed content | `game.ts`, `game-state.ts`, `combat.ts`, `progression.ts`, `weapons/`, `content.ts`, `content-validation.ts` |
| Clearing input, camera and overlay | `browser/input.ts`, `view.ts`, `screen-overlay.ts` |
| Clearing presentation and assets | `world-presentation.ts`, `presentation.ts`, `three/garden.ts`, `vgpu/`, `animation.ts`, `themes.ts`, `art-pack.ts`, `assets.ts`, `art/` |
| Clearing UI | `ui.ts`, `interface.ts`, `style.css` |
| Skybreak composition, simulation and content | `skybreak/app.ts`, `skybreak/game.ts`, `skybreak/content.ts` |
| Skybreak input, presentation and UI | `skybreak/input.ts`, `skybreak/presentation.ts`, `skybreak/ui.ts`, `skybreak/style.css` |
| Current audio owner and game cue adapters | `browser/audio.ts`, `sound.ts`, `skybreak/sound.ts`; see [sound](#sound) |

## Shared infrastructure and game boundaries

The host, clock, audio owner and collision math serve both games. `collision.ts:sweptCircle` returns earliest relative contact; callers retain target eligibility, damage and scoring. Clearing supplies a stationary target twice; Skybreak supplies previous/current positions.

Input stays local because Clearing exposes movement/stick state while Skybreak adds held fire, consumed evade presses and a second touch control. Clearing's following camera and Skybreak's fixed portrait fit have different policies. Only Clearing needs image-bundle preparation and renderer replacement. Menus, progression, combat and authored content remain game-owned.

For a new game or substantial feature, identify what it can reuse, where responsibilities overlap, and whether an existing contract makes the change harder to understand. Evaluate an abstraction by its concrete callers, ownership and complexity. A concrete need can justify improving infrastructure without waiting for duplicate implementations. Update this document when a meaningful boundary changes.

## Application, session and run lifetimes

`application.ts` defines `GameEntry.mount(container): GameSession` and `GameSession.dispose(): void`. The application owns one active session and a fresh `.game-mount` element for each mount. Replacement disposes the previous session first. Disposal is idempotent; mounting after application disposal is rejected. The application removes its mount point even when mounting or session disposal throws, but cannot release resources a failed game never returns or cleans up.

`main.ts` loads the selected game on demand, rejects stale imports with a generation guard and disposes the application on HMR. Returning to selection disposes the game before mounting the collection. Styles are scoped to `.clearing-app`, `.skybreak-app` and `.arcade-selection`; shared CSS only sizes the page and mount point.

Games return cleanup synchronously while owning pending artwork/GPU preparation. Each entry guards initial Canvas construction: Clearing disposes its already-created host on failure; Skybreak disposes its sound owner and host. Host disposal aborts listeners, disconnects the ResizeObserver, cancels a pending frame and removes its root. The original construction error propagates. Other resource acquisition paths remain responsible for their own cleanup.

`browser/host.ts` owns the stable focusable play surface, CSS measurement, capped DPR reporting, fullscreen and one frame loop. Starting is idempotent. Disposal during a frame prevents another frame from being scheduled. Renderers own their canvases, backing resolution and graphics resources; replacing a canvas leaves focus, pointer capture and UI attached to stable elements.

Runs own mutable gameplay state. Start, Retry, Restart and Return to title replace the run. Clearing's appearance, interface override, accent, round, view and sound settings belong to its session. Presentation reset discards effects and reseeds animation observations from the fresh run. Skybreak resets effects and audio voices with its fresh sortie. Simulation imports typed content and pure math, independently of browser, graphics, UI and audio implementations. See [Clearing](last-light-clearing.md) and [Skybreak](skybreak.md) for their rules.

## Timing, input and display

`browser/clock.ts` advances 60 Hz fixed steps, clamps elapsed time to 100 ms and limits catch-up to five steps. Composition steps the simulation, drains its notifications once per frame and gives the same batch to presentation and sound. Drawing never advances gameplay. Effects and gameplay animation age in active run time, so pause freezes them. Clearing's title-only idle animation receives the existing host timestamp.

Focus loss, hiding, layout/backing changes and fullscreen transitions clear held input and reset timing. Suspended wall time cannot become simulation catch-up. Resume is explicit. Clearing's upgrade confirmation also requires releasing held confirmation keys/pointers; a choice interrupted by suspension returns to Pause.

Both input bindings express relative drag displacement in CSS pixels, independent of camera motion. They own capture, cancellation and action translation. Skybreak consumes a roll press once at a simulation step and allows a second pointer on the roll button. Its portrait playfield fits uniformly within the surface.

The application fills the viewport. Clearing exposes fullscreen on its session root, including the arena, HUD and menus; Skybreak does not expose a fullscreen control. The host reports actual browser state and handles request rejection. Menus scroll inside the game on short screens. Async fullscreen status delivery guards disposal.

## Clearing coordinates and presentation

Physical geometry belongs in `content.ts`, independently of source image dimensions, padding, cosmetic scale or camera zoom. The world is 960×640. `view.ts` computes one invertible uniform transform from world bounds, CSS dimensions, player target and view mode. Close view follows and clamps to padded world bounds; Whole arena fits the world with letterboxing. Camera state does not enter simulation or movement input.

Canvas multiplies the world-to-CSS transform by DPR. The orthographic garden maps `(x, y)` to Three.js `(x, -y, elevation)`, looking down negative Z. Its frustum is `left=-view.x/scale`, `right=(cssWidth-view.x)/scale`, `top=view.y/scale`, `bottom=-(cssHeight-view.y)/scale`. Decorative elevation introduces no perspective/parallax or physical bodies. Bloom applies the same transform in its vertex shader and its inverse for the procedural field. The overlay uses CSS space plus DPR for its joystick and offscreen warnings.

The host reports DPR capped at 2. Canvas sizes its backing buffer; Three.js uses `setPixelRatio` and `setSize(..., false)`; Bloom owns physical surface sizing with limits in `bloomTuning`. vgpu auto-resize is disabled so measurement has one owner.

`world-presentation.ts` defines Clearing's lifecycle: canvas, resize, observe, reset, consume, draw and dispose. Canvas lives in `presentation.ts`. Three.js objects and types live in lazy `three/garden.ts`; WebGPU resources live in lazy `vgpu/bloom.ts`. Canvas startup and Skybreak do not fetch those graphics implementations. Vite pre-optimizes graphics dependencies on the development server to avoid a first-selection reload, without fetching them on the client.

`themes.ts` defines supported named appearances and their cosmetic palettes/default interface skins. Canvas and the pixel garden use art packs; Prism and Abyss are procedural. Ember Conservatory shares Ember Ruins' art-pack object. Appearance, interface and accent choices are independent. `style.css` owns interface tokens; `ui.ts` displays state and emits intents.

`animation.ts` observes actor motion after simulation steps, retaining movement between render frames and while paused. Clips use active run time and authored pivots, footprints and orientation. Both Canvas and garden use the same clip helpers. Hit/attack animation and bounded cosmetic effects consume semantic notifications; they never apply damage or set weapon cadence. See [art authoring and provenance](../src/art/README.md) for manifests, skins and local artwork setup.

## Assets and graphics resource ownership

`prepareAssets` decodes and validates a complete image bundle, returning explicit disposal. Composition owns preparation abort signals and generations. The active presentation stays visible while a candidate prepares. The candidate resets from the current run, resizes and paints offscreen before atomic canvas replacement. Success releases the old renderer before its images; failed, aborted or stale candidates release their own resources. Replacement does not construct a run or replay events. Start, Resume and Restart are disabled during preparation; another selection can supersede it.

Replacement failure retains the active presentation. GPU context loss or drawing failure pauses the current run and restores fresh Lanternwood Canvas silhouettes. The player must Resume. Session disposal aborts pending preparation, invalidates completions and releases assets, overlay, presentation, sound and host. Queued focus work also checks disposal.

The garden reuses geometry, materials, atlas textures, mesh slots and bounded instanced effect batches. Per-slot UVs prevent one actor's frame from changing another's; smooth sampling insets UVs by half a texel to avoid atlas bleed. Disposal releases geometry, materials, textures, instanced buffers, shadow targets, renderer caches/context and canvas, and removes context-loss listeners. Its initialization failure path releases acquired resources too.

Bloom owns its device, surface, pipelines, buffers and cosmetic state. `shared.wgsl` defines common layouts; `field.wgsl` and `organisms.wgsl` draw the field and organisms/effects in one pass. Palettes live in `themes.ts`; resolution/effect budgets live in `bloomTuning`. Storage and effect counts are bounded, and buffers/pipelines are reused.

Bloom preparation awaits compilation and error delivery. Uncancellable device acquisition releases a device if its request was aborted meanwhile. Abort listeners are removed when preparation completes. Device loss uses the same pause/Canvas recovery path; intentional disposal suppresses that callback and releases the vgpu owner. Neither GPU renderer creates a second animation loop.

The matching `@vgpu/wgsl` Vite plugin resolves/reflection-checks shaders at build time. `vite.config.ts` strips Vite's development `?import` marker before invoking that loader; the parser stays out of the browser bundle. `tsconfig.json` uses `skipLibCheck` for the installed vgpu declarations' conflict with `exactOptionalPropertyTypes`, while application checks remain strict.

Restricted CraftPix images and their activation manifest stay in ignored `local-art/`. Vite uses that manifest only in development. Production always uses the empty local registry and retains bundled appearances.

## Sound

AudioBits is the required library for all game sound. **Integration status:** the dependency and [local skill](../.agents/skills/audiobits/SKILL.md) are installed, but neither game uses it yet. Migration remains outstanding.

The current `browser/audio.ts` creates one lazy Web Audio context per session, coalesces immediate cues by priority, caps voices and discards events while silent without a backlog. `sound.ts` and `skybreak/sound.ts` map their own game notifications to independent cue definitions. Activation occurs inside Start/Retry/Resume gestures. Pause/retry cancel voices; hiding suspends audio; disposal disconnects nodes and closes the context. Unavailable audio leaves play possible.

AudioBits integration should replace handwritten synthesis while retaining session ownership, activation, mute/volume, voice limits, cancellation and disposal. Game sound adapters continue to consume state/events independently of simulation rules. Consult the installed skill and runtime exports for authoring and integration APIs.

## Local verification

- `pnpm check`: strict application types, focused simulation/presentation invariants and production build.
- `pnpm check:browser`: existing Chromium input, presentation and lifecycle checks. Install Chromium with `pnpm exec playwright install chromium` if needed.
- `tests/browser/mounting.spec.ts`: failed initial Canvas construction in both games, host signals/observers/roots, successful remount, single-loop ownership, active-session replacement, CSS isolation and disposal.
- `tests/browser/session.spec.ts` and `skybreak.spec.ts`: representative input, suspension, restart, outcomes and game switching; Clearing also covers renderer replacement, artwork failure, projection and resource cleanup.
- `tests/browser/bloom.spec.ts`: real Three.js palette/atlas bindings and WebGPU switching/native loss. Without a headless adapter it verifies failure retention and skips GPU-only assertions.

For native WebGPU checks on a capable Chromium installation:

```sh
pnpm check:browser --grep 'Abyss switching' --headed
pnpm exec vgpu check src/vgpu/field.wgsl --require-validation
pnpm exec vgpu check src/vgpu/organisms.wgsl --require-validation
```

Shader validation requires an available adapter. Browser emulation does not establish physical-device behavior or subjective audio quality. Verification scope is defined in [project guidance](../AGENTS.md#documentation-and-verification); test results belong in the change report, not as permanent snapshots here.
