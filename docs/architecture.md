# Architecture and ownership

Arcade Lab is one private application. Three.js is the sole, explicitly permitted runtime graphics dependency for this experiment. Keep behavior specific to Last Light Clearing until another complete game demonstrates a real shared need.

## Dependency direction

- `content.ts` defines typed gameplay data, physical geometry, tuning, and round profiles. `content-validation.ts` validates it before a session starts.
- `game.ts` / `game-state.ts`, combat, weapons, and progression own world state and rules. They depend on content and action-level input, never DOM, audio, camera, or presentation.
- `browser/host.ts` owns its root and stable focusable play surface, CSS measurement, capped DPR reporting, browser fullscreen, the single frame loop, listeners, ResizeObserver, and cleanup. `browser/input.ts` translates physical keys and pointers into movement actions. Neither imports clearing content or camera geometry.
- `art-pack.ts` defines local named image bundles, semantic actor roles, frame clips, normalized pivots, authored visual footprints, orientation, sampling, and decorative environment stamps. `themes.ts` combines these with effect colors and default interface skins as visual presets. `art/mosslight.ts` is an optional local CraftPix definition, activated only through an ignored development manifest.
- `animation.ts` owns bounded actor movement/facing observations outside gameplay. Composition updates them after each simulation step; render-only frames cannot reset a moving actor to idle.
- `view.ts` computes a pure presentation transform from explicit world bounds, CSS surface dimensions, target, and view mode. `world-presentation.ts` defines only the clearing presentation lifecycle: canvas, resize, observe, reset, consume, draw, and dispose. `presentation.ts` owns a Canvas 2D canvas/context; the lazy `three/garden.ts` owns a separate WebGLRenderer canvas and all GPU resources. `screen-overlay.ts` owns the shared CSS-space joystick and offscreen cues.
- `ui.ts` owns HTML menus, focus targets, settings controls, notices, and the authoritative-state HUD. Its typed callback object emits intents. It does not advance gameplay or call browser fullscreen.
- `app.ts` connects these owners, supplies the selected round to new runs and bounds/player to the camera, and coordinates screen transitions and suspension. `main.ts` mounts the application and disposes it on HMR.

## Session and run lifetime

`mountClearing(container)` returns an idempotent `dispose()`. A browser session retains appearance, interface override, accent, round, view, and sound settings. Start, Retry, Restart, and Return to title construct a fresh run rather than clearing selected fields. Run state owns enemies, entries, weapons/cooldowns, gems, progression, active time, outcomes, and pending gameplay notifications. Presentation reset discards effects and reseeds movement/facing history from the fresh run. A successful appearance replacement changes artwork without resetting the run or replaying notifications. Camera position is derived from the fresh player's position, so no previous offset survives.

`browser/clock.ts` advances fixed 60 Hz steps, clamps elapsed time to 100 ms, and allows at most five catch-up steps. A transition clears input and resets timing. Pause, page hiding, external focus loss, layout/backing changes, and fullscreen transitions never turn suspended wall time into simulation catch-up. Completing an upgrade interrupted by suspension returns to Pause, requiring explicit Resume. Escape and P only pause; Escape never resumes and remains available to the browser for fullscreen exit.

Composition drains gameplay notifications once per frame after the fixed steps, then gives the same batch to visuals and sound. Drawing never creates gameplay occurrences. Bounded effects age in active simulation time. Sound coalesces immediate cues, caps voices, and discards events received while silent; there is no playback queue or separate timer loop.

## Coordinates and display

Gameplay uses the unchanged 960×640 world. Collision radii belong to gameplay content. Source frame dimensions, transparent padding, cosmetic scales, and camera zoom do not determine collision geometry.

The host measures the stable `.play-surface` CSS width/height and reports a device-pixel ratio capped at 2. It never resizes a world buffer. Each implementation owns its backing dimensions: Canvas assigns its width/height; Three.js uses `setPixelRatio` and `setSize(..., false)`. UI focus, pointer capture, fullscreen and listeners stay attached to stable elements while the world canvas is replaced. The overlay resizes its own small 2D buffer.

`view.ts` calculates one uniform world-to-CSS transform. Canvas uses DPR multiplied by that transform. The orthographic garden maps game `(x, y)` to Three.js `(x, -y, elevation)` with a camera looking straight down negative Z. Its frustum is `left=-view.x/scale`, `right=(cssWidth-view.x)/scale`, `top=view.y/scale`, `bottom=-(cssHeight-view.y)/scale`. Consequently every ground point projects to the same CSS location as `toScreen`, in Close and Whole arena views. Decorative elevation has no perspective/parallax and cannot change physical bodies, the traversable floor or pointer displacement. `toWorld` is the inverse mapping. The screen overlay uses DPR only.

Movement origin/tip and displacement live in CSS pixels relative to the stable surface: a 6-pixel dead zone, full strength at 42 pixels, proportional strength in between. Camera motion cannot change a held action. Actual surface or fullscreen changes cancel the gesture and clear keys, requiring a fresh press after Resume. Pointer capture, release, cancellation, and focus clearing belong to browser input.

