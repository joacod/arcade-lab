# Prototype: establish the game

Prototype is a temporary mechanics-first stage. Read the [architecture](architecture.md), inspect applicable foundations through the [catalog](../CATALOG.md), and build a complete playable loop: controls, decisions, feedback, progression, outcomes and restart. Prioritize readable, enjoyable play over premature artwork investment.

Use simple Canvas 2D graphics. Shapes and modest sprites are appropriate scaffolding. Distinguish actors, hazards and interactive objects by silhouette, contrast and motion. Communicate anticipation, active danger, contact and readiness from simulation state and events. Keep one uniform world transform and physical geometry independent from artwork.

Reuse the host, fixed-step clock, action input, menus, focus/lifetime bindings and AudioBits owner. Keep simulation free of browser, rendering and audio implementations. A Prototype-only game exposes no presentation selector. Required resources still gate play and offer Retry or navigation on failure.

When the game works, make the [Arcade pass](arcade.md). Verify its complete artwork and retained gameplay, then remove the Prototype renderer, definitions, dedicated assets, fallback branches and obsolete tests. Keep shared mechanisms and useful diagnostics. Prototype is not a permanent development or recovery mode; Git preserves its history.

Follow the [shared local verification](architecture.md#local-verification). Keep game-specific design and art briefs with the game.
