# Game catalog

Choose a game from the collection screen. **Game selection** in its title, pause or result menu returns to the collection; each visit starts a fresh session. The application fills the browser viewport. Menus share Game, Options and Controls tabs, with actions always available below the selected panel. Sound, fullscreen and Appearance are in Options. Every game can change appearance while paused and resume the same run.

## Last Light Clearing

![Last Light Clearing in Close view: the Keeper uses Spark and Halo while crawlers approach and green XP gems lie nearby](docs/games/last-light-clearing/last-light-clearing.png)

**Fullscreen** includes the arena, HUD and menus when supported by the browser.

Move the Keeper through a crowded forest, collect XP gems and choose upgrades while weapons fire automatically. Spark, Halo, Pulse and Shard offer different ways to survive, with a Spark evolution and a late elite encounter. Survive **Until dawn** for three minutes or try the 90-second **Brief dusk** round.

Choose SVG, animated pixel, sculpted Three.js or procedural WebGPU appearances with the same gameplay rules. Appearance, interface, accent, Close/Whole arena view and sound settings are in Options; round selection is in Game before starting. Settings persist through retries until reload. Appearance changes retain the paused run and require Resume. Failed artwork/audio can fall back to silhouettes/silence; unavailable graphics retain a working appearance or restore Canvas.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Hold and drag in the arena | Move with mouse, touch or pen; release to stop |
| Escape / P / Pause | Pause; use Resume to continue |
| Click / tap, or arrows + Enter / Space | Choose an upgrade, then release to continue |
| Tab / Shift+Tab | Focus menu controls |
| Fullscreen / Exit fullscreen | Change display mode |

See [game rules and implementation](docs/games/last-light-clearing/README.md) and [art setup and provenance](src/games/last-light-clearing/art/README.md), including the optional development-only Mosslight appearance.

## Skybreak

![Skybreak: upgraded forward and spread fire face the Iron Tempest fortress above the ocean](docs/games/skybreak/skybreak.png)

Fly a 2–3 minute sortie through fifteen formations to **Iron Tempest**, an armored flying fortress with three telegraphed attack patterns. Collect Power, temporary Spread and Repair supplies. Three lives and a rechargeable evasive roll help you reach the boss and earn a survival bonus. Switch between Pacific Run and Deep Space in **Options → Appearance**, then resume the same sortie. Optional local pixel fleets add Starfall Fleet and Redshift Armada; see [art setup and provenance](src/games/skybreak/art/README.md). Bundled procedural Canvas artwork and synthesized sound require no downloads.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Steer |
| Space / J | Hold to fire |
| Shift / K / Roll button | Evade; recharges between rolls |
| Hold and drag on the playfield | Steer and fire with touch, mouse or pen; release to stop |
| Escape / Pause | Pause; use Resume to continue |
| Fullscreen / Exit fullscreen | Change display mode from the menus |

The portrait playfield scales uniformly and stays centered. Roll supports a second touch while steering. Focus loss or display changes pause play and clear held input. Restart creates fresh gameplay state. Sound can be muted, and unavailable audio never prevents play. See [game rules and implementation](docs/games/skybreak/README.md) for pickups, boss patterns, tuning and source ownership.

## Clockwork Hollow

![Clockwork Hollow: a brass keeper explores mossy aqueducts and glowing machinery](docs/games/clockwork-hollow/clockwork-hollow.png)

Guide a little brass keeper through **The Waking Aqueduct**, **The Emberworks** and **The Starlit Belfry**. Three authored districts progress from mossy spans to pressure-powered machinery and moonlit climbs. Leap over copper thorns, stomp wind-up beetles, read vent warnings, collect optional motes and wake all three bells. The intended first-play pace is 3–6 minutes. Responsive acceleration, variable jump height, coyote time and buffered jumps help you find a comfortable rhythm. There is no time limit.

| Control | Action |
| --- | --- |
| A/D / left and right arrows | Move |
| Space / W / Up / Z | Jump; hold for height, release for a short hop |
| Touch arrows + Jump | Move and jump with independent buttons |
| Escape / P / Pause | Pause; use Resume to continue |
| Fullscreen / Exit fullscreen | Change display mode from the menus |

Choose Verdant clockwork or snowy Frostbound bells in Options. Six checkpoint lanterns shorten retries. Falling or touching danger ends the attempt; retry returns to the latest lantern and keeps motes, time and missed steps. District bells lead to explicit transitions, then a final result with score and collection/clean-run distinctions. Restart creates a fresh adventure. Focus loss and display changes pause and clear input. Original procedural Canvas artwork and AudioBits sound have no downloaded asset dependencies. See [gameplay and source ownership](docs/games/clockwork-hollow/README.md).

## Midnight Circuit

