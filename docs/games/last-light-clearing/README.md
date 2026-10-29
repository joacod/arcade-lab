# Last Light Clearing

[Source](../../../src/games/last-light-clearing/) | [Catalog](../../../CATALOG.md)

The source of numerical tuning is [`src/games/last-light-clearing/content.ts`](../../../src/games/last-light-clearing/content.ts), including the Keeper, enemies, weapons, upgrades, evolution recipe, XP progression, and named round configurations. Until dawn is a three-minute round; Brief dusk supplies a shorter round through the same implementation. Every appearance uses the same rules. See the [game catalog](../../../CATALOG.md) for controls and [artwork guide](../../../src/games/last-light-clearing/art/README.md) for artwork.

## Gameplay semantics

- Movement normalizes diagonals and preserves proportional analog strength. Body radii, speeds, range, arena bounds, timers, and progression stay independent of presentation.
- Spark targets the nearest living enemy and gains faster cadence at higher ranks. Halo gains additional orbiting contact bodies and retains shared per-target hit windows across lights, upgrades and revolutions. Pulse gains radius but samples its circle once per activation, including enemy body radii. Shard starts with cardinal shots and adds evenly spaced directions at higher ranks. Fractional damage rounds up. Upgrade cards preview effective damage and coverage/cadence changes, including Power rounding.
- Each death drops one gem. Attraction persists after the Keeper moves away, and collection batches same-tick XP. Excess XP survives queued level choices. Choices stop gameplay, offer three distinct effective upgrades, and require releasing confirmation before continuing. Only offered IDs can apply.
- Every offer reserves a support choice alongside weapon acquisition/ranks. Support rotates through Power, Reach and Recovery, with Lens available during evolution progression. Low health prioritizes Recovery immediately. Recovery, Power and Reach remain repeatable. Unused recovery becomes shield; Reach survives acquiring Lens. The HUD shows shield quantity and progress toward Arc Spark; absorption and health loss have distinct feedback.
- Rank-three Spark plus Lens evolves automatically in either acquisition order. Arc Spark preserves weapon slot, rank, cadence, and other weapons, clears old Spark projectiles, and chains to distinct living targets within the shot's existing lifetime. Arc Spark is not a fourth manual choice.
- Ordinary spawns count pending entries toward their cap and discard capped slots. The elite is independent of that cap. Its entry warning is harmless, invulnerable, and excluded from targeting so projectiles are not wasted on it.
- Briar chargers join after the opening and become more frequent as pursuit pressure grows. Their forked crest identifies them across themes. A dashed lane locks when wind-up begins; the charger strikes along that fixed direction, then rests. The elite commits a marked ground slam to a fixed circle. Step sideways out of a lane or leave the slam ring, then use the harmless recovery window. Only one special attack can commit at a time. Killing its owner cancels an attack; attacks and contact share shield absorption and immunity.
- Shield and shared contact immunity apply before health. Lethal final-tick contact takes precedence over victory. Outcomes stop attacks, entries, and pickups, discard pending choices, and freeze results. Retry constructs a fresh run.

## Browser behavior

Starting positions and body geometry live in `content.ts`. A nearby opening gem, a restrained guide line and a contextual prompt introduce collection before the first upgrade. Entry selection samples safe world edges with a run-owned seed, varying approach angles while preserving separation. Spawn rules and global targeting use world coordinates, regardless of the presentation.

Projectile-radius collision uses a swept intersection, with movement limited to remaining projectile lifetime. Death drops and gem collection resolve synchronously. Combat/outcome resolves before pickups so a terminal tick cannot open a stale upgrade panel.

Upgrade cards distinguish new weapons, rank changes and support effects, with a short purpose followed by the simulation’s exact stat preview. Equipped weapons and Arc Spark requirements stay beside the choices. The applied card is marked while confirmation is held; release returns to action or the next earned choice. This presentation lives in `ui.ts` and `style.css`, independently of progression rules.

