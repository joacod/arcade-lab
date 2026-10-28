# Last Light Clearing

[Source](../../../src/games/last-light-clearing/) | [Catalog](../../../CATALOG.md)

The source of numerical tuning is [`src/games/last-light-clearing/content.ts`](../../../src/games/last-light-clearing/content.ts), including the Keeper, enemies, weapons, upgrades, evolution recipe, XP progression, and named round configurations. Until dawn is a three-minute round; Brief dusk supplies a shorter round through the same implementation. Every appearance uses the same rules. See the [game catalog](../../../CATALOG.md) for controls and [art definitions and provenance](../../../src/games/last-light-clearing/art/README.md) for artwork.

## Gameplay semantics

- Movement normalizes diagonals and preserves proportional analog strength. Body radii, speeds, range, arena bounds, timers, and progression stay independent of presentation.
- Spark targets the nearest living enemy. Halo is an orbiting contact body, not a continuously damaging ring, and retains per-target hit windows across upgrades/revolutions. Pulse samples its circle once per activation, including enemy body radii. Shard fires cardinal bursts. Fractional damage rounds up.
- Each death drops one gem. Attraction persists after the Keeper moves away, and collection batches same-tick XP. Excess XP survives queued level choices. Choices stop gameplay, offer three distinct effective upgrades, and require releasing confirmation before continuing. Only offered IDs can apply.
- Upgrade priority is deterministic: an unowned weapon, eligible Lens, eligible Spark ranks, then authored choices. Recovery, Power, and Reach remain repeatable. Unused recovery becomes shield; Reach survives acquiring Lens.
- Rank-three Spark plus Lens evolves automatically in either acquisition order. Arc Spark preserves weapon slot, rank, cadence, and other weapons, clears old Spark projectiles, and chains to distinct living targets within the shot's existing lifetime. Arc Spark is not a fourth manual choice.
- Ordinary spawns count pending entries toward their cap and discard capped slots. The elite is independent of that cap. Its entry warning is harmless, invulnerable, and excluded from targeting so projectiles are not wasted on it.
- Shield and shared contact immunity apply before health. Lethal final-tick contact takes precedence over victory. Outcomes stop attacks, entries, and pickups, discard pending choices, and freeze results. Retry constructs a fresh run.

## Browser behavior

Starting positions and body geometry live in `content.ts`. Safe farthest-edge entry selection uses seeded tie breaking. Spawn rules and global targeting use world coordinates, regardless of the selected view.

Projectile-radius collision uses a swept intersection, with movement limited to remaining projectile lifetime. Death drops and gem collection resolve synchronously. Combat/outcome resolves before pickups so a terminal tick cannot open a stale upgrade panel.

