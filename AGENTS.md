# Project guidance

## Purpose and evolution

- Build complete, enjoyable browser games and improve the internal engine that supports them. Maintain game-type foundations that coding agents can adapt from supplied themes, artwork, assets, stories and gameplay requirements. Gameplay quality and architecture quality are equal objectives. Keep one private application/package; this is not a library, SDK or general-purpose engine product.
- For each new game or substantial feature, evaluate existing infrastructure, duplication, ownership and awkward abstractions. Refactor when concrete requirements make development simpler or more maintainable. Do not avoid a useful abstraction just to minimize code or wait for two identical implementations. Avoid speculative packages and architecture.
- Reuse and improve applicable shared infrastructure. Keep fundamentally different game mechanics local. Read the relevant owners and [architecture](docs/architecture.md) before changing a system; keep those documents aligned with the resulting implementation.

## Ownership

- The application shell owns game selection, mounting and disposal. Game entries mount synchronously and return session cleanup, while owning their async preparation. Failed construction must release resources already created. Keep game styles scoped to their root.
- Simulation owns world state and gameplay rules. It depends on typed content, pure math and action-level input, never browser APIs, rendering, UI or audio implementations. Use typed data for content/tuning and TypeScript for behavior. Rendering, animation and audio consume state and semantic events without advancing rules.
- Browser sessions own browser APIs, listeners, scheduling and disposal. The shared host owns measurement, fullscreen and the single frame loop; renderers own backing buffers. Input translates physical controls into actions. Reuse shared captured-button input for button-based controls; gesture translation stays local. Restart creates a fresh run. Reuse the shared page-lifetime and deferred focus bindings, supplying game-specific suspension and focus rules. Session disposal and HMR must release resources and invalidate pending async work.
- Presentation owns cameras and cosmetic state. Use one authoritative uniform world transform. Relative gestures use CSS pixels independently of camera motion. Display transitions clear held input and reset timing. Preserve the viewport-filling layout and fullscreen support.
- Physical geometry belongs in gameplay content, independently of artwork dimensions, visual scale or camera zoom. UI displays state and emits intents. Composition connects explicit owners and manages their lifetimes. Shared infrastructure contains no game content.

## Technologies

- Canvas 2D, Three.js and vgpu/WebGPU are valid rendering choices. Each game uses the renderer or renderers its design needs. Keep unrelated games and graphics implementations behind appropriate loading boundaries.
- Use [AudioBits](.agents/skills/audiobits/SKILL.md) for all game sound. Reuse `src/browser/audio.ts` for session-owned AudioBits lifecycle and bounded playback. Keep recipes, event mapping, cue priorities and throttling local to each game. Activate synchronously in existing user gestures; pause and dispose through the session owner. Current integration status belongs in the architecture document.
- Add dependencies when their capabilities improve quality or save substantial implementation work. Avoid unnecessary wrappers and large frameworks without a concrete benefit. Do not add publishing/release infrastructure or external API stability guarantees. Add compatibility only for persisted data, an actual external consumer or an explicit requirement.

## Documentation and verification

- Keep README a short, human-facing project introduction and usage guide. Link to [CATALOG.md](CATALOG.md) for game descriptions, screenshots and controls instead of growing README with each game.
- Use CATALOG.md as the shared index for game-specific docs. Keep shared guidance independent of game names, inventories and implementation details. Document decisions where they are owned, avoid duplicating source constants or rules, and remove obsolete reports. Retain asset provenance and licenses.
- Keep verification local, small and meaningful. `pnpm check` runs types, invariant tests and the build. Run `pnpm check:browser` for input or lifecycle changes. Browser automation is Chromium only. Do not add CI, per-interaction suites, screenshot matrices or expand the browser/device matrix without an explicit request.
- Do not require human playtesting sign-off or record manual-testing status, acceptance checklists or "unverified" caveats in project docs. The user tests games and reports issues as needed. Keep docs focused on usage, design and maintenance; report concrete failures when found.
