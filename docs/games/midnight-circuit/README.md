# Midnight Circuit

[Source](../../../src/games/midnight-circuit/) | [Catalog](../../../CATALOG.md)

An original street brawler with illustrated Canvas and modeled Three.js appearances. Rook follows a blackout through **Neon Backstreets** and **The Power Station**, then takes on the **Circuit Warden** to restore the city grid. A first successful run is intended to take roughly 4–6 minutes, with faster runs possible. There is no time limit.

## Play

| Control | Action |
| --- | --- |
| WASD / arrows | Move horizontally and into/out of the ground-depth lane |
| J | Light attack; successive presses chain jab, cross and a crowd-clearing kick |
| K | Heavy strike: broad contact, strong stagger and committed recovery |
| Space | Jump |
| J or K while airborne | Flying kick |
| Escape / P / Pause | Pause; Resume continues from the menu |
| Touch arrows + Strike / Heavy / Jump | Independent captured controls support simultaneous touches |

Align your feet with an opponent's ground lane before attacking. Read the red attack telegraphs and step into another lane, move behind the attacker or jump. Aerial kicks work during the jump's useful height window. Jabs and crosses isolate one opponent; finishers, heavy strikes and flying kicks can hit a crowd. Holding an attack button does not repeat it. Brief input buffering accepts a press during recovery; a short gap after a light strike preserves the next combo move.

Three lives cover the whole run. Losing a life cancels enemy attacks, restores health after a short fall and grants safe recovery time. Green repair cells restore health and score once, including cells awarded after street encounters. Entering the station restores health while preserving lives, elapsed time and scoring. Results show points, hits, best chain, time and remaining lives. Restart creates a fresh run; Game selection disposes the session.

## Appearance

Choose **Appearance** in Options at the title or while paused. **Neon diorama** is the default: a Three.js scene with articulated fighters, directional lighting, shadows, neon shop fronts, industrial transformer bays, rain and combat sparks. **Neon cinema** adds a vgpu/WebGPU bloom and color-grading pass to the same scene. **Illustrated arcade** retains the original Canvas art.

Switching keeps the current stage, enemies, score, health and attack timing. Resume continues the paused run. Choices survive restarts for this session. An unavailable renderer retains the working appearance; graphics loss restores Canvas. GPU code loads only when requested, and the shared host remains the sole frame-loop owner.

All appearances use distance-driven walking with a planted stance, lifted return step, bent knees and coordinated arm motion. Blocked input, jumps and hit pushes do not advance the gait. Presentation observes actor positions without modifying movement or combat rules.

## Encounters and combat

Each stage has three authored gated encounters. Streets introduce Strikers, add Bruisers, then combine them with flanking arrivals. The station adds heavier mixed waves before the solo Warden fight. Clearing every wave releases the gate. Actors are clamped to the same active arena and ground lane; no enemy can escape beyond the player's accessible geometry. Wave arrivals wait briefly after the last defeat, and populations stay bounded by authored groups.

Strikers close quickly and punch after a short warning. Bruisers move slowly, telegraph a committed smash and recover longer. A local attack token admits one startup/active attack at a time while other enemies reposition; a short gap prevents immediate crowd spam. Soft lane separation reduces stacking.

The Warden alternates a lane-locked forward charge and a broad ground impact. Step aside for the charge; jump or leave the marked ground-impact area. Its armor resists damage and stagger during attack commitment. The visible **OPEN** recovery window takes bonus damage. Defeat starts a short city-light restoration sequence before the final results.

Every attack has simulation-owned startup, active and recovery durations. Each swing owns a unique identity and hit list, so an active window cannot damage the same target repeatedly. Facing, horizontal range, lane tolerance, target elevation and immunity determine eligibility. Hitstun interrupts regular enemies, knockback decays in the simulation, and player damage grants brief immunity. Cosmetic flashes, impact rings, sparks and camera shake observe semantic events; they never decide hits or advance rules.

## Source and tuning

