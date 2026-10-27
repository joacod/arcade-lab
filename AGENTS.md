# Project guidance

- Keep one private application/package and only the existing Three.js and vgpu runtime graphics dependencies. Do not add speculative packages, publishing/release infrastructure, or architecture.
- `application.ts` owns only the active game's mount point and disposal. A game entry mounts synchronously and returns its session cleanup; the game owns async preparation, UI, input, simulation, renderers, assets, and audio. Keep game styles scoped to their root.
- Simulation owns world state and rules, depending on typed content and action-level input, never browser APIs or presentation. Keep game-specific behavior specific until actual reuse justifies extraction. Use typed data for content and TypeScript for behavior.
- Browser sessions own DOM measurement, backing resolution, browser APIs, listeners, scheduling, and disposal. Runs own mutable gameplay state. Restart replaces a run. HMR must dispose the session.
- Camera/view settings are presentation state. World rendering uses one authoritative uniform transform. Relative movement gestures use CSS pixels, independent of camera motion; layout transitions clear held input and reset timing.
- Themes own local artwork metadata and cosmetic values. Artwork dimensions and display zoom do not define physical collision geometry; physical sizes stay in gameplay content. Visuals and sound consume notifications without advancing rules.
- UI displays state and emits intents. Composition connects explicit owners, supplies the selected round to each new run and world/player information to the camera, and owns asset/audio disposal.
- Add compatibility only for persisted data, an external consumer, or an explicit requirement.
- README describes the current project for newcomers. Durable internal decisions belong in linked documentation. Update relevant documentation when user-visible behavior changes.
- Keep verification local, small, and meaningful. `pnpm check` runs types, invariant tests, and the build. Run `pnpm check:browser` for input or lifecycle changes. Browser automation is Chromium only. Do not add CI, per-interaction suites, screenshot matrices, or expand the browser/device matrix without explicit request.

See [README](README.md), [architecture](docs/architecture.md), and [gameplay reference](docs/last-light-clearing.md).
