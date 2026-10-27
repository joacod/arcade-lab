# Midnight Circuit

An original Canvas 2D street brawler. Rook follows a blackout through **Neon Backstreets** and **The Power Station**, then takes on the **Circuit Warden** to restore the city grid. A first successful run is intended to take roughly 4–6 minutes, with faster runs possible. There is no time limit.

## Play

| Control | Action |
| --- | --- |
| WASD / arrows | Move horizontally and into/out of the ground-depth lane |
| J | Light attack; successive presses chain jab, cross and a crowd-clearing kick |
| K | Heavy strike: broad contact, strong stagger and committed recovery |
| Space | Jump |
| J or K while airborne | Flying kick |
| Escape / P / Pause | Pause; Resume fight continues from the menu |
| Touch arrows + Strike / Heavy / Jump | Independent captured controls support simultaneous touches |

Align your feet with an opponent's ground lane before attacking. Read the red attack telegraphs and step into another lane, move behind the attacker or jump. Aerial kicks work during the jump's useful height window. Jabs and crosses isolate one opponent; finishers, heavy strikes and flying kicks can hit a crowd. Holding an attack button does not repeat it. Brief input buffering accepts a press during recovery; a short gap after a light strike preserves the next combo move.

Three lives cover the whole run. Losing a life cancels enemy attacks, restores health after a short fall and grants safe recovery time. Green repair cells restore health and score once, including cells awarded after street encounters. Entering the station restores health while preserving lives, elapsed time and scoring. Results show points, hits, best chain, time and remaining lives. Restart creates a fresh run; Game selection disposes the session.

## Encounters and combat

Each stage has three authored gated encounters. Streets introduce Strikers, add Bruisers, then combine them with flanking arrivals. The station adds heavier mixed waves before the solo Warden fight. Clearing every wave releases the gate. Actors are clamped to the same active arena and ground lane; no enemy can escape beyond the player's accessible geometry. Wave arrivals wait briefly after the last defeat, and populations stay bounded by authored groups.

Strikers close quickly and punch after a short warning. Bruisers move slowly, telegraph a committed smash and recover longer. A local attack token admits one startup/active attack at a time while other enemies reposition; a short gap prevents immediate crowd spam. Soft lane separation reduces stacking.

The Warden alternates a lane-locked forward charge and a broad ground impact. Step aside for the charge; jump or leave the marked ground-impact area. Its armor resists damage and stagger during attack commitment. The visible **OPEN** recovery window takes bonus damage. Defeat starts a short city-light restoration sequence before the final results.

Every attack has simulation-owned startup, active and recovery durations. Each swing owns a unique identity and hit list, so an active window cannot damage the same target repeatedly. Facing, horizontal range, lane tolerance, target elevation and immunity determine eligibility. Hitstun interrupts regular enemies, knockback decays in the simulation, and player damage grants brief immunity. Cosmetic flashes, impact rings, sparks and camera shake observe semantic events; they never decide hits or advance rules.

## Source and tuning

| Owner | Responsibility |
| --- | --- |
| `src/brawler/content.ts` | Typed stages, arena geometry, waves, pickups, fighter/enemy tuning and attack definitions |
| `src/brawler/game.ts` | Explicit x/lane/elevation coordinates, combat timing, AI, gates, lives, score and outcomes |
| `src/brawler/input.ts` | Translate shared button snapshots into movement and one-shot combat actions |
| `src/brawler/presentation.ts` | Uniform projection, encounter-framed camera, depth sorting, vector poses, parallax, weather and bounded effects |
| `src/brawler/ui.ts`, `style.css` | Scoped menus, HUD, boss bar, touch layout and user intents |
| `src/brawler/sound-recipes.ts`, `sound.ts` | Original AudioBits recipes, cue priorities, batch coalescing and throttling |
| `src/brawler/app.ts` | Composition, stepping, interruption, gesture audio activation and disposal |

Artwork dimensions never supply collision geometry. Shadows remain on the ground while elevation moves the painted body. Actors sort by ground lane independently of elevation. The camera frames the whole encounter with a uniform transform, including on narrow screens. Reduced motion suppresses rain, particles and shake. All artwork, cover illustrations and procedural sound recipes are original project-authored assets, covered by the repository MIT license. No external art, audio or graphics dependency is required by this game.

## What the fourth genre revealed

- **Worked unchanged:** synchronous application sessions, guarded lazy imports, host measurement/fullscreen/single frame loop, bounded fixed-step clock, page/focus bindings and the AudioBits session owner. No additional scheduler, scene manager or audio lifecycle was needed.
- **A demonstrated shared improvement:** Hollow and this game needed the same keyboard aliases, captured independent touch buttons, rising edges, cancellation and input clearing. `src/browser/buttons.ts` now owns that capture mechanism for both. Their small input adapters still decide which holds/edges mean movement, jump or combat. The existing relative-drag inputs have different responsibilities and remain with their owners.
- **Kept local:** lane-depth geometry, attack phases, hit ownership, combos, hitstun, crowd coordination, boss patterns and encounter progression. Neither swept circles nor platform solids simplify these rules. The projected camera and articulated vector animation also stay local.
- **Existing boundaries to preserve:** timed gameplay transitions belong to the simulation; cosmetic tails belong to presentation. The shared clock needs no attack or animation knowledge. Browser composition continues to choose focus and suspension policy.
- **Complexity and duplication:** one typed campaign and one local combat/AI owner are sufficient. Session composition repeats a short, explicit ownership pattern whose transitions differ across genres. No combat framework, ECS, compatibility layer, asset service or universal camera is justified here.

## Verification

`tests/brawler.test.mjs` checks timing and hit ownership, lane/facing/height eligibility, crowd strikes, interruption, immunity and lives, gated waves, repairs, boss patterns and finale, pause, fresh runs and uniform projection. A deterministic controller completes both authored stages using actions alone and checks bounded crowds and attack coordination throughout.

`tests/browser/brawler.spec.ts` checks opening, keyboard and simultaneous touch actions, cancellation, display/blur interruption, restart, boss-result composition, audio failure recovery and disposal. The shared construction-failure check includes this game. Hollow's existing browser check covers the other caller of shared button capture. AudioBits recipes are validated, including JSON round trips, with the existing audio invariants.

Run `pnpm check` and `pnpm check:browser` as described in the [shared architecture](architecture.md).
