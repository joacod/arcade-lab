# Project guidance

## Purpose and architectural evolution

- Arcade Lab is a personal workshop for small, beautiful, fun browser games and an evolving internal browser-native engine. Build complete, enjoyable game foundations while making future games easier to create and adapt. Gameplay quality and architecture quality are equal objectives; neither should compromise the other.
- Keep one private application/package. The engine serves this collection, not a published library, SDK or general-purpose engine product. Do not add publishing/release infrastructure, public API stability promises, external compatibility guarantees or hypothetical integration requirements. Add compatibility only for persisted data, an actual external consumer, or an explicit requirement.
- Every new game or substantial feature should evaluate existing infrastructure, duplicated functionality, ownership boundaries, awkward abstractions, and opportunities to make the engine easier for people and coding agents to understand and modify. Refactor or introduce abstractions when concrete needs make the design simpler, more capable or easier to maintain. Do not avoid useful improvements merely to minimize code. Avoid speculative architecture; two identical implementations are not a prerequisite for improving infrastructure. See the evaluation examples in [architecture](docs/architecture.md).
- Reuse and deliberately improve shared browser lifecycle, timing, audio ownership and other applicable infrastructure. Keep fundamentally different combat, movement, input, cameras, rendering and progression game-specific; shared infrastructure must contain no game content.

## Ownership and separation of concerns

- The application shell owns selection, mounting and disposal. `application.ts` owns only the active game's mount point and disposal; `main.ts` connects lazy game selection. A game entry mounts synchronously and returns its session cleanup; the game owns async preparation, UI, input, simulation, renderers, assets and audio. Failed construction must release resources already created, even before a session can be returned. Keep game styles scoped to their root.
- Simulation owns world state and rules, depending on typed content and action-level input, never DOM, Canvas, Three.js, WebGPU, UI or audio implementations. Use typed data for content/tuning and TypeScript for behavior. Use deterministic stepping where appropriate. Rendering and audio consume state and semantic events without advancing rules.
- Browser sessions own DOM measurement, backing resolution, browser APIs, fullscreen, listeners, scheduling and disposal. The shared host supplies measurement and the single frame loop; each renderer owns its backing buffer. Input translates physical controls into game actions. Runs own mutable gameplay state. Restart replaces a run. Sessions remain independent, and HMR must dispose the session.
- Camera/view settings are presentation state. World rendering uses one authoritative uniform transform. Relative movement gestures use CSS pixels, independent of camera motion; layout transitions clear held input and reset timing. Preserve the viewport-filling application layout and fullscreen support.
- Themes own local artwork metadata and cosmetic values. Artwork dimensions and display zoom do not define physical collision geometry; physical sizes stay in gameplay content. Animation and visual-only effects stay outside simulation.
- UI displays state and emits intents. Composition connects explicit owners, supplies the selected round to each new run and world/player information to the camera, and owns asset/audio disposal and cancellation of stale async work.
- Shared host, clock, audio voices and pure collision math contain no game content. Keep Clearing progression/cameras and Skybreak waves/weapons/boss behavior local unless concrete requirements justify changing those boundaries.

## Rendering and dependencies

- Canvas 2D, Three.js and vgpu/WebGPU are valid choices. A game may use one renderer or several according to its design; every game need not implement every renderer. Keep appropriate loading boundaries so games do not load unrelated rendering implementations.
- Additional dependencies, including substantial graphics libraries, are acceptable when their capabilities improve quality or reduce substantial implementation work. Avoid speculative packages, unnecessary wrappers and large frameworks without concrete justification.
- AudioBits is the selected procedural audio library for the next implementation pass. It is installed but not yet integrated into game audio. Keep documentation accurate about that status until integration is complete.

## Documentation and verification

- README describes the purpose, current games, technologies and local setup for newcomers. Durable development rules live here; implementation/ownership details belong in linked documentation. Update relevant documentation when user-visible behavior or architecture changes. Preserve historical experiment/review records as historical evidence, not overriding guidance.
- Keep verification local, small and meaningful. `pnpm check` runs types, invariant tests and the build. Run `pnpm check:browser` for input or lifecycle changes. Browser automation is Chromium only. Do not add CI, per-interaction suites, screenshot matrices or expand the browser/device matrix without explicit request.

See [README](README.md), [architecture](docs/architecture.md), [Clearing gameplay](docs/last-light-clearing.md) and [Skybreak gameplay](docs/skybreak.md).
