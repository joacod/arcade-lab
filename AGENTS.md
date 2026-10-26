# Project guidance

- Use `<type>/<short-description>` branches. Add `codex/` only when requested.
- Keep one private application/package and zero runtime dependencies unless a later task explicitly changes that decision.
- Simulation depends on typed content and action-level input, never browser APIs or presentation. Composition connects browser integration, game, presentation, and UI with explicit owners.
- Keep game-specific behavior specific until actual reuse justifies extraction. Use typed data for content and TypeScript for behavior.
- Browser sessions own listeners, scheduling, and disposal. Runs own mutable gameplay state. Restart replaces a run. HMR must dispose the session.
- Add compatibility only for persisted data, an external consumer, or an explicit requirement.
- Keep verification small and meaningful. Run `pnpm check`. Browser automation is Chromium only. No per-interaction suites, screenshot matrices, or mobile/browser matrices.
- Do not add speculative packages, release systems, publishing infrastructure, or architecture.

See README.md for setup, responsibility locations, and the reference baseline.
