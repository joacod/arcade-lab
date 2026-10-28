# Blastline

[Source](../../../src/games/blastline/) | [Catalog](../../../CATALOG.md)

An original Canvas 2D run-and-gun operation through **Border Station** and **Foundry Run**. The intended first-play pace is about 3–5 minutes. Destroy glowing power relays, rescue Bolt at the border, break the foundry's Bastion and reach each extraction pad. Completing a mission's requirements starts the collapse countdown. Extraction includes a short departure before the mission result.

## Playing

A/D or left/right runs, Space jumps, and releasing Space shortens the jump. Hold J to fire. W/up and S/down aim vertically while stationary and diagonally while moving. K throws a fused grenade. Reach Bolt to rescue him and switch automatically to his launcher; Q then swaps operators. Touch directions, Jump, Fire, Grenade and Switch own independent pointers. Escape/P pauses. Menus offer Resume, Restart, Game selection, sound mute and fullscreen.

Nova's accurate automatic rifle opens small holes through sustained fire. Bolt's slower rockets damage groups of tiles and machines. Operator explosives are safe at close range; volatile barrels and machine attacks hurt. Guards commit to short bursts, while heavy units and the Bastion mark a target before firing stronger shells. Move away from the warning line rather than standing in its path.

Five lives, health and brief hit immunity support retries. Death redeploys at the latest green supply post, preserving destruction, objectives and defeated machines. Each new supply post refills health and grenades once. Rescue and the next mission also resupply; redeployment guarantees a small grenade reserve. Restart creates intact terrain and clears all progress.

Brick cover and armored cover can break. Riveted structural steel stays solid. Destruction opens firing lanes, removes support and creates lower routes. Structural foundations, power decks and stairs preserve access to every required objective after all destructible tiles disappear. The final machine is required; ordinary guards can be bypassed. A locked extraction pad never advances the mission. The HUD points toward the nearest required objective, then toward extraction.

## Appearances

Options → Appearance offers **Iron coast** and **Arctic relay**. Arctic relay adds a cold skyline, snowfall, icy ledges and alternate operator and machine colors across both missions. Warning colors and material silhouettes retain their meaning. Pause, switch, then Resume with terrain damage, objectives and projectiles intact. The choice survives restart and mission transitions until returning to Game selection.

## Source ownership

| Responsibility | Owner in `src/games/blastline/` |
| --- | --- |
| Mission layout, placements, geometry, materials and operator tuning | `content.ts` |
| Mutable terrain, swept tile contact, actor collision and radial geometry | `terrain.ts` |
| Run data and semantic damage notifications | `state.ts` |
| Acceleration, variable jump, coyote time, jump buffer and aiming | `movement.ts` |
| Fire cadence, projectiles, grenade fuses, explosions and barrel worklist | `combat.ts` |
| Local patrol, detection, committed telegraphs and bursts | `enemies.ts` |
| Fresh runs, respawn, checkpoints, rescue and mission progression | `game.ts` |
| Action translation using shared button capture | `input.ts` |
| Uniform camera, original pixel characters/scenery and bounded effects | `presentation.ts` |
| Mission skies, material palettes, weather and operator/machine colors | `themes.ts` |
| HUD, menus and announcements | `ui.ts`, `style.css` |
| Original AudioBits recipes and local cue admission | `sound-recipes.ts`, `sound.ts` |
| Browser composition, sound activation and disposal | `app.ts` |

Terrain copies authored materials and health into each run. Axis-separated leading-edge sweeps query the current grid. Projectile segments test the occupied tiles in their swept bounds and choose the earliest terrain or actor contact. Contact removes or damages tiles before subsequent shots query them. Explosions use circle/rectangle intersection and an iterative barrel queue. A barrel is marked before enqueue, preventing cycles and repeated detonation. The queue can hold the finite projectile limit plus every authored barrel; all work resolves in simulation before presentation events are consumed.

Projectiles, queued blasts, semantic events, visual rings and particles have explicit bounds. Terrain rendering visits the visible tile range. Debris can be discarded when full without changing gameplay. Audio coalesces cues, orders milestones and heavy impacts before routine fire, throttles repeats and admits a small number of cues per batch through the shared voice-limited owner.

All visuals, cover artwork and procedural sound recipes were created for this game. There are no downloaded assets or additional art/audio licenses.

## Architecture decisions

Mutable terrain and destructible cover belong to the simulation. The renderer reads the current grid, while movement and projectiles query it after every change. Strict rectangle overlap reuses `src/engine/collision.ts`; swept tile contact and explosion geometry stay in `terrain.ts` because they depend on the mutable grid.

Appearance changes use the renderer’s `applyTheme` without replacing the run or terrain. Theme data owns visual material colors; collision and destructibility remain in gameplay content. Replacement artwork stays local, reusing the shared image loader only if it needs image preparation.

The local state contract connects movement, combat and objectives. Browser composition reuses the shared host, clock, input, focus/lifetime bindings and AudioBits owner. Fixed populations and visible tile traversal bound the work.

## Local verification

Local checks exercise the complete authored operation, destructive geometry and population limits. Chromium checks cover input, transitions, appearance changes that preserve the live operation, and teardown. See the [shared commands](../../architecture.md#local-verification).
