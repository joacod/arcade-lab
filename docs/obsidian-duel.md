# Obsidian Duel

An original one-on-one fighter set on a storm-lit terrace of the Tempest Citadel. Choose **Nera, the Stormweaver**, or **Kael, the Citadel Fist**, then face the other fighter as a CPU opponent. Win two rounds to take the match. Rematch starts a fresh match with the same selection; return to Game selection to choose again.

## Fighting

A/D or left/right moves. W/Up (also Space) jumps. S/Down crouches. J is light, K heavy, L special and Shift guards. Crouching J sweeps; airborne J or K attacks overhead. Escape/P pauses. Touch buttons support independent held movement, crouch and guard alongside attack presses. Release controls during round transitions before pressing again.

Standing guard stops ordinary strikes and overheads. Crouching guard stops ordinary strikes and lows, but loses to overheads. Guard prevents damage and briefly locks movement in blockstun. You cannot guard in the air. A sweep catches standing opponents but passes below a jump. Attacks are commitments: wait for a heavy to miss, then approach during recovery. A short press buffer helps time your next action near the end of recovery.

Nera moves faster and recovers sooner. Her **Stormglass** bolt covers distance, can be guarded or jumped, and has a cooldown. Kael has longer, heavier strikes. **Riftbreaker** telegraphs a committed advancing punch with a long punishable recovery. Both fighters have a sweep and an airborne overhead. No move requires a directional combination.

The timer runs only during combat. A knockout ends the round immediately; time-out awards it to the healthier fighter. Equal health or simultaneous knockout is a draw, awarding neither fighter a win and starting another round. Each round restores health, spacing and cooldowns. A knockdown leads through a protected wake-up; short protection at the end of hitstun prevents corner loops. Bodies stay ordered even in the air, so jumps challenge crouch guard without cross-ups.

## Source ownership

| Owner | Responsibility |
| --- | --- |
| `src/fighter/content.ts` | Typed roster, physical arena and move tuning |
| `src/fighter/game.ts` | Pure fighter states, attack instances, contact, guard, projectiles and match rounds |
| `src/fighter/cpu.ts` | Seeded decisions using delayed visible observations and ordinary action commands |
| `src/fighter/input.ts` | Shared captured-button snapshots translated into fighting actions |
| `src/fighter/presentation.ts` | Uniform arena transform, articulated poses, original scenery and bounded contact effects |
| `src/fighter/ui.ts`, `style.css` | Selection, menus, health, timer, round wins, special readiness and touch controls |
| `src/fighter/sound-recipes.ts`, `sound.ts` | Original AudioBits recipes, cue priorities and throttling |
| `src/fighter/app.ts` | Host, clock, focus, display changes, audio and session disposal |

Simulation records horizontal position, elevation, velocity and facing independently of poses. Startup, active and recovery windows belong to authored move data. Each swing retains its contacted opponent; projectiles own their own swept horizontal contact and expiration. Both attacks advance before contact collection, allowing simultaneous trades without player-index priority. Only the simulation decides hits.

The CPU samples visible spacing, telegraphs and incoming bolts, then receives those observations after a reaction delay. Decisions have their own cadence and seeded mistakes. The CPU cannot read player inputs or buffered commands and uses the same movement, guard, cooldown and combat restrictions as the player.

All artwork is original procedural Canvas geometry, including the selection cover's original SVG composition. There are no downloaded art or sound assets. The scarf, split coat, light wraps and fast kicks distinguish Nera from Kael's broad mantle, armored shoulder, greaves and committed punches. Poses read simulation states. Reduced motion removes shake and storm flourishes and reduces particles while retaining all combat information.

## What the fifth genre revealed

The existing application mount contract, lazy imports, browser host, fixed clock, page/focus bindings, captured buttons and bounded AudioBits owner work unchanged for a fixed side-view arena. The session clears input and resets the clock at every round-phase transition as well as display and menu transitions. Async sound activation retains the shared owner's cancellation guards.

Guard height, projectiles, bilateral trades, stun exits and best-of-three ownership are local fighting rules. Midnight Circuit's swing ownership and timing were useful references, but its lane contacts, crowd control, attack tokens, encounter gates and scrolling camera remain independent. A generic combat engine would couple different rules without simplifying either implementation. No new shared combat abstraction is needed.

The Chromium run exposed a cold development-server reload during lazy audio imports. AudioBits now joins the existing explicit Vite dependency pre-optimization list. This affects development preparation only; game sound still loads through its existing lazy boundary and starts only in a user gesture.

Focused invariants cover attack timing and single-hit ownership, guards, interruption and wake-up, body bounds, specials, trades, timer decisions and complete CPU matches. Chromium verifies the session lifecycle and independent touch holds; the shared audio check also exercises every duel recipe's output, burst admission and adapter coalescing.
