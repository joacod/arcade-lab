# Skybreak

An original Canvas 2D vertical arcade shooter, loosely inspired by the accessible movement, forward fire, and temporary evasive protection of [1942](https://en.wikipedia.org/wiki/1942_(video_game)). The fictional aircraft, ocean artwork, synthesized cues, formations, and sortie are original. No Capcom artwork, audio, branding, or level content is included.

## Sortie and rules

The physical playfield is 480×800 world units. Movement is 300 units per active second, normalized diagonally. Ten formations arrive on authored active-time deadlines over a 72-second sortie. Straight approaches form a wing, crossings descend diagonally from alternating sides, and swooping formations follow offset sinusoidal paths. Each enemy fires aimed rounds at explicit intervals while ahead of the player. Finishing the sortie alive wins; losing all aircraft ends it in defeat. Defeating aircraft awards 100, 150, or 200 points by type. Enemies that escape give no score.

The player starts with three aircraft, each with three hull points. A hit grants 1.15 seconds of protection. A lost aircraft respawns at the starting position with restored hull, 2.5 seconds of protection, and hostile bullets cleared. The evasive roll gives 0.65 seconds of immunity and recharges in seven active seconds. It requires a fresh press, so holding a key never queues another roll. Bright cyan rings show protection, blinking shows damage immunity, and the Roll control displays readiness, recharge, or IMMUNE.

Twin player projectiles fire every 0.14 seconds while Space/J or the movement pointer is held. Physical collision uses small circles, independent of the planes' wings and decorative trails. Swept relative collision accounts for both a projectile and its target moving during the same step. Each shot resolves only its earliest living intersection. Shared damage immunity prevents overlapping collisions from removing multiple hull points at once. Lethal damage is resolved before final-tick victory.

## Browser ownership

The session reuses the browser host, fixed-step clock, and bounded synthesized voice playback. All aircraft, wave logic, combat, input actions, UI, and presentation are Skybreak-specific. There is no dependency on Clearing's progression, content, themes, or camera. `game.ts` and `content.ts` can run without DOM or Canvas APIs. Restart reconstructs the entire run. No saved progress or compatibility format is introduced.

The browser uniformly scales and centers the portrait world at any surface size; wide displays retain side gutters. Relative pointer displacement is measured in CSS pixels. Dragging steers continuously and holding fires automatically. A second touch can roll without releasing steering. Menus receive no gameplay input. Pause, hidden pages, focus loss, and layout changes clear inputs and discard catch-up time. Only explicit Resume continues a paused sortie. One host loop owns simulation and drawing; returning to game selection releases listeners, capture, the frame, canvas, and audio context.

Ocean scrolling, clouds, island placement, and particles are presentation-only. Cosmetic noise is independent of rules. Effects are capped at 180 particles and age in active simulation time. Audio coalesces each cue per frame, caps total voices at 12, and retains no backlog. Sound initialization failure leaves the game playable.

## Local verification

`pnpm check` includes focused swept-collision, damage/immunity/respawn, deterministic scheduling, bounded full-sortie, pause/fresh-run, and uniform-projection checks alongside the existing Clearing invariants. `pnpm check:browser` adds one representative Skybreak Chromium flow covering keyboard and native touch input, cancellation, two-touch roll, pause/resume, focus loss, layout suspension, restart, terminal UI, and switching between both games with frame/audio disposal. The flow captures desktop and narrow gameplay for visual inspection. Browser outcome fixtures fast-forward active time or inject a lethal projectile; the invariant test covers the complete authored timeline.

Physical mobile hardware and subjective listening are separate manual checks. Bosses, pickups, weapon progression, and advanced enemies are deferred to Step 3.
