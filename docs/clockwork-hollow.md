# Clockwork Hollow

A complete Canvas 2D platform adventure through three mechanical ruins reclaimed by nature. A small brass keeper wakes three bells, climbing from the aqueduct through a pressure-powered foundry to the starlit belfry. The intended first-play pace is approximately 3–6 minutes, with no time limit. An optimized deterministic traversal takes about 2:23 of active time; exploration, cautious crossings and retries add time. Human playtesting still needs to validate the intended pace and difficulty.

## Playing

Move with A/D or left/right arrows. Jump with Space, W, Up or Z. Hold to jump higher and release for a short hop. Touch controls allow independent, simultaneous movement and jumping. Escape, P or Pause suspends play. Resume always requires an explicit gesture. There is no automatic repeat jump.

| District | Challenges and identity |
| --- | --- |
| The Waking Aqueduct | Moss-green arches, small steps, broken spans, copper thorns, beetles and a rising spillway. Broad recovery islands introduce the rhythm. |
| The Emberworks | Warm pipework and machinery. Pressure vents introduce waiting and reading warnings; upper ledges offer optional motes before the longer foundry crossings. |
| The Starlit Belfry | Cool stone, stars and moonlight. Successive narrow ascents combine beetles, thorns and staggered vents, ending at the bell above the canopy. |

Thin ledges are solid on every side. Wind-up beetles patrol between fixed endpoints, reversing at the ends. Landing on their shells disables them and bounces the keeper upward. Side contact is dangerous. Vents cycle through **CLEAR** (blue), a dashed amber warning, and a solid coral pressure column. Only the column's active phase is dangerous. Text, silhouettes and boundaries supplement the colors.

Falling, thorns, active pressure or beetle contact ends an attempt. Each district has two lantern checkpoints. Touching a lantern lights it, plays a chime and announces the saved return point. **Try again** returns to the district start; **Return to lantern** returns to the latest checkpoint. Retry resets velocity, jump buffers, enemies, vent phase, camera and cosmetics, while retaining collected motes, active journey time and missed steps. Checkpoints last only for this session.

Every bell ends its district and freezes simulation. An explicit **Enter…** action starts the next district. The third bell completes the journey. Results show bells, motes, active time, missed steps, points and a completion distinction for full collection or a clean journey. Optional motes and bells award points; missed steps reduce them. Neither retrying enemies nor revisiting collected motes awards extra points. Scoring amounts live in `game.ts`.

**Restart journey** and **Walk it again** create an entirely fresh adventure. Pause, menu time and suspended wall time do not count toward journey time. Focus loss, hiding the page, leaving the play controls and display changes pause play and clear input. Fullscreen is available in menus when supported. Game selection releases the entire session. Unavailable or muted audio leaves play usable.

![The Emberworks: a saved lantern beside an active pressure column](images/clockwork-emberworks.png)

![The Starlit Belfry: moonlit machinery and staggered pressure vents](images/clockwork-belfry.png)

## Source ownership and customization

| Change | Owner |
| --- | --- |
| Authored routes, physical geometry, checkpoint positions, patrol bounds, vent timings, motes and bell placement | `src/platformer/content.ts`: typed `Level` definitions and `journey` order |
| Movement and jump feel | `movement` in `content.ts`; explicit acceleration, collision and jump behavior in `game.ts` |
| Enemy and obstacle behaviors, checkpoints, progression and scoring | `game.ts`; no generic AI or entity framework |
| Character drawing, animation, environment artwork, camera and effects | `presentation.ts`; `keeper`, `scenery`, `stone` and the local enemy/vent drawings are the artwork entry points |
| Environment colors and district captions | `Level.palette`, `environment`, `name`, `subtitle` and `signs` in `content.ts` |
| Menu narrative, HUD, result copy and accessible controls | `ui.ts` and scoped `style.css` |
| Procedural sound design and cue policy | `sound-recipes.ts` and `sound.ts` |
| Keyboard edges, holds and captured touch buttons | `input.ts` |
| Browser composition and transitions | `app.ts`, using the shared host, clock, interruption/focus binders and AudioBits lifecycle |

Character and enemy visual dimensions never define their collision bodies. A replacement artwork implementation can preserve simulation, content, input and host ownership. If a later adaptation needs image loading, reuse the existing cancellable asset preparation pattern; this procedural game currently needs no asset loader or asynchronous preparation.

Simulation uses top-left player positions and authored rectangles. Swept edge crossings resolve the nearest solid contact. Coyote time tolerates a late takeoff, a short press buffer catches landing, and release cuts ascent once. Stronger ground braking keeps small platforms controllable. Collision and jump rules use only fixed simulation steps. Content includes all physical dimensions independently of leaves, scarf, glow and animation poses.

The camera uses one uniform world transform, minimum horizontal visibility on narrow displays, bounded velocity anticipation and a vertical dead zone to avoid chasing every hop. It clamps to the district, centers oversized axes and resets on retry, restart and level change. Resize pauses play and resets framing. Reduced motion removes follow interpolation, particles, mote bobbing, flywheel rotation, pressure motion, landing squash and bell swinging.

Parallax arches, foreground canopy, drifting lights, foundry pipes and belfry stars give the districts distinct depth. Platform edges, thorns, shells and pressure columns render in front of scenery. Landing squash, jump dust, shell impacts, lantern sparks and bell celebrations consume semantic events. Particles are capped and viewport-admitted, with finite lifetimes. Cosmetic tails can finish after defeat or completion without advancing rules; pause freezes them and frame deltas are bounded. All artwork, the selection cover and procedural sound are original application code under the repository's MIT license. No downloaded assets are used.

Sound uses a spring lift, soft stone/metal landing, descending unwinding damage, glass-like motes, shell clicks, filtered steam, rising lantern tones, district bells and a fuller final bell. Landing strength changes gain. Only nearby vents are audible. Routine cues are coalesced and throttled; outcomes replace lesser tails. The existing shared AudioBits owner provides lazy gesture activation, bounded voices, cancellation, suspension, mute and disposal.

## Local verification

`pnpm check` covers grounding/braking, walls and ceilings, thin-platform landing, variable jump height, coyote expiry, single-use buffered jumps, collection, hazard precedence, frozen outcomes, pause, independent restarts, patrol reversal, stomp versus side contact, vent warnings/damage, checkpoint retry and score retention. Content checks verify safe checkpoint support and patrol endpoints. A deterministic action-only route crosses all three districts, touches all six checkpoints and reaches victory without overriding state. Camera checks cover uniform scaling and bounds at desktop, narrow and short sizes. Audio recipes and JSON round trips validate against the installed runtime.

`pnpm check:browser` exercises real keyboard and native touch, cancellation, pause/resume, resize/blur, checkpoint retry, district transitions, final results, full restart, audio failure, lazy imports, switching and frame/audio cleanup. Focused outcome fixtures verify UI composition; the simulation traversal proves route reachability. Screenshots support visual inspection rather than pixel baselines. The shared audio browser check measures finite, non-clipping output and resource bounds for every cue, including both landing-strength extrema. Physical-device controls, subjective listening and human pacing remain unverified.

See the [three-game architecture review](three-game-review.md) for the comparative ownership decisions and the scoped shared improvement.
