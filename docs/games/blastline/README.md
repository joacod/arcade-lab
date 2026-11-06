# Blastline

[Source](../../../src/games/blastline/) | [Controls](../../../CATALOG.md#blastline) | [Shared contracts](../../architecture.md)

An original Canvas 2D run-and-gun operation through **Border Station** and **Foundry Run**. The intended first-play pace is about 3–5 minutes. Destroy glowing power relays, rescue Bolt at the border, break the foundry's Bastion and reach each extraction pad. Completing a mission's requirements starts the collapse countdown. Extraction includes a short departure before the mission result.

## Playing

Release Jump for a shorter hop. Reach Bolt to rescue him and switch automatically to his launcher; Switch then swaps operators. Touch movement and actions support simultaneous holds.

Nova's accurate automatic rifle opens small holes through sustained fire. Bolt's slower rockets damage groups of tiles and machines. A quick Fire tap just before weapon recovery ends is remembered briefly and fires once using the current aim. Holding Fire repeats normally; releasing a hold stops it. Pause, death and operator changes clear pending shots. Operator explosives are safe at close range; volatile barrels and machine attacks hurt. Guards commit to short bursts, while heavy units and the Bastion mark a target before firing stronger shells. Move away from the warning line rather than standing in its path.

Five lives, health and brief hit immunity support retries. Death redeploys at the latest green supply post, preserving destruction, objectives and defeated machines. Each new supply post refills health and grenades once. Rescue and the next mission also resupply; redeployment guarantees a small grenade reserve. Restart creates intact terrain and clears all progress.

Brick cover and armored cover can break. Riveted structural steel stays solid. Destruction opens firing lanes, removes support and creates lower routes. Structural foundations, power decks and stairs preserve access to every required objective after all destructible tiles disappear. The final machine is required; ordinary guards can be bypassed. A locked extraction pad never advances the mission. The HUD points toward the nearest required objective, then toward extraction.

## Theme modes

Artwork must distinguish breakable brick and armored cover from structural steel, with aim, warnings and extraction cues visible through debris. The industrial coast is the starting setting for future art direction.

**Arcade / Ember Coast** gives that same operation detailed arcade commandos, armored security, a tracked Bastion, weathered cover, supply equipment and illustrated harbor/foundry panoramas. Teal Nova and ochre Bolt keep their identities. The [artwork guide](../../../src/games/blastline/art/README.md#ember-coast--arcade) owns its creative brief and atlas contracts.

**Deluxe / Ember Reforged** reinterprets the same cast and coast as smooth, dimensional painted illustrations. Nova retains her teal field jacket, dark hair and red scarf; Bolt keeps his ochre helmet, goggles and broad launcher. Olive security, rust-armored heavies and the orange-eyed tracked Bastion retain their silhouettes. New whole-character aim, recoil, airborne and six-cel running illustrations accompany new relay, supply, rescue, extraction and cover artwork. Steel, chipped ochre brick and X-braced rust armor stay distinct. Harbor cranes and furnace halls sit behind the action in quiet atmospheric layers; warm rim light and cool metal give volume without obscuring contacts. Amber relay glass, green supplies, sharp weapon flares and the extraction aircraft provide the scene's focal moments. A brushed navy-and-brass interface completes the treatment. Canvas 2D renders the image bundle. The [Deluxe artwork contract](../../../src/games/blastline/art/README.md#ember-reforged--quality) owns its sources, atlas layouts and exports.

![Ember Reforged: painted commandos and a tracked Bastion against the coastal foundry](preview.webp)

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
| Uniform camera, complete sprite drawing, procedural scenery and bounded effects | `presentation.ts` |
| Grounded travel observations and continuous walking/running phase | `animation.ts` |
| Mission skies, material palettes, weather and operator/machine colors | `themes.ts` |
| Sprite roles, atlas layouts, draw footprints and operator frame selection | `sprite-art.ts` |
| Ember Coast image URLs, preparation and decoded-dimension validation | `assets.ts` |
| Ember Reforged image URLs, preparation and decoded-dimension validation | `deluxe.ts` |
| HUD, menus and announcements | `ui.ts`, `style.css` |
| Original AudioBits recipes and local cue admission | `sound-recipes.ts`, `sound.ts` |
| Browser composition, sound activation and disposal | `app.ts` |

Terrain copies authored materials and health into each run. Axis-separated leading-edge sweeps query the current grid. Projectile segments test the occupied tiles in their swept bounds and choose the earliest terrain or actor contact. Contact removes or damages tiles before subsequent shots query them. Explosions use circle/rectangle intersection and an iterative barrel queue. A barrel is marked before enqueue, preventing cycles and repeated detonation. The queue can hold the finite projectile limit plus every authored barrel; all work resolves in simulation before presentation events are consumed.

Projectiles, queued blasts, semantic events, visual rings and particles have explicit bounds. Terrain rendering visits the visible tile range. Debris can be discarded when full without changing gameplay. Audio prioritizes milestones and heavy impacts over routine fire.

The [artwork guide](../../../src/games/blastline/art/README.md) owns the complete sprite layouts and editable sources. Arcade and Deluxe each supply their own authored scenery and effects.

## Architecture decisions

`Mission.environment` selects harbor or foundry scenery independently of mission order. New or reordered missions can reuse either environment.

Mutable terrain and destructible cover belong to the simulation. The renderer reads the current grid, while movement and projectiles query it after every change. Strict rectangle overlap reuses `src/engine/collision.ts`; swept tile contact and explosion geometry stay in `terrain.ts` because they depend on the mutable grid.

Appearance changes use `presentation.ts`’s reversible `replaceTheme` on the existing camera and effects. `app.ts` owns candidate preparation and the active image bundle through the [shared replacement contract](../../architecture.md#replacement-and-recovery). `themes.ts` maps scenery materials; `sprite-art.ts` owns both presentations’ typed atlas layouts, role mappings, draw footprints and image validation, `assets.ts` owns Ember Coast's bundle, and `deluxe.ts` owns Ember Reforged's bundle. Character cels share aim/travel observations. Deluxe uses smooth image sampling, its own larger atlases and authored standing recoil cels, while pixel modes retain nearest-neighbor sampling and scanlines. Cosmetic animation freezes with the paused operation; reduced motion holds grounded idle poses and suppresses recoil, shake, muzzle flashes, hit glow and explosion motion.

The local state contract connects movement, combat and objectives. Fixed populations and visible tile traversal bound the work.

## Local verification

The [game invariants](../../../tests/unit/games/blastline/game.test.mjs) protect destructive geometry, population limits and operation rules. [Animation and atlas checks](../../../tests/unit/games/blastline/animation.test.mjs) protect stride timing and role bounds. The collection [startup smoke](../../../tests/browser/app/startup.spec.ts) verifies Arcade readiness and starting play. Use the [shared verification guidance](../../architecture.md#local-verification).