Fullscreen is requested directly from a button interaction on the session root, which contains HUD, canvas, and menus. Browser integration reports actual `fullscreenchange` state. Composition pauses, resets timing/input, and guards asynchronous status delivery after disposal. Rejected requests leave the viewport layout usable. Menus scroll inside the stage, safe-area insets protect chrome, and bounded failure notices cannot increase page height.

## Assets, sound, and disposal

Visual presets in `themes.ts` select an optional art pack, cosmetic palette, presentation treatment and default interface. Lanternwood, Moonglass, Ember Ruins and development-only Mosslight use Canvas. Prism Garden uses procedural geometry with Glass as its default interface. Ember Conservatory uses the exact Ember Ruins art-pack object for pixel actors in the lit garden. These named, supported choices avoid an arbitrary renderer/art matrix.

`prepareAssets` decodes and validates a complete bundle, returning images and explicit disposal. Composition owns each preparation's abort signal and generation. The old presentation and images remain active during loading. After preparation, composition resets the candidate from the current run, resizes and paints once offscreen, then replaces the canvas atomically. Success releases the old renderer before its images. Stale/failed/aborted candidates release their own images and resources. Starting/resuming/restarting is disabled during preparation; settings can supersede it. No replacement constructs a run or replays events/sounds. Explicit interface/accent overrides and view mode remain session state.

Initialization failure retains the current presentation. GPU context loss or a draw failure suspends play and immediately creates a fresh Canvas appearance with Lanternwood silhouettes on the current run. Pending upgrade choices stay frozen and still use the existing confirmation/suspension rules. The player must explicitly Resume after suspension. Lost contexts are discarded rather than restored into an active game.

All Three.js imports and types live in `three/garden.ts`, reached only through `import()` on a garden selection. A Canvas selection never fetches that module or the graphics library. Vite pre-optimizes the dependency on the development server to avoid a first-selection reload; this does not fetch it on the client. Both implementations use the host's existing frame loop, fixed simulation and active run time. There is no second animation loop or clock.

The garden reuses geometry, materials and textures. Ordinary/elite actors use reusable mesh slots, with enemy-ID animation observations. Gems, projectiles, warning rings and transient effects use fixed instanced batches sized above authored round maxima (2,048 gems, 256 per projectile type, 128 effects with six fragments each). Spark tails derive from velocity, so reuse cannot connect unrelated projectiles. Floor texture and scenery variation are deterministic cosmetics and never consume simulation randomness. One hemisphere light and one directional light with one bounded shadow map serve the whole scene.

Pixel actors use shared nearest-filtered atlas textures without mipmaps, per-slot UVs, the same clips/active-time selection, pivots, visual footprints and orientation as Canvas. Changing a frame never mutates a shared atlas offset. Prism actors are game-specific geometry; weapon and pickup effects remain specific to Last Light Clearing.

To add a visual treatment, add its supported named preset and cosmetic implementation. Reuse an art manifest when appropriate, keeping all physical sizes in content. Add an implementation branch at the composition's lazy preparation boundary only if a different renderer requires it. Supply the existing read-only run/view inputs and implement reset/resize/draw/disposal without editing simulation, adding entity IDs, or introducing a rendering command framework.

Animation uses only active run time. Keeper and enemy observations update after each fixed simulation step and persist between draws, including while paused. Cosmetic hit/attack clips, flashes, and defeat effects consume the existing notification batch; they cannot apply damage, set weapon cadence, retain dead enemies, or change sound delivery. Animation and image handles never enter RunState.

Interface tokens live in `style.css`, with names and accent choices in `interface.ts`. One HTML UI and callback set serves Classic, Rune, and Glass. “Match appearance” resolves the current successfully loaded preset’s default; explicit skin and accent selections persist independently. Visual settings are available at title/pause and never resume a paused run.

CraftPix image files and the activation manifest stay in ignored `local-art/`. Vite substitutes that manifest only for development when present; production builds always use an empty local registry. See [art definitions and provenance](../src/art/README.md) for the inspected mappings and reproduction steps. Sound owns one lazy Web Audio context, gain ramps, mute/volume, and short procedural cues. Pause/retry cancel voices; disposal disconnects nodes and closes the context.

Composition disposes active/pending assets, the overlay, world presentation and sound. Garden disposal explicitly releases geometries, materials, textures, instanced buffers, the directional shadow target, WebGLRenderer caches/context and canvas, and aborts the context-loss listener. Initialization failures use the same cleanup. The host aborts listeners, disconnects observation, cancels scheduling, releases its DOM root, and input releases capture. Queued focus work and pending presentation/fullscreen completions guard session disposal. Retries retain the session without accumulating resources.

## Local verification

- `pnpm check`: strict types, fast simulation/presentation invariants, production build.
- For input or lifecycle work: `pnpm exec playwright install chromium` if needed, then `pnpm check:browser`.
- The representative replacement browser flow retains an upgraded run across Canvas/pixel/garden changes, checks projection and atlas UVs, plays after Resume, supersedes preparation, retries, and verifies resource disposal plus real context-loss and initialization-failure fallback. It also checks Canvas does not fetch the lazy graphics module.
- Focused layout inspection at laptop, narrow portrait, and short landscape sizes is useful when changing display behavior. Chromium emulation does not establish physical-device behavior or subjective audio quality.

Keep checks local and focused. Do not add CI, per-interaction suites, screenshot matrices, or more browsers/devices without an explicit request.
