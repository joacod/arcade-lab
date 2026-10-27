# Two-game implementation review — 2026-10-27

Skybreak now has a complete sortie, pickups, and Iron Tempest encounter. Last Light Clearing retains its original rules and presentations. This review supersedes the single-game scope of the [earlier foundation audit](foundation-review.md).

## Reuse decisions

| Candidate | Evidence and decision |
| --- | --- |
| Mounting and browser lifetime | Both entries already use `application.ts` and `browser/host.ts`: synchronous cleanup, one active mount, one frame, measurement/DPR, lifetime signal and explicit disposal. Retained those APIs unchanged. |
| Fixed timing | Both already use `browser/clock.ts`. Its fixed step, catch-up bounds and transition reset fit both. No run state moved into it. |
| Collision | `combat.ts` and `skybreak/game.ts` duplicated quadratic segment/circle intersection. Extracted `collision.ts:sweptCircle`, a pure five-argument relative sweep returning earliest contact or undefined. Clearing supplies identical target endpoints, preserving its existing stationary-target checks. Skybreak supplies previous/current positions. Both callers retain target eligibility, nearest-hit selection, damage, scoring and projectile lifetime. No compatibility wrapper or physics objects. |
| Physical input | Both capture keys and relative drags, but Clearing exposes movement/stick state while Skybreak adds held fire, consumed roll presses and a second touch control. A common binding would add options and callbacks to both. Kept bindings local; the Clearing binding's location under `browser/` does not make it shared. |
| Views and backing buffers | The host shares CSS measurement/DPR. Clearing has a clamped following camera across Canvas/WebGL/WebGPU; Skybreak has a fixed portrait fit. Each keeps one authoritative transform and owns its backing resolution. A common camera would obscure their different policies. |
| Audio | `browser/audio.ts` was already the common owner: one lazy context per session, twelve voices, gain envelopes, cancellation, suspension and closure. Local adapters select independent cue maps and priorities. Refined Skybreak's quiet guns and distinct damage/pickup/boss cues without changing the owner. |
| Assets | Only Clearing loads bundles and performs async renderer replacement. Skybreak draws procedural Canvas art. Reusing the image loader would introduce an unused dependency, so it stays specific. |
| UI | Both display state and emit intents, but round/appearance/upgrade controls and sortie/boss/results are different. Scoped styles and independent menus suffice. No shared menu schema or renderer interface. |

Clearing's enemies, XP, upgrades, weapons, elite, arena and appearance system remain specific. Skybreak's aircraft, supply schedule, two concrete gun improvements, timed spread, scoring, roll and fortress remain specific. Shared infrastructure contains no game content. Hit-flash timers stay in presentation, driven by target-tagged hit notifications; they add no visual state to simulation. No package, runtime dependency, compatibility layer or engine machinery was added.

A common relative-drag primitive might become useful if a third binding needs the same capture/cancellation semantics. Asset loading may become shared if another game actually loads image bundles. These are observations, not implemented APIs.

## Local measurements

Before changes, a production build measured Skybreak's lazy script at **17.76 kB / 7.08 kB gzip**, Clearing at **53.26 / 18.55**, shared browser/audio code at **3.76 / 1.62**, and collection entry at **7.24 / 3.29**. After completion: **27.44 / 10.44**, **53.05 / 18.46**, **3.99 / 1.75**, and **7.25 / 3.29**, respectively. Skybreak CSS grew from **4.56 / 1.42** to **6.11 / 1.81 kB**. Most growth is the added game; collision moved into the existing shared chunk and slightly reduced Clearing's script. Garden (**543.60 / 136.84**) and Bloom (**220.02 / 59.41**) sizes are unchanged. The existing garden chunk warning remains. Chromium request checks confirm Canvas sessions do not fetch graphics implementations/libraries.

A temporary harness outside the repository sampled a naturally reached second-phase fortress snapshot at about 124 seconds with **51 bullets**, no ordinary aircraft/pickups, and half fortress health. Headless Chromium at 1280×1000, with a 1280×850 DPR-1 drawing surface, sampled 180 real animation frames and discarded 30 warm-up frames. Canvas draw median / p95 was **0.20 / 0.30 ms** and frame interval median / p95 **16.7 / 16.7 ms**. This covers CPU drawing/submission, not isolated GPU execution. Cloned copies of that snapshot averaged **0.022 ms per simulation step** over 2,000 steps, excluding cloning. Timer granularity and the local desktop limit interpretation. There is no performance gate or speculative optimization.

## Verification and inspection

- `pnpm check`: strict types, **34 invariants**, and production build passed. Four focused invariants were added, covering shared collision and concrete pickup/boss behavior. Existing nearest-hit, scheduling, pause, fresh-run, and object-budget checks were updated for the complete sortie.
- `pnpm check:browser`: **8 passed, 1 skipped**. Adapter-less headless Chromium verified WebGPU fallback and skipped GPU-only assertions. Representative Skybreak coverage now includes pickup HUD, fortress hull, kill-driven results and survival scoring, alongside native touch/cancellation, two-touch rolling, keyboard, restart, suspension and two-game disposal. It observes no graphics requests and closes previous audio contexts/frames.
- `pnpm check:browser --headed`: **9 passed**, including native WebGPU switching/device loss and the existing Three.js checks. One earlier Clearing flow was interrupted by Vite reloading during a source edit; the subsequent stable full suite passed. The Skybreak flow was rerun after final presentation ownership and target-lock corrections.
- A separate full Chromium playthrough used ordinary keyboard actions from a deterministic steering driver, with no immunity, health, score, timeline or boss injection. It won at **2:17**, scored **22,700**, downed **75 aircraft**, collected **8 supplies**, used **10 rolls**, and retained three lives after early hull damage and repair. Captures at early/late formations, entrance, both boss phases, destruction and results were visually inspected. No browser errors occurred. This demonstrates a complete playable route, not human difficulty acceptance.
- A second natural idle flight exhausted its aircraft at **0:34**, showing the defeat screen without outcome injection. Existing Clearing browser flows exercised movement, combat/upgrades, both rounds, renderer replacement, resuming, restart and context-loss recovery after the extraction.
- `git diff --check`: passed.

Physical touch hardware, subjective speaker/listening quality, slower-device performance and long-duration heap stability remain unverified. Chromium touch emulation and the bounded voice/lifetime checks cover their narrower contracts.
