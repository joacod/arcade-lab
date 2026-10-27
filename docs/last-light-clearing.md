# Last Light Clearing

The source of numerical tuning is [`src/content.ts`](../src/content.ts), including the Keeper, enemies, weapons, upgrades, evolution recipe, XP progression, and named round configurations. Until dawn is a three-minute round; Brief dusk supplies a shorter round through the same implementation. Every appearance uses the same rules. See the [game catalog](../CATALOG.md) for controls and [art definitions and provenance](../src/art/README.md) for artwork.

## Gameplay semantics

- Movement normalizes diagonals and preserves proportional analog strength. Body radii, speeds, range, arena bounds, timers, and progression stay independent of presentation.
- Spark targets the nearest living enemy. Halo is an orbiting contact body, not a continuously damaging ring, and retains per-target hit windows across upgrades/revolutions. Pulse samples its circle once per activation, including enemy body radii. Shard fires cardinal bursts. Fractional damage rounds up.
- Each death drops one gem. Attraction persists after the Keeper moves away, and collection batches same-tick XP. Excess XP survives queued level choices. Choices stop gameplay, offer three distinct effective upgrades, and require releasing confirmation before continuing. Only offered IDs can apply.
- Upgrade priority is deterministic: an unowned weapon, eligible Lens, eligible Spark ranks, then authored choices. Recovery, Power, and Reach remain repeatable. Unused recovery becomes shield; Reach survives acquiring Lens.
- Rank-three Spark plus Lens evolves automatically in either acquisition order. Arc Spark preserves weapon slot, rank, cadence, and other weapons, clears old Spark projectiles, and chains to distinct living targets within the shot's existing lifetime. Arc Spark is not a fourth manual choice.
- Ordinary spawns count pending entries toward their cap and discard capped slots. The elite is independent of that cap. Its entry warning is harmless, invulnerable, and excluded from targeting so projectiles are not wasted on it.
- Shield and shared contact immunity apply before health. Lethal final-tick contact takes precedence over victory. Outcomes stop attacks, entries, and pickups, discard pending choices, and freeze results. Retry constructs a fresh run.

## Browser behavior

The Keeper starts at (480, 320), with the initial crawler at (640, 320). Safe farthest-edge entry selection uses seeded tie breaking. Spawn rules and global targeting use world coordinates, regardless of the selected view.

Projectile-radius collision uses a swept intersection, with movement limited to remaining projectile lifetime. Death drops and gem collection resolve synchronously. Combat/outcome resolves before pickups so a terminal tick cannot open a stale upgrade panel.

Pause/resume and confirmation release follow native browser focus and pointer lifetimes. Focus loss, hiding, and display transitions clear held input and require deliberate Resume, including after a suspended upgrade choice. Gameplay is visual; keyboard-accessible HTML menus and HUD do not provide a nonvisual equivalent of gameplay. Sound uses procedural cues without recordings or ambient music; see [audio integration status](architecture.md#sound).

## Close and whole-arena views

**Close view**, the default, follows the Keeper without smoothing. Its uniform scale is the larger of the padded arena fit and a readable minimum: currently 1.375 on desktop and 1 on surfaces narrower than 600 CSS pixels. A 32-world-unit Keeper frame therefore appears at about 44 or 32 CSS pixels, respectively. These are framing targets; useful larger fit scales remain intact.

Camera framing constants live in [`src/view.ts`](../src/view.ts), separately from artwork metadata and gameplay tuning. Each axis clamps within padded world bounds when cropped and centers when the visible span exceeds the padded world. Boundary padding leaves room for artwork at physical edges. The transform is recomputed from the current player, so retry/title reset position naturally and pausing leaves framing stable.

**Whole arena** fits the full arena with its boundary padding and letterboxing. Both modes preserve the same geometry, collision, spawning, weapon ranges, and global targeting. View selection persists across retries and title transitions within the session.

Visible entries keep their world-space warning rings. Offscreen pending entries get restrained inset screen-edge arrows. The elite keeps an arrow and ELITE label while offscreen, including its entry warning. These cues read existing run state; there is no second spawn machine, enemy radar, or minimap. All world content uses one transform, and the floating movement joystick stays in CSS coordinates after world drawing.

## Visual settings

Appearance chooses an art bundle or procedural treatment, cosmetic environment, effect palette, and default interface. Classic, Rune, Glass and Abyss can be selected independently, with default/amber/teal/violet interface accents. Explicit interface choices survive appearance changes; “Match appearance” follows the successfully loaded preset. Paused replacements retain the entire run, including active time, positions, health, upgrades, and pending state. Only Resume continues play. Clip timing follows active game time, so pausing or backgrounding cannot advance world animation. Source frames, anchors, visual footprints, and scenery never change physics or targeting.
