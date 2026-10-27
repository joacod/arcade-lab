# Game catalog

Choose a game from the collection screen. **Game selection** in its title, pause or result menu returns to the collection; each visit starts a fresh session. The application fills the browser viewport, with menus scrolling inside the game.

## Last Light Clearing

![Last Light Clearing in Close view: the Keeper uses Spark and Halo while crawlers approach and green XP gems lie nearby](docs/images/last-light-clearing.png)

**Fullscreen** includes the arena, HUD and menus when supported by the browser.

Move the Keeper through a crowded forest, collect XP gems and choose upgrades while weapons fire automatically. Spark, Halo, Pulse and Shard offer different ways to survive, with a Spark evolution and a late elite encounter. Survive **Until dawn** for three minutes or try the 90-second **Brief dusk** round.

Choose SVG, animated pixel, sculpted Three.js or procedural WebGPU appearances with the same gameplay rules. Appearance, interface, accent, Close/Whole arena view and sound settings are available at title or pause; round selection is at title. Settings persist through retries until reload. Appearance changes retain the paused run and require Resume. Failed artwork/audio can fall back to silhouettes/silence; unavailable graphics retain a working appearance or restore Canvas.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Hold and drag in the arena | Move with mouse, touch or pen; release to stop |
| Escape / P / Pause | Pause; use Resume to continue |
| Click / tap, or arrows + Enter / Space | Choose an upgrade, then release to continue |
| Tab / Shift+Tab | Focus menu controls |
| Fullscreen / Exit fullscreen | Change display mode |

See [game rules and implementation](docs/last-light-clearing.md) and [art setup and provenance](src/art/README.md), including the optional development-only Mosslight appearance.

## Skybreak

![Skybreak: upgraded forward and spread fire face the Iron Tempest fortress above the ocean](docs/images/skybreak.png)

Fly a 2–3 minute ocean sortie through fifteen formations to **Iron Tempest**, an armored flying fortress with three telegraphed attack patterns. Collect Power, temporary Spread and Repair supplies. Three lives and a rechargeable evasive roll help you reach the boss and earn a survival bonus. Original procedural Canvas artwork and synthesized sound require no downloaded art or audio.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Steer |
| Space / J | Hold to fire |
| Shift / K / Roll button | Evade; recharges between rolls |
| Hold and drag on the playfield | Steer and fire with touch, mouse or pen; release to stop |
| Escape / Pause | Pause; use Resume flight to continue |

The portrait playfield scales uniformly and stays centered. Roll supports a second touch while steering. Focus loss or display changes pause play and clear held input. Restart creates fresh gameplay state. Sound can be muted, and unavailable audio never prevents play. See [game rules and implementation](docs/skybreak.md) for pickups, boss patterns, tuning and source ownership.

See [README](README.md) for local setup.
