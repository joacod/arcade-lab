# Cloudwake

![Cloudwake · The Sunward Route](preview.webp)

A one-button endless flight through a sunlit sky civilization. Carry a satchel of lost light between ivory ruins on a little turbine scooter. Hold to rise, release to descend, dodge coral crystals and collect turquoise fragments. The complete presentation is **Arcade · The Sunward Route**.

## Flight and progression

Thrust is continuous acceleration with bounded ascent and descent speeds. Reversing the held state adds braking against existing velocity, making corrections quick without removing inertia. The same initial press that starts or restarts a flight applies thrust. The cloud boundaries cushion contact; only structures and storm mines end a run. The courier's compact collision body excludes scarf and exhaust.

A flight begins with broad lower and upper obstacles, then introduces paired gates and floating mines. Each seeded route moves a bounded safe corridor between patterns. Its feasibility check integrates the actual flight physics from both edges and the center of the previous corridor, with extreme entry velocities and both possible holds during a reaction allowance. It checks clearance over the full next obstacle width at maximum scroll speed, extending empty travel if necessary. Moving mines remain outside that corridor throughout their oscillation. Fragments trace a small arc inside it. Every sixth pattern is a clear-air pocket.

Speed rises gradually toward a cap over the first 90 seconds, while gaps tighten toward a minimum. There is no time limit or upgrade economy. Distance contributes one point per displayed meter, and each fragment adds 25 points. Every five cleared hazards earns a short visual/audio acknowledgement.

Hold Space, W, ↑, mouse/touch on the playfield, or the mobile Rise button. Release to descend. See [shared menus, controls and lifecycle](../../../CATALOG.md) for pause, sound, fullscreen and navigation.

## Local owners and adaptation

| Owner | Responsibility |
| --- | --- |
| `content.ts` | Physical geometry, acceleration, braking and speed progression |
| `route.ts` | Seeded patterns, corridor feasibility and mine motion |
| `game.ts` | Mutable run, collision, collectibles, score and semantic events |
| `app.ts` | Browser composition, fresh runs and readiness/recovery |
| `input.ts` | Shared button owner plus playfield and launch-hold capture |
| `ui.ts`, `style.css` | HUD, results and shared menu composition |
| `presentation.ts` | Whole-cel roles, uniform projection, image preparation, parallax and bounded effects |
| `sound.ts`, `sound-recipes.ts` | Quiet turbine pulses, glass pickups, passage reward and hull impact |
| [Artwork guide](../../../src/games/cloudwake/art/README.md) | Asset roles, provenance and prompts |

To adapt the foundation, replace complete courier cels, object images and scenery, update local role dimensions/anchors, then tune the flight and route values. Geometry does not come from image dimensions. The renderer uses a single uniform transform; narrow screens retain a minimum look-ahead width and center the flight band in the available scenery. Reduced motion suppresses cosmetic parallax, trails, flashes and animation cycling while preserving flight and moving-hazard cues.

Shared lifecycle, preparation and AudioBits ownership follow the [architecture](../../architecture.md). No new engine or rendering framework is required. Focused mechanics tests live in `tests/unit/games/cloudwake/`; the catalog-driven startup smoke includes Cloudwake. Use the [local verification commands](../../architecture.md#local-verification).

## Design references

These references inform local decisions; no artwork or implementation code was copied.

- [Luke Muscat — Depth in Simplicity](https://www.gdcvault.com/play/1015527/Depth-in-Simplicity-The-Making), with [speaker slides](https://media.gdcvault.com/gdc2012/slides/Design%20Track/Muscat_Luke_DepthInSimplicity.pdf): one-button accessibility, interval fairness, alternating pressure and relief, and low retry friction.
- [CS50 — Flappy Bird](https://cs50.harvard.edu/extension/games/2026/spring/notes/1/): scrolling layers, bounded procedural objects, collision and explicit game states. Cloudwake uses continuous thrust rather than tap impulses.
- [Glenn Fiedler — Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/): stable physics through the existing fixed-step clock.
- Robert Nystrom's [Game Loop](https://gameprogrammingpatterns.com/game-loop.html) and [State](https://gameprogrammingpatterns.com/state.html), also available in the [author's source](https://github.com/munificent/game-programming-patterns/tree/master/book): keep simulation, rendering and screen transitions explicit within existing owners.
- MDN [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Using_Pointer_Events) and [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action): capture holds and clear cancellation without native panning on the game surface.
- [Halfbrick's Jetpack Joyride](https://www.halfbrick.com/games/jetpack-joyride-classic): mechanical and pacing inspiration. Helicopter Game and Flappy Bird also inform the hold/release genre; Cloudwake has its own setting, artwork and movement tuning.
