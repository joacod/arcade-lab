# Skybreak

An original Canvas 2D vertical arcade shooter. The fictional aircraft, ocean, fortress, synthesized cues, formations and sortie are original application code under the repository's MIT license. No external artwork or audio assets are used. See the [game catalog](../CATALOG.md) for controls.

## Operation Iron Tempest

A complete flight lasts about 2–3 active minutes, with a hard 168-second limit. Fifteen formations arrive between 1 and 100 seconds. Straight wings fire aimed singles, diagonal crossings close from alternating sides, swooping bombers fire slow tridents, and narrow interceptors fire faster aimed pairs. After 65 seconds enemy firing intervals shorten by 15%. Escaping aircraft give no score. Defeating them awards 100 / 150 / 200 / 300 points by type.

Supply drops arrive on fixed deadlines, independent of kills or chance. They drift downward at 80 world units/second. Each collection awards 100 points:

| Pickup | Appearance | Effect |
| --- | --- | --- |
| Power | Gold double chevron | Gun II adds a center shot; Gun III also shortens cadence from 0.14 to 0.105 seconds. Further power pickups award 250 extra points. |
| Spread | Violet branching arrows | Adds two diagonal shots for 24 active seconds. Collecting another refreshes the duration. |
| Repair | Green cross | Repairs one of the current aircraft's three hull points. At full hull, awards 250 extra points. |

The player starts with three aircraft. Losing hull grants 1.15 seconds of immunity. Losing an aircraft restores hull at the starting position, clears hostile rounds, restores roll readiness, lowers forward fire by one level, removes spread, and grants 2.5 seconds of immunity. Lives do not increase. A fresh roll press grants 0.65 seconds of immunity and recharges in 5.5 active seconds. Holding its key never queues another roll. The cockpit dot marks the physical player position. Blinking and a cyan ring show protection; a short edge flash and a separate damage sound distinguish player damage from enemy impacts.

Movement is immediate at 300 world units/second, with normalized diagonals and proportional drag strength. The physical world is 480×800. Small authored collision circles remain independent of decorative wings and glow. Shared relative swept-circle math accounts for movement of both endpoints. Each projectile resolves its nearest living target once.

## Iron Tempest

The armored flying fortress arrives at 112 seconds. Its three-second entrance protects it from damage and suppresses firing. Its broad armor is decorative; the glowing central reactor and two moving engine nacelles are the hittable circles. All three reduce one 420-point hull, displayed with phase and attack warnings.

It cycles three readable patterns:

1. **Fan volley:** seven slow rounds spread downward with gaps. Dashed rays show the spread before release.
2. **Target lock:** both engines fire three aimed rounds toward the player's position captured at charge start. Dashed lines and a target ring mark that fixed position. Moving after the warning avoids the lock.
3. **Lane barrage:** three marked vertical lanes receive four rounds each. The next barrage alternates the lanes, leaving broad safe corridors.

At half hull, fans widen to nine rounds, aimed rounds accelerate, charge shortens from 1.1 to 0.9 seconds, and recovery shortens from 1.7 to 1.1 seconds. The fortress continues its slow lateral movement. Contact with its weak points damages the player; decorative armor does not.

Destroying it awards 5,000 points and clears hostile objects. A 2.8-second destruction state in the simulation drives the bounded explosion sequence. Movement remains available, pause freezes it, and no renderer callback advances it. Victory then awards 1,000 per remaining aircraft plus 250 per hull point. Results show score, flight time, kills, supplies, and the survival bonus. Losing all aircraft or reaching the time limit with the fortress alive ends in defeat. Damage on the kill step resolves before victory.

## Browser ownership and presentation

The session reuses the browser host, fixed-step clock, and bounded synthesized voice playback. Collision math is shared with Clearing. All aircraft, drops, weapons, waves, scoring, roll, boss behavior, action input, UI, and presentation stay local. Simulation imports only typed content and pure collision math. Restart reconstructs the entire run; no saved format is introduced.

One uniform transform scales and centers the portrait field. Relative drag displacement stays in CSS pixels. Holding a movement pointer fires; a second touch can roll. Cancellation releases capture. Pause, hidden pages, focus loss, and layout changes clear input and catch-up time. Only explicit Resume continues. Returning to game selection aborts listeners and releases the frame, canvas, and audio context. No Three.js or vgpu code is needed by Skybreak.

Deep reef ribbons, currents, island shelves, clouds, aircraft shadows, rotating nacelle rings, glow, and flashes are procedural Canvas cosmetics. Particles are capped at 180; fortress destruction adds only nine analytic fire blooms. Effects age in active run time, so pause freezes them. Sound coalesces each cue per frame, caps total voices at 12, and retains no backlog. Quiet short gun cues leave room for pickups, hull damage, rolling, warnings, explosions, and outcomes. Audio initialization failure leaves play available.

Change balance, supply deadlines, collision sizes, and formations in `src/skybreak/content.ts`; explicit behavior and rules in `game.ts`; artwork/effects in `presentation.ts`; synthesized cue definitions in `sound.ts`; menus/HUD in `ui.ts` and scoped `style.css`; browser input in `input.ts`; composition in `app.ts`.

## Local verification

Focused invariants cover nearest swept hits, immunity/respawn, deterministic scheduling and object budgets, power caps and spread expiry, repairs, pause/fresh runs, protected boss entrance, all three attack cycles, phase change, kill-only victory, timeout defeat, and one-time result scoring. Shared collision checks cover relative motion, overlap, tangent/miss, zero travel, and endpoints. The existing Clearing checks exercise the same helper through its weapons.

The representative Chromium flow covers keyboard and native touch, cancellation, two-touch roll, suspension/restart, pickup HUD, boss hull/results, audio failure, lazy graphics loading, and switching games with frame/audio disposal. Terminal fixtures shorten that regression. Chromium emulation does not establish physical-device behavior or subjective audio quality. See [architecture](architecture.md#local-verification) for commands and [sound](architecture.md#sound) for audio integration status.
