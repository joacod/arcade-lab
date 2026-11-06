# Obsidian Duel

[Source](../../../src/games/obsidian-duel/) | [Controls](../../../CATALOG.md#obsidian-duel) | [Shared contracts](../../architecture.md)

An original one-on-one fighter set on a storm-lit terrace of the Tempest Citadel. Choose **Nera, the Stormweaver**, or **Kael, the Citadel Fist**, then face the other fighter as a CPU opponent. Win two rounds to take the match.

## Fighting

Crouching Light sweeps; airborne Light or Heavy attacks overhead. Touch movement, crouch and guard can be held alongside attack presses. Release controls during round transitions before pressing again.

Standing guard stops ordinary strikes and overheads. Crouching guard stops ordinary strikes and lows, but loses to overheads. Guard prevents damage and briefly locks movement in blockstun. You cannot guard in the air. A sweep catches standing opponents but passes below a jump. Attacks are commitments: wait for a heavy to miss, then approach during recovery. A short press buffer helps time your next action near the end of recovery.

Hold a direction at takeoff to commit to a forward or backward jump, or jump vertically without one. Attacking preserves that trajectory; taking a hit interrupts horizontal drift. Jump over an opponent to change sides. Fighters automatically face one another when free to act; a committed attack keeps its facing until it ends. Delay an aerial strike until after crossing to attack back toward the opponent. Jump plus light/heavy can be pressed together near the end of recovery to buffer a jumping overhead. Commands expire quickly, and pauses and round transitions discard them. A heavy buffered before landing remains a heavy once landing recovery ends.

Labels above the opponent distinguish low sweeps, overheads, heavy strikes and bolts during their actual startup and active windows. **RECOVERING** marks the committed recovery of a heavy, sweep or Riftbreaker, including a miss. Close distance to punish an opening; the label does not change attack reach or guarantee a hit.

Nera moves faster and recovers sooner. Her **Stormglass** bolt covers distance, can be guarded or jumped, and has a cooldown. Kael has longer, heavier strikes. **Riftbreaker** telegraphs a committed advancing punch with a long punishable recovery. Both fighters have a sweep and an airborne overhead. No move requires a directional combination.

The timer runs only during combat. A knockout ends the round immediately; time-out awards it to the healthier fighter. Equal health or simultaneous knockout is a draw, awarding neither fighter a win and starting another round. Each round restores health, spacing and cooldowns. A knockdown leads through a protected wake-up; short protection at the end of hitstun prevents corner loops. Grounded push bodies prevent walking through an opponent; sufficient vertical clearance permits a jump-over. Landing restores separation in the current left/right order. Guard uses the Guard button and height rather than a directional input, so holding the correct guard still protects after a side switch.

**Game setup** from pause or results returns to fighter selection. **Restart** begins a fresh match with the selected fighter.

## Theme modes

The two presentations express the same astronomical citadel, fighters and combat vocabulary at different levels of finish. Their artwork is independent; only semantic animation timing, cosmetic atlas layout and gameplay observations are shared. Follow the [shared mode contracts](../../architecture.md#mode-contract) when extending them. The [artwork guide](../../../src/games/obsidian-duel/art/README.md) owns the detailed briefs, sources and export specifications.

- **Arcade · Eclipse Foundry:** retain the expressive painted Nera and Kael in an old-school hand-painted arcade treatment. A layered foundry arena adds weathered columns, a copper eclipse orrery, distant aqueducts, forge-lit walls and banners. Separate illustrated ribbons distinguish heel, punch, sweep and aerial attacks.
- **Deluxe · Moonfall Sanctum:** new detailed fighter drawings reinterpret the same costumes with embroidery, cloth volume, leather wear and bronze trim. The illustrated lunar observatory, carved perimeter, wet basalt and restrained reflections support a new jade-and-gold effects atlas. Deluxe upgrades actors and combat artwork as well as scenery.

![Moonfall Sanctum: detailed Nera and Kael with a jade Crescent heel trail](preview.webp)

## Combat presentation

Every mode communicates standing and crouching guard, jump ascent/apex/descent, anticipation, active attack, recovery, landing, injury, knockdown and wake-up. Travel drives walking; holding against a boundary does not march in place. Complete drawings supply the anatomy and clothing, with no runtime body assembly. Grounded cels use support pivots, while jumping cels retain a virtual ground pivot above the simulation's elevation.

Move trails appear only during the actual active window, including a miss. Nera's Crescent heel has a tall jade crescent, sweeps stay near the ground, aerial attacks descend diagonally, and Kael's punches and Riftbreaker produce horizontal copper pressure. Stormglass artwork tracks the actual projectile and mirrors with its own facing. Trail extents are cosmetic and do not determine reach or collision. Contact bursts require a hit or block event; charge, release, knockdown and misses cannot manufacture hit confirmation. Guard seals differ in shape and color from damage bursts. The existing opponent labels remain above artwork and explain guard height and recovery.

Keep important silhouettes, bolts and warnings distinct from the quiet central scenery. Edge props remain behind the fight lane, ground seals lie flat beneath feet, and effects stay bounded. The uniform camera and all physical geometry remain independent of illustration dimensions. A theme replacement preserves the current match and animation observations through the [shared replacement contract](../../architecture.md#replacement-and-recovery), with Arcade as the recovery presentation.

Reduced motion preserves physical movement, action cels, warnings and contact confirmation. It removes idle breathing, shake, drifting scenery and pulsing lights, reduces sparks, and keeps contact artwork at a steady size. Active run time owns animation; pause freezes it. Deluxe uses Canvas 2D with the same context as the other modes.

## Source ownership

Paths below are relative to `src/games/obsidian-duel/`.

| Owner | Responsibility |
| --- | --- |
| `content.ts` | Typed roster, physical arena and move tuning |
| `game.ts` | Pure fighter states, attack instances, contact, guard, projectiles and match rounds |
| `cpu.ts` | Seeded decisions using delayed visible observations and ordinary action commands |
| `input.ts` | Shared captured-button snapshots translated into fighting actions |
| `themes.ts` | Theme names, stage palettes and cue colors |
| `animation.ts` | Cosmetic action observations, travel-driven walking and semantic whole-cel timing |
| `presentation.ts` | Uniform arena transform, mode-specific cels, move trails and bounded contact effects |
| `asset-art.ts`, `assets.ts` | Whole-body cel layout, validation and Foundry image preparation |
| `deluxe-assets.ts`, `deluxe-art.ts`, `deluxe-presentation.ts` | Independent detailed sprite preparation, eight effect anchors, lunar scene, mist and reflections |
| `asset-presentation.ts` | Complete painted Eclipse Foundry action cels, bolts and contact artwork |
| `ui.ts`, `style.css` | Selection, menus, health, timer, round wins, special readiness and touch controls |
| `sound-recipes.ts`, `sound.ts` | Original AudioBits recipes, cue priorities and throttling |
| `app.ts` | Host, clock, focus, display changes, audio and session disposal |

Simulation records horizontal position, elevation, velocity and facing. Startup, active and recovery windows belong to authored move data. Each swing retains its contacted opponent; projectiles own their own swept horizontal contact and expiration. Both attacks advance before contact collection, allowing simultaneous trades without player-index priority.

The CPU samples visible spacing, telegraphs and incoming bolts, then receives those observations after a reaction delay. Decisions have their own cadence and seeded mistakes. The CPU cannot read player inputs or buffered commands and uses the same movement, guard, cooldown and combat restrictions as the player.

All modes use complete image sprites through Canvas; the selection cover remains an editable SVG. Nera's ivory tunic, turquoise sash and fast kicks distinguish her from Kael's charcoal wrap, copper sash and committed punches. Each atlas covers the same 16 semantic clips. The [artwork guide](../../../src/games/obsidian-duel/art/README.md#cel-layout-and-timing) owns source sheets, frame selection, pivot packing and pose requirements.

## Architecture decisions

Guard height, projectiles, bilateral trades, stun exits and best-of-three ownership are local fighting rules. Their contact and progression semantics differ from a scrolling brawler's lane geometry, crowd coordination and encounter gates.

Round-phase changes clear held controls and buffered commands.

## Local verification

The [game invariants](../../../tests/unit/games/obsidian-duel/game.test.mjs) cover guards, wake-up, body bounds, bilateral trades, timer decisions and bounded CPU matches. [Animation](../../../tests/unit/games/obsidian-duel/animation.test.mjs) and [asset](../../../tests/unit/games/obsidian-duel/assets.test.mjs) checks protect pivots, cel coverage, displacement-driven walking and attack timing. The collection [startup smoke](../../../tests/browser/app/startup.spec.ts) verifies Arcade readiness and starting play.

See the [shared commands](../../architecture.md#local-verification).
