# Clockwork Hollow

An original Canvas 2D platform adventure through **The Waking Aqueduct**, an overgrown mechanical ruin. Guide a small brass keeper to the old bell. Wind-up motes are optional discoveries, so completing the path never requires a perfect collection. This pass delivers one complete level and a reusable platformer foundation; the larger three-level adventure remains future work.

## Playing

Move with A/D or left/right arrows. Jump with Space, W, Up or Z. Hold to jump higher and release to make a short hop. Touch controls provide independent left, right and jump buttons, including simultaneous movement and jumping. Escape, P or Pause suspends the journey. Resume requires an explicit gesture.

The route teaches steps before introducing broken spans, higher ledges and copper thorn patches. Thin ledges are solid on every side. Falling into a gap or touching thorns ends the attempt. Try again and Restart journey construct a fresh run, clearing collected motes, movement, buffered input, camera and cosmetic effects. The bell completes the level on contact. There is no time limit, combat, checkpoint or automatic repeat jump.

Focus loss, hiding the page, moving focus out of the play controls and changing display size pause play and clear input. Fullscreen is available in the menus when supported. Game selection disposes the session and returns to the collection. Sound may be muted; unavailable audio leaves gameplay usable and reports the failure in the menu.

## Source ownership

| Responsibility | Owner |
| --- | --- |
| Authored physical geometry, spawn, hazards, motes, goal and movement tuning | `src/platformer/content.ts` |
| Pure simulation, axis collision, jump grace/buffer/cut, collection and outcomes | `src/platformer/game.ts` |
| Keyboard edges/holds and independently captured touch buttons | `src/platformer/input.ts` |
| Uniform projection, bounded follow camera, procedural art, animation and bounded particles | `src/platformer/presentation.ts` |
| Screens, HUD, accessible controls, status reporting and intents | `src/platformer/ui.ts`, `style.css` |
| JSON-only AudioBits recipes, cue priorities and throttling | `src/platformer/sound-recipes.ts`, `sound.ts` |
| Browser composition, transitions, resource ownership and cleanup | `src/platformer/app.ts` |

Simulation uses top-left player coordinates and authored axis-aligned rectangles. Horizontal and vertical swept edge crossings resolve the nearest solid contact, preventing penetration at supported speeds. Ground contact renews a short coyote window. Jump presses enter a small buffer, consumed once either on takeoff or contact. Releasing jump cuts ascent once. Ground braking is stronger than air acceleration. The shared fixed-step clock advances rules; Canvas, audio, input events and camera movement never advance simulation.

The camera projects the whole scene through one uniform transform, uses a minimum visible width to show upcoming landing space on narrow displays, and clamps to authored level bounds. Axes larger than the level are centered. It follows the player smoothly, snaps on reset/resize, and freezes with active time. Scenery uses independent parallax only for decoration. Collision dimensions do not depend on the keeper's scarf, sprout, animation pose or artwork bounds.

Landing squash, jump/landing dust, collection sparks and completion sparks consume semantic events. Particles have a fixed total admission limit and finite lifetimes. Scenery is deterministic and bounded. Reduced-motion preference disables particles, mote bobbing, flywheel rotation, landing squash and smooth camera follow. All art, character drawings and the selection cover are original code-authored Canvas/SVG work under the repository's MIT license. No external art or sound assets are used.

Sound depicts a spring lift, soft stone/metal landing, unwinding damage, glass-like mote interaction and a waking bell. Landing strength changes its recipe gain. The game adapter coalesces and throttles routine cues; damage and completion replace lesser tails. The shared AudioBits owner handles activation, cancellation, bounded voice admission, suspension, mute and disposal.

## What the third genre revealed

**Worked unchanged:** synchronous game mounting/disposal, stale lazy-import guards, host measurement/fullscreen/single frame ownership, bounded fixed-step timing and the lazy session-owned AudioBits runtime all fit this genre. The platformer loads separately from the other games and their graphics implementations.

**Scoped engine improvement:** the same blur, page visibility and persisted/non-persisted page-exit handling existed in both earlier sessions. `src/browser/session.ts` now binds that browser policy once for all three games, using each host's lifetime signal. It delegates suspension, timing reset and disposal to the session. Focus, screen transitions, audio cue policy and gameplay state remain explicit local responsibilities. No scene manager or replacement audio manager was necessary.

**Platformer-specific:** rectangular solid collision, gravity, jump feel, physical level geometry, optional motes, death rules, touch jump edges and the horizontal follow camera stay local. The shared swept-circle helper remains appropriate for projectile/contact games and is not involved here. A generic input wrapper would obscure the difference between relative steering and simultaneous button holds, so the platformer input owner directly expresses its required actions.

**Remaining repetition:** the sessions each compose a clock, run, UI, renderer and sound adapter and each implements screen transitions. Those are short ownership boundaries with materially different rules (upgrades, combat, jumping), so this pass keeps them readable rather than introducing a universal run/entity model. Canvas drawing helpers remain local because their art vocabulary and use differ. The extracted browser lifetime binder removes the concrete duplicated policy without tying the games together.

## Local verification

`pnpm check` includes focused invariants for grounding, acceleration/braking, wall and ceiling blocking, thin-platform landing, variable jump height, coyote expiry, buffered jump consumption, collection, death, completion, pause and fresh runs. A deterministic action-only traversal reaches the bell across the entire authored route without changing simulation state. Camera checks cover uniform scaling and level bounds.

`pnpm check:browser` uses Chromium. The focused platformer check exercises real keyboard/touch input, cancellation, pause/resume, resize/blur, restart, terminal UI, audio failure, lazy boundaries, switching and resource disposal. The shared failed-construction check also covers the platformer. It uses outcome fixtures for focused UI verification; full authored-route reachability belongs to the simulation invariant. Physical-device feel and subjective listening require human review.
