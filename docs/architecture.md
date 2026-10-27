# Shared architecture

[AGENTS.md](../AGENTS.md) defines development principles. [CATALOG.md](../CATALOG.md) is the index for game-specific documentation, source ownership and rendering details.

## Shared source map

| Responsibility | Owner |
| --- | --- |
| Selection and lazy game imports | `src/main.ts`, `src/selection.ts` |
| Active session and mount point | `src/application.ts` |
| Viewport and mount-point sizing | `src/application.css` |
| Measurement, fullscreen, frame loop and lifetime signal | `src/browser/host.ts` |
| Page visibility, blur, page-exit and deferred focus binding | `src/browser/session.ts` |
| Bounded fixed-step timing | `src/browser/clock.ts` |
| Relative swept-circle intersection | `src/collision.ts` |
| AudioBits session lifecycle and bounded playback | `src/browser/audio.ts` |

## Lifetimes and execution

`GameEntry.mount(container): GameSession` returns synchronously. The application disposes the previous session before creating a fresh mount point. It removes that mount point even if construction or disposal throws; games must release resources acquired before a failed construction. Disposal is idempotent. Mounting after application disposal is rejected.

The entrypoint guards stale imports and disposes the application on HMR. Each game owns its DOM, scoped styles and async preparation. Pending completions must be invalidated when their session ends.

The host owns a stable focusable surface and one frame loop. Starting is idempotent; disposal during a frame prevents rescheduling. Disposal cancels scheduling, aborts listeners, disconnects observation and removes the root. Renderers own their backing buffers and graphics resources.

`bindPageLifetime` binds blur, hide, persisted page exit and final page exit with the host lifetime signal. Sessions supply suspension, timing reset and disposal; focus and gameplay transition rules stay local. All current game sessions use this binder. `bindSessionFocus` also shares clear-input and deferred focusout handling, ignoring callbacks after host abortion. Sessions supply their own focus predicate, so different play controls and menu rules stay local.

The clock bounds fixed-step catch-up; transitions reset timing so suspended wall time cannot advance play. Composition steps simulation and delivers its semantic events to visuals and audio. Collision math returns contact information; game rules own eligibility and consequences.

## Sound

All game sound uses the installed AudioBits public runtime and JSON-only recipes. Follow the [local skill](../.agents/skills/audiobits/SKILL.md) and installed package contracts when adding sound. There is no custom synthesis runtime, audio asset dependency, singleton or audio event bus.

`src/browser/audio.ts` owns a lazy AudioBits engine per game session. Mounting and importing stay silent and create no native context. Start/Retry/Resume call activation synchronously in their existing gesture handlers; playback waits for successful activation. The owner reports failures through the game's existing status UI, allows another gesture to retry, and drops events while unavailable without a backlog. Its generation guard prevents cancelled activation from making old work audible.

The owner handles mute, normalized volume, overlap admission (including retiring/releasing voices), cancellation, suspension and disposal. AudioBits supplies graph construction, envelopes, seeded variation, filters, delay, per-sound limits and graph cleanup. Cancellation disposes the owned Sound instances immediately, including effect tails on a suspended clock; recipes are rebound lazily. Ordinary pauses retain the engine. A gesture racing an unfinished suspension or following a terminal context replaces it, disposing the old engine first. Muting or zero volume cancels and suspends; a fresh eligible gesture can restore sound. Disposal invalidates pending starts, disconnects all graphs and closes the native context.

Browser composition owns hide, blur, focus, display and page-lifetime decisions alongside gameplay suspension. Returning from a hidden page never resumes audio automatically. Restart cancels the old run before gesture activation; game selection and HMR dispose the departing session. Simulation emits only semantic notifications and never imports AudioBits or reads the audio clock.

Each game's sound adapter owns recipes, event mapping, batch coalescing, priority, cooldowns and expressive playback values. Important milestones replace combat tails; routine bursts are throttled and excess voices discarded. Audio time is used only for presentation throttling. A new game supplies recipes and an adapter, reuses this owner, and wires the same session lifecycle without introducing another lifecycle implementation.

## Local verification

Run `pnpm check` for types, invariants and the build. Run `pnpm check:browser` for input or lifecycle changes; install Chromium with `pnpm exec playwright install chromium` if needed. Renderer-specific checks belong with the owning game's documentation.

The [three-game review](three-game-review.md) explains the shared focus binding and the boundaries kept local to each game.