Pause/resume and confirmation release follow native browser focus and pointer lifetimes. Focus loss, hiding, and display transitions clear held input and require deliberate Resume, including after a suspended upgrade choice. Gameplay is visual; keyboard-accessible HTML menus and HUD do not provide a nonvisual equivalent of gameplay. Sound uses procedural cues without recordings or ambient music; see [shared audio ownership](../../architecture.md#sound).

## Camera

The camera follows the Keeper without smoothing. Its uniform scale is the larger of the padded arena fit and a readable minimum, with separate framing targets for desktop and narrow surfaces. Larger fit scales remain intact.

Camera framing constants live in [`src/games/last-light-clearing/view.ts`](../../../src/games/last-light-clearing/view.ts), separately from artwork metadata and gameplay tuning. Each axis clamps within padded world bounds when cropped and centers when the visible span exceeds the padded world. Boundary padding leaves room for artwork at physical edges. The transform is recomputed from the current player, so retry/title reset position naturally and pausing leaves framing stable.

Visible entries keep their world-space warning rings. Offscreen pending entries get restrained inset screen-edge arrows. The elite keeps an arrow and ELITE label while offscreen, including its entry warning. These cues read existing run state; there is no second spawn machine, enemy radar, or minimap. All world content uses one transform, and the floating movement joystick stays in CSS coordinates after world drawing.

## Theme modes

**Normal**, the default, uses the existing procedural clearing, actor silhouettes and spell effects without fetching images. **Assets** uses bundled Ember Ruins in development and production. **Quality** uses Prism Garden's sculpted actors, illuminated scenery and Three.js lighting.

**Custom** uses Abyssal Bloom, an experimental WebGPU/vgpu presentation with a procedural living field, domain-warped luminous veins, drifting marine snow, reactive ripples and shader-rendered organisms, spells and dissolve particles. It includes matching Abyss HUD styling and requires WebGPU.

Each mode includes its matching HUD styling. The menu offers one Theme selector; the camera follows the Keeper in every mode. Replacements retain the entire run, including active time, positions, health, upgrades and pending state. Only Resume continues play. Clip timing follows active game time, so pausing or backgrounding cannot advance world animation. Source frames, anchors, visual footprints and scenery never change physics or targeting.

Prism Garden frames a luminous, petal-caged lantern against cool stone, quiet circular engravings and perimeter crystals. Directional light reveals faceted bodies and grounds their shadows; creature limbs and the charger’s crest separate enemies from gems. Large scenery remains outside traversable ground. The final stretch warms toward dawn in every mode, with additional light changes in Garden and a short cosmetic victory ring. The result flourish may finish after gameplay stops; it never advances the run. Reduced motion keeps static state cues while suppressing the added gait and expanding milestone flourishes.

[Combat cue preview](combat-feedback.png): a locked charger lane, shield readout and Arc Spark awakening in Prism Garden.

## Sound identity

`src/games/last-light-clearing/sound-recipes.ts` defines original AudioBits recipes: soft Spark glints, brighter Arc Spark partials, crystalline Shard transients, Halo contact rings, and a low Pulse bloom. Enemy impacts/dissolves stay subdued, clustered gems brighten a bounded pickup control, and health damage has a distinct low crack. Fully absorbed shield hits use a protective Halo chime. Harmonic chords and restrained delay mark upgrades, evolution and dawn; a low dissonant omen announces the elite. Defeat closes with a falling minor-colored tone.

`src/games/last-light-clearing/sound.ts` maps semantic events, coalesces repeated cues per frame and throttles dense contacts/pickups. Milestones replace combat tails. Simulation supplies projectile weapon identity, Halo contact and elite-entry notifications without knowing how they sound. Mute remains a session setting.

## Implementation ownership

Paths below are relative to `src/games/last-light-clearing/`.

| Responsibility | Owner |
| --- | --- |
| Composition and session settings | `app.ts` |
| Simulation | `game.ts`, `game-state.ts`, `combat.ts`, `encounters.ts`, `progression.ts`, `weapon-stats.ts`, `weapons/` |
| Typed content and validation | `content.ts`, `content-validation.ts` |
| Physical input | `input.ts` |
| Camera transform, attack cues and CSS-space overlay | `view.ts`, `screen-overlay.ts` |
| Presentation contract and renderers | `world-presentation.ts`, `presentation.ts`, `three/garden.ts`, `vgpu/` |
| Artwork, appearances and animation | `art-pack.ts`, `assets.ts`, `themes.ts`, `animation.ts`, `art/` |
| UI and sound adapters | `ui.ts`, `style.css`, `sound.ts` |

`mountClearing` owns composition and returns session cleanup while artwork prepares. If construction fails, it releases the resources acquired before propagating the error. Session settings survive run replacement; pending preparations are aborted and invalidated on disposal. Styles stay scoped to `.clearing-app`.

## Renderer and asset lifetimes

`world-presentation.ts` defines canvas, resize, observe, reset, consume, draw and dispose. Normal starts synchronously on Canvas. Quality lazily loads `three/garden.ts`; it uses the host frame loop and the same world-to-CSS transform. Canvas multiplies it by DPR; the orthographic garden maps `(x, y)` to `(x, -y, elevation)` without perspective/parallax. Custom lazily loads `vgpu/bloom.ts` and its WGSL field and organism shaders. It uses the same host loop and world-to-CSS transform, with bounded instance, ripple and particle buffers. Renderers own backing resolution.

Garden batches immutable scenery by geometry, material and shadow settings at construction. Each instance retains its authored transform and the batch owns its bounds; actor animation remains independent. Transient gems, shots and effects reuse bounded instance buffers. This keeps repeated scenery from adding one draw submission per prop.

`prepareAssets` validates decoded bundles and returns explicit disposal. Composition retains the active renderer while a candidate prepares, then resets, resizes and paints the candidate against the current run before replacing the canvas. Success releases the old renderer before its images. Failed, stale or aborted candidates release their own resources. Replacement never constructs a run or replays events. GPU loss or draw failure pauses the run and restores Normal.

The persistent overlay consumes milestone and damage events and draws attack commitments from simulation state with the same world transform in every theme. It owns bounded effects, starter-gem guidance, protection cues and the cosmetic dawn finish. Animation observations update after simulation steps and persist between render frames. Cosmetic clips/effects use active run time. Canvas uses the asset pack’s clip helpers; garden and bloom use procedural actor observations. Palettes live in `themes.ts`, and procedural shader/effect budgets live with the renderer.

Garden reuses bounded resources and releases geometry, materials, textures, instance buffers, shadows and renderer/context resources on failure and disposal. Bloom releases shader draws, effects, uniforms, storage buffers, its surface and device on cancellation, failure or disposal. Device acquisition cannot be interrupted, so a device arriving after cancellation is immediately released. Unavailable WebGPU or failed preparation retains the working presentation; an active graphics failure pauses and restores Normal.

`createPreparationScope` invalidates superseded work; the session releases rejected image bundles and renderers.

## Renderer verification

The browser checks exercise replacement on a retained run, uniform projection, artwork failure, disposal and GPU loss. Normal startup does not request image sheets or graphics libraries. See [shared verification commands](../../architecture.md#local-verification).
