# Last Light Clearing

[Source](../../../src/games/last-light-clearing/) | [Controls](../../../CATALOG.md#last-light-clearing) | [Shared contracts](../../architecture.md)

The source of numerical tuning is [`src/games/last-light-clearing/content.ts`](../../../src/games/last-light-clearing/content.ts), including the Keeper, enemies, weapons, upgrades, evolution recipe, XP progression, and named round configurations. Until dawn is a three-minute round; Brief dusk supplies a shorter round through the same implementation. See the [artwork guide](../../../src/games/last-light-clearing/art/README.md) for the Ember Ruins pack contract.

## Gameplay semantics

- Movement normalizes diagonals and preserves proportional analog strength.
- Spark targets the nearest living enemy and gains faster cadence at higher ranks. Halo gains additional orbiting contact bodies and retains shared per-target hit windows across lights, upgrades and revolutions. Pulse gains radius but samples its circle once per activation, including enemy body radii. Shard starts with cardinal shots and adds evenly spaced directions at higher ranks. Fractional damage rounds up. Upgrade cards preview effective damage and coverage/cadence changes, including Power rounding.
- Each death drops one gem. Attraction persists after the Keeper moves away, and collection batches same-tick XP. Excess XP survives queued level choices. Choices stop gameplay, offer three distinct effective upgrades, and require releasing confirmation before continuing. Only offered IDs can apply.
- Every offer reserves a support choice alongside weapon acquisition/ranks. Support rotates through Power, Reach and Recovery, with Lens available during evolution progression. Low health prioritizes Recovery immediately. Recovery, Power and Reach remain repeatable. Unused recovery becomes shield; Reach survives acquiring Lens. The HUD groups equipped weapons and ranks with progress toward Arc Spark, and shows shield quantity; absorption and health loss have distinct feedback.
- Rank-three Spark plus Lens evolves automatically in either acquisition order. Arc Spark preserves weapon slot, rank, cadence, and other weapons, clears old Spark projectiles, and chains to distinct living targets within the shot's existing lifetime. Arc Spark is not a fourth manual choice.
- Ordinary spawns count pending entries toward their cap and discard capped slots. The elite is independent of that cap. Its entry warning is harmless, invulnerable, and excluded from targeting so projectiles are not wasted on it.
- Briar chargers join after the opening and become more frequent as pursuit pressure grows. Their forked crest identifies them across themes. A dashed lane locks when wind-up begins; the charger strikes along that fixed direction, then rests. The elite commits a marked ground slam to a fixed circle. Step sideways out of a lane or leave the slam ring, then use the harmless recovery window. Only one special attack can commit at a time. Killing its owner cancels an attack; attacks and contact share shield absorption and immunity.
- Shield and shared contact immunity apply before health. Lethal final-tick contact takes precedence over victory. Outcomes stop attacks, entries, and pickups, discard pending choices, and freeze results. Retry constructs a fresh run.

## Opening and upgrade flow

**Change round · new run** from pause or results ends the current run and returns to round selection.

Starting positions and body geometry live in `content.ts`. A nearby opening gem, a restrained guide line and a contextual prompt introduce collection before the first upgrade. Entry selection samples safe world edges with a run-owned seed, varying approach angles while preserving separation.

Projectile-radius collision uses a swept intersection, with movement limited to remaining projectile lifetime. Death drops and gem collection resolve synchronously. Combat/outcome resolves before pickups so a terminal tick cannot open a stale upgrade panel.

Upgrade cards distinguish new weapons, rank changes and support effects, with a short purpose followed by the simulation’s exact stat preview. Equipped weapons and Arc Spark requirements stay beside the choices. The applied card is marked while confirmation is held; release returns to action or the next earned choice. This presentation lives in `ui.ts` and `style.css`, independently of progression rules.

A suspended upgrade choice requires deliberate Resume before confirmation can continue.

## Camera

The camera follows the Keeper without smoothing. Its uniform scale is the larger of the padded arena fit and a readable minimum, with separate framing targets for desktop and narrow surfaces. Larger fit scales remain intact.

Camera framing constants live in [`src/games/last-light-clearing/view.ts`](../../../src/games/last-light-clearing/view.ts), separately from artwork metadata and gameplay tuning. Each axis clamps within padded world bounds when cropped and centers when the visible span exceeds the padded world. Boundary padding leaves room for artwork at physical edges. The transform is recomputed from the current player, so retry/title reset position naturally and pausing leaves framing stable.

Visible entries keep their world-space warning rings. Offscreen pending entries get restrained inset screen-edge arrows. The elite keeps an arrow and ELITE label while offscreen, including its entry warning. These cues read existing run state; there is no second spawn machine, enemy radar, or minimap. All world content uses one transform, and the floating movement joystick stays in CSS coordinates after world drawing.

## Theme modes

**Arcade** uses bundled Ember Ruins in development and production. **Deluxe · Ember Ruins · Rekindled** builds on the Arcade presentation, redrawing its knight, goblin and demon designs as a cohesive modern illustrated art set, with new full-body animation cels, ruin props, gems and spell objects.

### Deluxe direction: Ember Ruins · Rekindled

Rekindled reinterprets Ember Ruins as compact painted dark-fantasy miniatures for an overhead survival arena. Large heads, short planted legs, connected broad bodies and restrained equipment preserve detail at gameplay size. The Keeper has an ivory-steel helmet with a wide teal visor, brass trim, teal tabard, crimson plume and half-cape, and a warm belt lantern. Moss-green scavengers wear teal hoods; broader chargers wear burgundy armor and paired scarlet crests. The squat crimson elite has curved black horns, charcoal shoulder armor, broad brass rims and an ember chest stone. Authored breathing and grounded walking cels carry their motion; runtime rendering never assembles anatomy.

Visible silhouettes stay close to the working Arcade scale, with the gameplay center inside the lower body rather than below the feet. The sprite anchor and authored ground contact are distinct. A shared registration per sequence preserves head and pelvis placement across planted and passing poses; packing does not realign individual cels by their lowest opaque pixel. Walking phase follows observed world displacement. Collision geometry, weapon ranges and trajectories remain in gameplay content.

Small muted slate cobbles and worn moss seams keep the courtyard quiet beneath combat. Matching ivory-limestone pillars, broken stumps and squat brass braziers frame the traversable area. Deluxe loads none of the Arcade pixel atlas. Emerald crystals, compact gold Halo motes and short violet Shards share the cast's broad painted forms. Halo's orbit track stays on the floor, with rear motes behind the Keeper and front motes above. Red attack commitments retain their physical locations and sizes.

Protection outlines enclose the whole Keeper, including the helmet. Hit feedback follows the illustrated body, contact shadows meet the registered soles, and health bars and damage/attack labels sit above the silhouettes. Brass accents, stone surfaces and a serif title carry the same treatment into the interface. Restrained lantern and spell light supports the artwork. The shared dawn wash and victory ring close the round.

Deluxe uses Canvas 2D and its own [art bundle, sources, prompts and registration layout](../../../src/games/last-light-clearing/art/rekindled/README.md). Cosmetic observations freeze on pause. Reduced motion holds the first cel and steady brazier light, suppresses drifting embers and defeat fragments, and retains physical movement, attack warnings and state cues. Ground, props and light stamps are cached per presentation; the ember field has a fixed small budget.

![Ember Ruins · Rekindled: compact painted knight, hooded goblins and horned demon on a quiet cobbled courtyard](preview.webp)

## Sound identity

`src/games/last-light-clearing/sound-recipes.ts` defines original AudioBits recipes: soft Spark glints, brighter Arc Spark partials, crystalline Shard transients, Halo contact rings, and a low Pulse bloom. Enemy impacts/dissolves stay subdued, clustered gems brighten a bounded pickup control, and health damage has a distinct low crack. Fully absorbed shield hits use a protective Halo chime. Harmonic chords and restrained delay mark upgrades, evolution and dawn; a low dissonant omen announces the elite. Defeat closes with a falling minor-colored tone.

Sound uses procedural cues without recordings or ambient music. `sound.ts` receives projectile weapon identity, Halo contact and elite-entry notifications from simulation.

## Implementation ownership

Paths below are relative to `src/games/last-light-clearing/`.

| Responsibility | Owner |
| --- | --- |
| Composition and session settings | `app.ts` |
| Simulation | `game.ts`, `game-state.ts`, `combat.ts`, `encounters.ts`, `progression.ts`, `weapon-stats.ts`, `weapons/` |
| Typed content and validation | `content.ts`, `content-validation.ts` |
| Physical input | `input.ts` |
| Camera transform, attack cues and CSS-space overlay | `view.ts`, `screen-overlay.ts` |
| Presentation contract and renderers | `world-presentation.ts`, `presentation.ts`, `ember-scene.ts` |
| Artwork, appearances and animation | `art-pack.ts`, `assets.ts`, `themes.ts`, `animation.ts`, `art/` |
| UI and sound adapters | `ui.ts`, `style.css`, `sound.ts` |

## Renderer composition

`world-presentation.ts` defines canvas, resize, observe, reset, consume, draw and dispose. Arcade and Deluxe use the same Canvas sprite renderer, observations and clip helpers. Deluxe's local `ember-scene.ts` owns its cached painted floor, new perimeter props, light stamps and fixed ember field. `rekindledArt` in `themes.ts` maps the new actor cels and gem/Halo/Shard images independently of Arcade. The preparation transaction validates and loads the Deluxe ground only when selected. Replacement releases cached canvases and the outgoing image bundle.

The persistent overlay owns attack commitments, starter-gem guidance, protection cues and the dawn finish. Palettes live in `themes.ts`; effect budgets stay with their presentation owner.

The renderer/resource transaction follows the [shared replacement and recovery contract](../../architecture.md#replacement-and-recovery).

## Renderer verification

The [presentation invariants](../../../tests/unit/games/last-light-clearing/presentation.test.mjs) protect frame bounds, clip/anchor metadata, animation timing and prepared-image lifetimes. Gameplay checks in [the unit-test directory](../../../tests/unit/games/last-light-clearing/) cover weapons, evolution, upgrades and encounter limits. The collection [startup smoke](../../../tests/browser/app/startup.spec.ts) verifies Arcade readiness and starting play. Use the [shared verification guidance](../../architecture.md#local-verification).