![Midnight Circuit: Rook fights security enforcers in a rain-soaked neon street](docs/games/midnight-circuit/midnight-circuit.png)

The grid is dead. The streets aren't. Fight as **Rook** through **Neon Backstreets** and **The Power Station**, then break the blackout by defeating the **Circuit Warden**. Align in the ground-depth lane, chain a three-hit combo, clear crowds with a heavy strike and jump into a flying kick. Authored encounters mix fast Strikers and committed Bruisers before the Warden's charge and ground-impact patterns. Three lives, repair cells and a station health refill support the roughly 4–6 minute first-run pace.

| Control | Action |
| --- | --- |
| WASD / arrows | Move and align in depth |
| J | Light combo; press again to chain |
| K | Heavy strike |
| Space, then J / K | Jump, then flying kick |
| Touch arrows + Strike / Heavy / Jump | Independent movement and action buttons |
| Escape / P / Pause | Pause; use Resume to continue |
| Fullscreen / Exit fullscreen | Change display mode from the menus |

Choose Neon diorama (Three.js), Neon cinema (Three.js with a vgpu/WebGPU finish), or the original illustrated Canvas appearance in Options. Modeled fighters, neon facades, rain, shadows and bright impacts bring the streets to life, with distance-driven walking across all styles and procedural AudioBits sound. Appearance changes preserve the paused run; unavailable graphics retain a working style or restore Canvas. Encounter gates keep enemies reachable, the camera frames the arena, and depth sorting follows feet rather than jump height. Results record score, hits, best chain, time and lives. Restart creates a fresh run. Focus loss and display changes pause play and clear input. See [gameplay and source ownership](docs/games/midnight-circuit/README.md).

## Obsidian Duel

![Obsidian Duel: Nera and Kael trade strikes on the storm-lit terrace of the Tempest Citadel](docs/games/obsidian-duel/obsidian-duel.png)

Two warriors. One eye of the storm. Choose agile **Nera**, with fast palms and a Stormglass energy bolt, or powerful **Kael**, with crushing blows and an advancing Riftbreaker. Read the CPU's telegraphs, guard high or low, jump over sweeps and punish missed heavy strikes. Win two rounds to claim the citadel. A visible timer, round countdowns, KO and time-out decisions keep matches quick and replayable.

| Control | Action |
| --- | --- |
| A/D / left and right arrows | Move; face the opponent automatically |
| W / Up / Space | Jump |
| S / Down | Crouch |
| J / K / L | Light / heavy / special |
| Crouch + J / airborne J or K | Low sweep / overhead jump attack |
| Shift | Guard; hold crouch as well to stop sweeps |
| Touch directions + Light / Heavy / Special / Guard | Independent held controls and attack presses |
| Escape / P / Pause | Pause; use Resume to continue |
| Fullscreen / Exit fullscreen | Change display mode from the menus |

Choose Tempest citadel or Gilded dawn in Options, including alternate fighter costumes. Original articulated Canvas fighters, citadel scenery, bounded impact effects and AudioBits sound distinguish misses, contact and guard. The entire fixed arena scales uniformly on narrower screens. Restart starts fresh; Game setup returns to fighter selection. See [fighting rules and source ownership](docs/games/obsidian-duel/README.md).

## Blastline

![Blastline: Nova opens a firing lane through an occupied industrial station](docs/games/blastline/blastline.png)

Make an entrance. Catch the last ride out. Run, jump and blast through **Border Station** and **Foundry Run**, breaking cover, dropping elevated defenses and setting off explosive barrel chains. Start with **Nova** and her automatic rifle, rescue **Bolt** to unlock a slower rocket launcher, then swap between both weapon styles. Disable power relays, break the fortified **Bastion** and extract before each facility collapses. The intended first-play pace is 3–5 minutes.

| Control | Action |
| --- | --- |
| A/D / left and right arrows | Run |
| Space | Jump; release for a short hop |
| J | Hold to fire |
| W/S / up and down arrows | Aim vertically; combine with movement for diagonals |
| K | Throw a fused grenade |
| Q | Switch operator after rescuing Bolt |
| Touch directions + Jump / Fire / Grenade / Switch | Independent simultaneous controls |
| Escape / P / Pause | Pause; use Resume to continue |
| Fullscreen / Exit fullscreen | Change display mode from the menus |

Choose Iron coast or snowy Arctic relay in Options. Five lives and green supply checkpoints support the operation. Brick and armored cover break, while structural routes keep required objectives accessible. Death preserves destruction and mission progress; Restart restores the complete world. Original Canvas pixel artwork, bounded debris and procedural AudioBits sounds power the action. See [gameplay and source ownership](docs/games/blastline/README.md).

See the [shared architecture](docs/architecture.md) for repository layout and common ownership.

See [README](README.md) for local setup.