| Owner | Responsibility |
| --- | --- |
| `src/games/midnight-circuit/content.ts` | Typed stages, arena geometry, waves, pickups, fighter/enemy tuning and attack definitions |
| `src/games/midnight-circuit/game.ts` | Explicit x/lane/elevation coordinates, combat timing, AI, gates, lives, score and outcomes |
| `src/games/midnight-circuit/input.ts` | Translate shared button snapshots into movement and one-shot combat actions |
| `src/games/midnight-circuit/presentation.ts` | Uniform projection, encounter-framed camera, depth sorting, vector artwork, parallax, weather and bounded effects |
| `src/games/midnight-circuit/animation.ts` | Displacement observations, planted gait, knee bending and attack poses shared across appearances |
| `src/games/midnight-circuit/graphics.ts`, `appearance.ts` | Renderer contract, lazy loading, atomic replacement, cancellation and recovery |
| `src/games/midnight-circuit/three/diorama.ts` | Modeled scenery and fighters, orthographic projection, lighting, rain and bounded impact effects |
| `src/games/midnight-circuit/vgpu/` | Optional bloom and grading of the Three.js scene, WebGPU device and texture ownership |
| `src/games/midnight-circuit/ui.ts`, `style.css` | Scoped menus, HUD, boss bar, touch layout and user intents |
| `src/games/midnight-circuit/sound-recipes.ts`, `sound.ts` | Original AudioBits recipes, cue priorities, batch coalescing and throttling |
| `src/games/midnight-circuit/app.ts` | Composition, stepping, interruption, gesture audio activation and disposal |

Artwork dimensions never supply collision geometry. Shadows remain on the ground while elevation moves the painted body. Actors sort by ground lane independently of elevation. The camera frames the whole encounter with a uniform transform, including on narrow screens. Reduced motion suppresses rain, particles and shake. All artwork, cover illustrations and procedural sound recipes are original project-authored assets, covered by the repository MIT license. No external artwork or audio assets are required. The GPU appearances use the installed Three.js and vgpu dependencies.

## Architecture decisions

Lane-depth geometry, attack phases, hit ownership, combos, hitstun, crowd coordination, boss patterns and encounter progression belong to this game's simulation. Swept circles and platform solids have different contact rules. The projected camera and articulated animation stay local. The Three.js orthographic camera projects horizontal position, ground lane and elevation to the same uniform scale as Canvas. Model dimensions never feed back into gameplay. Static scenery is batched by material, internal resolution is bounded, and particle populations are capped. Renderer replacement disposes meshes, textures, graphics contexts and pending device preparation. The vgpu finish copies the freshly rendered Three.js canvas within the same host frame; it adds no independent scheduling or gameplay state.

The input adapter translates shared captured-button holds and edges into movement and combat actions. Browser composition uses the shared host, clock, focus/lifetime bindings and AudioBits owner. Timed gameplay transitions stay in simulation; cosmetic tails stay in presentation.

## Verification

`tests/unit/games/midnight-circuit/game.test.mjs` checks timing and hit ownership, lane/facing/height eligibility, crowd strikes, interruption, immunity and lives, gated waves, repairs, boss patterns and finale, pause, fresh runs and uniform projection. A deterministic controller completes both authored stages using actions alone and checks bounded crowds and attack coordination throughout.

`tests/unit/games/midnight-circuit/animation.test.mjs` checks displacement-driven gait, planted steps, pause, blocked movement, knockback, teleport handling and read-only observation.

`tests/browser/games/midnight-circuit/game.spec.ts` checks appearance replacement, retained run state, graphics-loss recovery, cancellation, opening, keyboard and simultaneous touch actions, cancellation, display/blur interruption, restart, boss-result composition, audio failure recovery and disposal. The shared construction-failure check includes this game. AudioBits recipes are validated, including JSON round trips, with the existing audio invariants.

Run `pnpm check` and `pnpm check:browser` as described in the [shared architecture](../../architecture.md).
