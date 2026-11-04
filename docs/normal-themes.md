# Creating a Normal theme

Normal is the gameplay-first baseline: establish a game that is new to the catalog, work out its mechanics and deliver a complete, playable and enjoyable experience. Spend the effort on controls, rules, progression and readable feedback, with a simple, coherent presentation. Normal can look appealing and use image assets; the Assets mode name does not reserve artwork for later. A dedicated art or visual-polish pass is not the goal here. Follow the [development progression and mode contracts](architecture.md#appearance-changes); preserve useful artwork and animation in existing games.

When implementing or improving Normal, incorporate genuinely reusable lessons into this guide. Keep guidance independent of specific games, genres, rendering technologies, models, providers and development tools; game-specific art decisions belong with the owning game. Refine outdated guidance instead of accumulating rules, improving practical usefulness without unnecessary length or restrictions.

## Start with the game

Read the gameplay requirements and [shared architecture](architecture.md), then inspect applicable engine facilities and existing game owners through the [catalog](../CATALOG.md). Establish the core actions, physical world, progression, outcomes and retry/restart behavior. Build the full playable experience rather than leaving essential mechanics for a later visual pass.

Reuse the host, fixed-step clock, action input, menus, focus/lifetime bindings and session audio owner where applicable. Keep gameplay behavior in simulation and typed content. Rendering observes state and semantic events; UI emits intents and displays state; sound interprets events through its own adapter. Presentation must not decide hits, advance rules or own another frame loop.

## Make the game understandable

Choose a consistent visual vocabulary for the player, enemies, terrain, objectives, interactable objects and actions. Distinguish important roles by silhouette, size, orientation and contrast as well as color. Communicate what can be traversed, touched, collected or threatened; decoration must not imply physical obstacles that do not exist.

Show relevant states clearly: action readiness, anticipation, active danger, contact, damage, protection, progress and outcomes. Responsive controls and immediate visible reactions matter more than elaborate effects. Pose changes, directional marks, compact flashes, rings or small particle bursts can provide expressive feedback without an elaborate effect system. Derive cues from existing gameplay state and events rather than duplicating gameplay timers in the renderer.

Keep one authoritative uniform world transform, with framing that exposes the space needed for decisions at narrow and fullscreen sizes. Physical geometry comes from gameplay content, independently of decorative extent or camera scale. Keep important boundaries and cues legible above scenery and effects.

## Use a lightweight asset presentation

Use custom image assets for the player, enemies and interactive objects, keeping their scope modest: a small, coherent sprite set and the action frames needed to communicate the game. Simple complete character cels keep anatomy, clothing and silhouette together. Reuse suitable committed artwork where it fits. Keep role mappings, frame rectangles and stable anchors local and easy to replace. Browser-native Canvas drawing is usually sufficient to present them without a graphics dependency. The renderer serves the playable foundation; detailed materials, extensive scenery and elaborate animation can wait for the focused visual passes.

Temporary shapes are useful while establishing mechanics. Replace that scaffolding before treating the presentation as finished. Do not build a procedural body-part system or skeleton renderer as the Normal foundation and then carry it into later themes. Existing procedural games can migrate in their own scoped passes.

Keep the action visually dominant. Procedural paths, gradients, parallax and restrained environmental animation can support the sprite artwork. Bound temporary effects and keep the initial asset scope proportional to the game. Reuse image preparation and semantic animation owners rather than building elaborate renderer or rig systems. Use the [Assets guide](assets-themes.md#specify-artwork-before-integrating-it) for image layout and anchor contracts.

Follow the shared [presentation timing and reduced-motion rules](architecture.md#presentation-timing-and-motion) and [session lifetime contract](architecture.md#lifetimes-and-execution).

## Move on when the foundation works

Normal is ready for a focused [Assets pass](assets-themes.md) when the intended game is complete: controls respond, mechanics work together, progression and outcomes work, and players can read actions, dangers and feedback throughout play. Simple visuals are sufficient; do not hold this pass open to chase the finish of Assets or Quality. Normal should stand on its own as an enjoyable game, without requiring later artwork to explain missing gameplay.

Use the [shared local verification](architecture.md#local-verification) appropriate to the implementation. Resolve concrete gameplay or readability failures before changing the artistic treatment; exhaustive visual polish can continue in later passes.
