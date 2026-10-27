# Last Light Clearing

## Pinned reference

The read-only gameplay reference is [Last Light Clearing in joacod/godot-games](https://github.com/joacod/godot-games/tree/2fc1de05248537b21cf9b9eed656ce877d3e1561/survivors), pinned to **`2fc1de05248537b21cf9b9eed656ce877d3e1561`**. Its [design](https://github.com/joacod/godot-games/blob/2fc1de05248537b21cf9b9eed656ce877d3e1561/survivors/docs/DESIGN.md), typed Resources, and gameplay scripts informed this browser adaptation. No Godot scenes, assets, architecture, or test suites were transplanted. Keep this reference unless deliberately updating it.

The source of numerical tuning is [`src/content.ts`](../src/content.ts), including the Keeper, enemies, weapons, upgrades, evolution recipe, XP progression, and named round configurations. Until dawn retains the original three-minute rules; Brief dusk supplies a shorter round through the same implementation. Artwork is original local SVG; see [provenance](../src/art/README.md).

## Gameplay semantics

- Movement normalizes diagonals and preserves proportional analog strength. Body radii, speeds, range, arena bounds, timers, and progression stay independent of presentation.
- Spark targets the nearest living enemy. Halo is an orbiting contact body, not a continuously damaging ring, and retains per-target hit windows across upgrades/revolutions. Pulse samples its circle once per activation, including enemy body radii. Shard fires cardinal bursts. Fractional damage rounds up.
- Each death drops one gem. Attraction persists after the Keeper moves away, and collection batches same-tick XP. Excess XP survives queued level choices. Choices stop gameplay, offer three distinct effective upgrades, and require releasing confirmation before continuing. Only offered IDs can apply.
- Upgrade priority is deterministic: an unowned weapon, eligible Lens, eligible Spark ranks, then authored choices. Recovery, Power, and Reach remain repeatable. Unused recovery becomes shield; Reach survives acquiring Lens.
- Rank-three Spark plus Lens evolves automatically in either acquisition order. Arc Spark preserves weapon slot, rank, cadence, and other weapons, clears old Spark projectiles, and chains to distinct living targets within the shot's existing lifetime. The reference's upgrade menu applies this recipe automatically; Arc Spark is not a fourth manual choice.
- Ordinary spawns count pending entries toward their cap and discard capped slots. The elite is independent of that cap. Its entry warning is harmless, invulnerable, and excluded from targeting so projectiles are not wasted on it.
- Shield and shared contact immunity apply before health. Lethal final-tick contact takes precedence over victory. Outcomes stop attacks, entries, and pickups, discard pending choices, and freeze results. Retry constructs a fresh run.

## Browser adaptation choices

The centered browser start remains (480, 320), rather than the reference's (430, 320), with the initial crawler at (640, 320). Safe farthest-edge entry selection retains seeded tie breaking, while upstream selects the first farthest visible edge. Spawn rules and global targeting use world coordinates, regardless of the selected view.

The browser keeps swept projectile-radius collision and movement limited to remaining projectile lifetime. Upstream combines a center ray with cached area overlaps and expires before movement on its last tick. Browser death drops and gem collection resolve synchronously. Combat/outcome resolves before pickups so a terminal tick cannot open a stale upgrade panel.

Pause/resume and confirmation release follow native browser focus and pointer lifetimes. Focus loss, hiding, and display transitions clear held input and require deliberate Resume, including after a suspended upgrade choice. Canvas conveys the world visually; keyboard-accessible HTML menus and HUD do not provide a nonvisual equivalent of gameplay. Audio uses procedural Web Audio cues without recordings or ambient music.

## Close and whole-arena views

**Close view**, the default, follows the Keeper without smoothing. Its uniform scale is the larger of the padded arena fit and a readable minimum: currently 1.375 on desktop and 1 on surfaces narrower than 600 CSS pixels. A 32-world-unit Keeper frame therefore appears at about 44 or 32 CSS pixels, respectively. These are framing targets; useful larger fit scales remain intact.

Camera framing constants live in [`src/view.ts`](../src/view.ts), separately from artwork metadata and gameplay tuning. Each axis clamps within padded world bounds when cropped and centers when the visible span exceeds the padded world. Boundary padding leaves room for artwork at physical edges. The transform is recomputed from the current player, so retry/title reset position naturally and pausing leaves framing stable.

**Whole arena** fits the full arena with its boundary padding and letterboxing. Both modes preserve the same geometry, collision, spawning, weapon ranges, and global targeting. View selection persists across retries and title transitions within the session.

Visible entries keep their world-space warning rings. Offscreen pending entries get restrained inset screen-edge arrows. The elite keeps an arrow and ELITE label while offscreen, including its entry warning. These cues read existing run state; there is no second spawn machine, enemy radar, or minimap. All world content uses one transform, and the floating movement joystick stays in CSS coordinates after world drawing.
