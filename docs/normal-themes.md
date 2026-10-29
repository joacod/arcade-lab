# Creating a Normal theme

Normal is the gameplay-first foundation: a complete, playable and enjoyable game with clear presentation and responsive feedback. Simplicity concerns implementation scope and readability, not intentionally poor graphics. Follow the [development progression and mode contracts](architecture.md#appearance-changes); preserve useful artwork and animation in existing games.

When implementing or improving Normal, incorporate genuinely reusable lessons into this guide. Keep guidance independent of specific games, genres, rendering technologies, models, providers and development tools; game-specific art decisions belong with the owning game. Refine outdated guidance instead of accumulating rules, improving practical usefulness without unnecessary length or restrictions.

## Start with the game

Read the gameplay requirements and [shared architecture](architecture.md), then inspect applicable engine facilities and existing game owners through the [catalog](../CATALOG.md). Establish the core actions, physical world, progression, outcomes and retry/restart behavior. Build the full playable experience rather than leaving essential mechanics for a later visual pass.

Reuse the host, fixed-step clock, action input, menus, focus/lifetime bindings and session audio owner where applicable. Keep gameplay behavior in simulation and typed content. Rendering observes state and semantic events; UI emits intents and displays state; sound interprets events through its own adapter. Presentation must not decide hits, advance rules or own another frame loop.

## Make the game understandable

Choose a consistent visual vocabulary for the player, enemies, terrain, objectives, interactable objects and actions. Distinguish important roles by silhouette, size, orientation and contrast as well as color. Communicate what can be traversed, touched, collected or threatened; decoration must not imply physical obstacles that do not exist.

Show relevant states clearly: action readiness, anticipation, active danger, contact, damage, protection, progress and outcomes. Responsive controls and immediate visible reactions matter more than elaborate effects. Pose changes, directional marks, compact flashes, rings or small particle bursts can provide expressive feedback without an artwork pipeline. Derive cues from existing gameplay state and events rather than duplicating gameplay timers in the renderer.

Keep one authoritative uniform world transform, with framing that exposes the space needed for decisions at narrow and fullscreen sizes. Physical geometry comes from gameplay content, independently of decorative extent or camera scale. Keep important boundaries and cues legible above scenery and effects.

## Use expressive procedural drawing

Prefer browser-native drawing without additional graphics dependencies when feasible. Local shapes, paths, gradients, layered silhouettes and a deliberate palette can create attractive characters and environments. Simple articulated poses, movement response, parallax and restrained environmental animation are appropriate when they help the game feel alive and remain easy to maintain.

Keep the action visually dominant. Bound temporary effects and avoid spending the initial task on asset production, renderer experiments or elaborate presentation systems. Reuse useful local drawing and animation owners; a procedural presentation does not need a dummy image bundle or a renderer registry.

Cosmetic motion follows the session's timing and pause rules. Reduced motion should remove decorative movement and flashes while preserving gameplay-critical movement and warnings. Follow the existing ownership contracts for cleanup and display transitions.

## Move on when the foundation works

Normal is ready for a focused [Assets pass](assets-themes.md) when the intended game is complete: controls respond, progression and outcomes work, and players can read actions, dangers and feedback throughout play. It should stand on its own as an enjoyable presentation, without requiring later artwork to explain missing gameplay.

Use the [shared local verification](architecture.md#local-verification) appropriate to the implementation. Resolve concrete gameplay or readability failures before changing the artistic treatment; exhaustive visual polish can continue in later passes.