Pause/resume and confirmation release follow native browser focus and pointer lifetimes. Focus loss, hiding, and display transitions clear held input and require deliberate Resume, including after a suspended upgrade choice. Gameplay is visual; keyboard-accessible HTML menus and HUD do not provide a nonvisual equivalent of gameplay. Sound uses procedural cues without recordings or ambient music; see [shared audio ownership](../../architecture.md#sound).

## Close and whole-arena views

**Close view**, the default, follows the Keeper without smoothing. Its uniform scale is the larger of the padded arena fit and a readable minimum, with separate framing targets for desktop and narrow surfaces. Larger fit scales remain intact.

Camera framing constants live in [`src/games/last-light-clearing/view.ts`](../../../src/games/last-light-clearing/view.ts), separately from artwork metadata and gameplay tuning. Each axis clamps within padded world bounds when cropped and centers when the visible span exceeds the padded world. Boundary padding leaves room for artwork at physical edges. The transform is recomputed from the current player, so retry/title reset position naturally and pausing leaves framing stable.

**Whole arena** fits the full arena with its boundary padding and letterboxing. Both modes preserve the same geometry, collision, spawning, weapon ranges, and global targeting. View selection persists across retries and title transitions within the session.

Visible entries keep their world-space warning rings. Offscreen pending entries get restrained inset screen-edge arrows. The elite keeps an arrow and ELITE label while offscreen, including its entry warning. These cues read existing run state; there is no second spawn machine, enemy radar, or minimap. All world content uses one transform, and the floating movement joystick stays in CSS coordinates after world drawing.

## Visual settings

The shared Options panel contains appearance, interface, accent, view and sound controls. Interface and accent style the gameplay HUD and upgrade cards; shared menu navigation keeps a consistent layout.

Appearance chooses an art bundle or procedural treatment, cosmetic environment, effect palette, and default interface. Classic, Rune, Glass and Abyss can be selected independently, with default/amber/teal/violet interface accents. Explicit interface choices survive appearance changes; “Match appearance” follows the successfully loaded preset. Paused replacements retain the entire run, including active time, positions, health, upgrades, and pending state. Only Resume continues play. Clip timing follows active game time, so pausing or backgrounding cannot advance world animation. Source frames, anchors, visual footprints, and scenery never change physics or targeting.

## Sound identity

`src/games/last-light-clearing/sound-recipes.ts` defines original AudioBits recipes: soft Spark glints, brighter Arc Spark partials, crystalline Shard transients, Halo contact rings, and a low Pulse bloom. Enemy impacts/dissolves stay subdued, clustered gems brighten a bounded pickup control, and player damage has a distinct low crack. Harmonic chords and restrained delay mark upgrades, evolution and dawn; a low dissonant omen announces the elite. Defeat closes with a falling minor-colored tone.

`src/games/last-light-clearing/sound.ts` maps semantic events, coalesces repeated cues per frame and throttles dense contacts/pickups. Milestones replace combat tails. Simulation supplies projectile weapon identity, Halo contact and elite-entry notifications without knowing how they sound. Mute and volume remain session settings.

## Implementation ownership

Paths below are relative to `src/games/last-light-clearing/`.

| Responsibility | Owner |
| --- | --- |
| Composition and session settings | `app.ts` |
| Simulation | `game.ts`, `game-state.ts`, `combat.ts`, `progression.ts`, `weapons/` |
| Typed content and validation | `content.ts`, `content-validation.ts` |
| Physical input | `input.ts` |
| Camera transform and CSS-space overlay | `view.ts`, `screen-overlay.ts` |
| Presentation contract and renderers | `world-presentation.ts`, `presentation.ts`, `three/garden.ts`, `vgpu/` |
| Artwork, appearances and animation | `art-pack.ts`, `assets.ts`, `themes.ts`, `animation.ts`, `art/` |
| UI and sound adapters | `ui.ts`, `interface.ts`, `style.css`, `sound.ts` |

`mountClearing` owns composition and returns session cleanup while artwork prepares. If construction fails, it releases the resources acquired before propagating the error. Session settings survive run replacement; pending preparations are aborted and invalidated on disposal. Styles stay scoped to `.clearing-app`.

## Renderer and asset lifetimes

`world-presentation.ts` defines canvas, resize, observe, reset, consume, draw and dispose. Canvas is the initial presentation; Three.js and vgpu implementations load only when selected. They use the host's frame loop and the same world-to-CSS transform. Canvas multiplies it by DPR; the orthographic garden maps `(x, y)` to `(x, -y, elevation)` without perspective/parallax; Bloom applies the transform and its inverse in shaders. Renderers own backing resolution, with Bloom's limits in `bloomTuning`.

`three/garden.ts` powers the **Prism Garden** and **Ember Conservatory** appearances and loads only when selected. Vite's `build.chunkSizeWarningLimit` is set to 600 kB to accommodate this optional renderer.

Garden batches immutable scenery by geometry, material and shadow settings at construction. Each instance retains its authored transform and the batch owns its bounds; actor animation remains independent. Transient gems, shots and effects reuse bounded instance buffers. This keeps repeated scenery from adding one draw submission per prop.

`prepareAssets` validates decoded bundles and returns explicit disposal. Composition retains the active renderer while a candidate prepares, then resets, resizes and paints the candidate against the current run before replacing the canvas. Success releases the old renderer before its images. Failed, stale or aborted candidates release their own resources. Replacement never constructs a run or replays events. GPU loss or draw failure pauses the run and restores Lanternwood Canvas silhouettes.

Animation observations update after simulation steps and persist between render frames. Cosmetic clips/effects use active run time. Canvas and garden share clip helpers and art manifests; atlas UVs are per actor, with half-texel insets for smooth sampling. Palettes live in `themes.ts`, and procedural shader/effect budgets live with the renderer.

GPU implementations reuse bounded resources and release them on failure and disposal. Garden releases geometry, materials, textures, instance buffers, shadows and renderer/context resources. Bloom owns the device, surface, buffers and pipelines; aborted acquisition releases its eventual device, and intentional disposal suppresses device-loss recovery.

Vite pre-optimizes graphics dependencies without fetching them for Canvas startup. Its WGSL integration strips the development `?import` marker before invoking the loader; shader reflection stays at build time. `skipLibCheck` accommodates the installed vgpu declarations while application types remain strict.

## Renderer verification

The browser checks exercise appearance replacement on a retained run, projection, atlas bindings, artwork failure, disposal and GPU loss. Headless Chromium without a WebGPU adapter verifies fallback and skips GPU-only assertions. On a capable installation:

```sh
pnpm check:browser --grep 'Abyss switching' --headed
pnpm exec vgpu check src/games/last-light-clearing/vgpu/field.wgsl --require-validation
pnpm exec vgpu check src/games/last-light-clearing/vgpu/organisms.wgsl --require-validation
```

Shader validation requires an available adapter. See [shared verification commands](../../architecture.md#local-verification) for the standard checks.
