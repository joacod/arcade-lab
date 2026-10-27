# Shared architecture

[AGENTS.md](../AGENTS.md) defines development principles. [CATALOG.md](../CATALOG.md) is the index for game-specific documentation, source ownership and rendering details.

## Shared source map

| Responsibility | Owner |
| --- | --- |
| Selection and lazy game imports | `src/main.ts`, `src/selection.ts` |
| Active session and mount point | `src/application.ts` |
| Viewport and mount-point sizing | `src/application.css` |
| Measurement, fullscreen, frame loop and lifetime signal | `src/browser/host.ts` |
| Bounded fixed-step timing | `src/browser/clock.ts` |
| Relative swept-circle intersection | `src/collision.ts` |
| Current audio resource ownership | `src/browser/audio.ts` |

## Lifetimes and execution

`GameEntry.mount(container): GameSession` returns synchronously. The application disposes the previous session before creating a fresh mount point. It removes that mount point even if construction or disposal throws; games must release resources acquired before a failed construction. Disposal is idempotent. Mounting after application disposal is rejected.

The entrypoint guards stale imports and disposes the application on HMR. Each game owns its DOM, scoped styles and async preparation. Pending completions must be invalidated when their session ends.

The host owns a stable focusable surface and one frame loop. Starting is idempotent; disposal during a frame prevents rescheduling. Disposal cancels scheduling, aborts listeners, disconnects observation and removes the root. Renderers own their backing buffers and graphics resources.

The clock bounds fixed-step catch-up; transitions reset timing so suspended wall time cannot advance play. Composition steps simulation and delivers its semantic events to visuals and audio. Collision math returns contact information; game rules own eligibility and consequences.

## Sound

AudioBits is required for all game sound. The dependency and [local skill](../.agents/skills/audiobits/SKILL.md) are installed; migration from the current handwritten synthesis in `src/browser/audio.ts` remains outstanding.

The audio owner provides gesture activation, mute/volume, bounded voices, cancellation, suspension and disposal. Game-owned adapters supply sound definitions and event mapping. Audio failure must leave play possible.

## Local verification

Run `pnpm check` for types, invariants and the build. Run `pnpm check:browser` for input or lifecycle changes; install Chromium with `pnpm exec playwright install chromium` if needed. Renderer-specific checks belong with the owning game's documentation.
