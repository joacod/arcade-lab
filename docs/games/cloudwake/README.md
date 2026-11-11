# Cloudwake

![Cloudwake · The Sunward Route](preview.webp)

A one-button endless flight through a sunlit sky civilization. Carry a satchel of lost light between ivory ruins on a little turbine scooter. Hold to rise, release to descend, dodge coral crystals and collect turquoise fragments. The complete presentation is **Arcade · The Sunward Route**.

## Flight and progression

Thrust is continuous acceleration with bounded ascent and descent speeds. Reversing the held state adds braking against existing velocity, making corrections quick without removing inertia. The same initial press that starts, continues or restarts a flight applies thrust. The cloud boundaries cushion contact; structures and storm mines cost a life. The courier's compact collision body excludes scarf and exhaust.

A flight begins with the forgiving **Sunward Approach**. Each checkpoint advances to a new leg: **High / Low** alternates offset gates and introduces mines in the middle lane, **Crystal Steps** tightens the weave, and **Storm Run** combines longer passages with high/low reversals. Further legs remix Storm Run at the capped difficulty. Seeded mirroring and small height variations change each route without removing its intended movement demands. Every sixth pattern is a clear-air checkpoint pocket.

The route's feasibility check integrates the actual flight physics from both edges and the center of the previous corridor, with extreme entry velocities and both possible holds during a reaction allowance. It checks clearance over the full next obstacle width at maximum scroll speed, extending empty travel if necessary. Moving mines remain outside that corridor throughout their oscillation; later corridors sit above or below mines that threaten the center lane. Fragments trace arcs inside the safe corridors.

Each flight starts with three lives. Passing a checkpoint's winged lantern opens its shutters and lights its crystal, with an activation ripple, chime and saved-route badge. The HUD retains the checkpoint and current leg. An unshielded crash stops play and offers **Continue** while lives remain; the third ends the flight. Continue restores the latest checkpoint's distance, score, fragment streak, shield charge, cleared passages, seeded route and difficulty clock. It places the courier at rest in the center of the pocket, with clear travel before the next hazard. Before the first checkpoint, Continue returns to launch. Lives never refill at checkpoints. Restart creates a fresh route with three lives. Checkpoints last only for this flight, with no browser persistence.

Speed rises gradually toward a cap over the first 90 seconds of route progress. There is no time limit. Distance contributes one point per displayed meter. Fragments start at 25 points each; every five consecutive pickups raises the value of subsequent fragments through ×2, ×3 and ×4. Missing a fragment resets the multiplier. Points pop at the pickup, and multiplier milestones receive their own acknowledgement.

Collecting 15 fragments charges a **light shield**, shown around the courier and in a HUD meter. It absorbs one collision and provides brief recovery protection to clear the obstacle, then needs another 15 fragments to recharge. A shield hit also breaks the collection streak. Charge carries through missed fragments but cannot stockpile beyond one shield. Replayed sections restore checkpoint rewards first, so neither points nor charge can be farmed across lives. Every five cleared hazards earns a short acknowledgement.

Hold Space, W, ↑, mouse/touch on the playfield, or the mobile Rise button. Release to descend. See [shared menus, controls and lifecycle](../../../CATALOG.md) for pause, sound, fullscreen and navigation.

## Local owners and adaptation

| Owner | Responsibility |
| --- | --- |
| `content.ts` | Physical geometry, acceleration, braking and speed progression |
| `route.ts` | Seeded patterns, corridor feasibility and mine motion |
| `game.ts` | Mutable run, collision, lives, checkpoint snapshots, fragment streaks, shields, score and semantic events |
| `app.ts` | Browser composition, fresh runs, checkpoint continuation and readiness/recovery |
| `input.ts` | Shared button owner plus playfield and launch-hold capture |
| `ui.ts`, `style.css` | HUD, results and shared menu composition |
| `presentation.ts` | Whole-cel roles, checkpoint activation, uniform projection, image preparation, stable world-indexed clouds and bounded effects |
| `sound.ts`, `sound-recipes.ts` | Quiet turbine pulses, glass pickups, multiplier/shield cues, checkpoint chime and hull impact |
| [Artwork guide](../../../src/games/cloudwake/art/README.md) | Asset roles, provenance and prompts |

To adapt the foundation, replace complete courier cels, object images and scenery, update local role dimensions/anchors, then tune the flight and route values. Geometry does not come from image dimensions. The renderer uses a single uniform transform; narrow screens retain a minimum look-ahead width and center the flight band in the available scenery. Reduced motion suppresses cosmetic parallax, trails, flashes and animation cycling while preserving flight and moving-hazard cues.

Shared lifecycle, preparation and AudioBits ownership follow the [architecture](../../architecture.md). No new engine or rendering framework is required. Focused mechanics tests live in `tests/unit/games/cloudwake/`; the catalog-driven startup smoke includes Cloudwake. Use the [local verification commands](../../architecture.md#local-verification).

## Design references

These references inform local decisions; no artwork or implementation code was copied.

- [Luke Muscat — Depth in Simplicity](https://gdcvault.com/play/1015316/Depth-in-Simplicity-The-Making), with [speaker slides](https://media.gdcvault.com/gdc2012/slides/Design%20Track/Muscat_Luke_DepthInSimplicity.pdf): one-button accessibility, interval fairness, alternating pressure and relief, and low retry friction.
- [CS50 — Flappy Bird](https://cs50.harvard.edu/extension/games/2026/spring/notes/1/): scrolling layers, bounded procedural objects, collision and explicit game states. Cloudwake uses continuous thrust rather than tap impulses.
- [Glenn Fiedler — Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/): stable physics through the existing fixed-step clock.
- Robert Nystrom's [Game Loop](https://gameprogrammingpatterns.com/game-loop.html) and [State](https://gameprogrammingpatterns.com/state.html), also available in the [author's source](https://github.com/munificent/game-programming-patterns/tree/master/book): keep simulation, rendering and screen transitions explicit within existing owners.
- MDN [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Using_Pointer_Events) and [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action): capture holds and clear cancellation without native panning on the game surface.
- [Halfbrick's Jetpack Joyride](https://www.halfbrick.com/games/jetpack-joyride-classic): mechanical and pacing inspiration. Helicopter Game and Flappy Bird also inform the hold/release genre; Cloudwake has its own setting, artwork and movement tuning.
- [Imangi's Temple Run](https://imangistudios.com/thegames/temple-run/): collection tied to power-ups and character unlocks. Cloudwake applies that reward connection within the current flight through fragment multipliers and an earned shield.
