# Foundation review — 2026-10-27

This is the earlier, single-game audit. The collection now has two complete games. See the [two-game review](two-game-review.md) for current boundaries and verification.

Reviewed the implementation at `a6aada51d6e46d8ab867fc40d403e50277059029`, then made the focused changes described below. At that review, Last Light Clearing was the only playable game. No gameplay, presentation implementation, runtime dependency, or round content changed.

## Findings and changes

1. **Frame-loop ownership:** `createHost.start()` could schedule two independent loops when called twice. Disposing from inside a frame callback still scheduled another frame, and starting a disposed host scheduled work. A focused regression reproduced pending-frame counts of 2 after repeated start, 1 after in-frame disposal, and 2 after another start. The same check now sees 1, 0, and 0. Start and disposal are idempotent and scheduling checks disposal after the callback.
2. **Mounting ownership:** `main.ts` directly owned a clearing session, with no application-level replacement contract. `application.ts` now owns one active `GameEntry` / `GameSession` and a fresh mount point for each game. Replacement disposes the old session first. Failed mounts leave no mount-point DOM. HMR disposes the application. This is a synchronous factory and cleanup contract, with no registry, game selector, or engine API.
3. **Clearing-specific browser metadata:** the browser host hardcoded the clearing's name and movement instructions. The clearing composition now supplies its class and accessible labels.
4. **Styles surviving game replacement:** control defaults, headings, layout classes and interface selectors were global. They now match only `.clearing-app`. Page and mount-point sizing live in the small `application.css`. A replacement fixture using a button, `.hud`, and `data-skin="glass"` keeps its own native styles.
5. **Browser-check precision:** headed Chromium exposed sub-unit shifts in the centroid of a stationary but animated raster sprite. Existing active-time stop/resume checks now allow less than one world unit of raster variation, below a single full-strength 60 Hz movement step of 2.5 units. The paused-frame equality check remains exact. The mounting regression also checks the actual fresh player's X position after holding movement across replacement.

## Ownership review

| Area | Finding and decision |
| --- | --- |
| Simulation and pause | Fixed 60 Hz steps, bounded catch-up, explicit pause/resume, and run replacement already have appropriate owners. No browser APIs in rules. Retained. |
| Combat and progression | Linear collision scans are small at authored population/projectile counts. Notifications drain once across fixed steps and go to visuals and sound together. No spatial index, pooling, or simulation changes warranted. |
| View and input | Explicit world bounds and player target feed a single invertible transform. Relative gestures use CSS pixels. Layout/focus transitions clear input and timing. Clearing camera modes and controls remain game-specific. |
| Canvas | Rendering, animation observations and cosmetic effects remain outside simulation. Drawing costs stayed within the sampled frame budget. No caching or drawing rewrite warranted. |
| Three.js | Mesh slots, shared materials/geometry and instanced transient batches already avoid per-actor construction during gameplay. Busy-scene draw calls are the main monitoring point. No renderer changes warranted. |
| vgpu/WebGPU | Bounded storage, two compiled pipelines, explicit single-pass submission, native loss handling and owner disposal behaved correctly. Unchanged-size surface resize already exits early inside vgpu. No buffer/pipeline/shader rewrite warranted. |
| Assets and animation | Bundle validation, cancellation, preparation generations and offscreen candidate painting already handle failure and supersession. Actor observations prune missing IDs and reset with the run. Retained. |
| UI and configuration | Menus, skins, rounds, settings and HUD deliberately remain clearing-specific. Scoped styles prevent cross-game leakage. No generic menu schema added. |
| Audio | One lazy context per clearing session, bounded voices, immediate cancellation on pause/retry and native context closure on disposal. Replacement/remount checks observed closed old contexts. Retained. |
| Async presentation replacement | Existing generation checks discard late candidates, old resources remain until successful commit, and replacement resets effects without replaying consumed notifications. Existing and new lifecycle checks cover these paths. Retained. |

The shared contract requires only mounting into an element and disposing the returned session. It carries no world dimensions, player model, notifications, renderers, menu actions, or content. A future game can choose whether to use the browser host at all. The existing clearing application, control mapping, camera, screen overlay, art, audio cues, simulation, and three presentations remain where they were.

## Small local performance baseline

Measured in headed Playwright Chromium 156 on macOS, with native WebGPU available, a 1280×1000 browser viewport, and a 1280×900 rendering surface at DPR 1. A temporary harness used `performance.now()`, real animation-frame timestamps, Three.js resource counters, and native GPU creation/destruction/submission counters. The harness was kept outside the repository; no runtime diagnostic or performance gate was added.

The deterministic seed-42 waypoint route from the existing complete-round invariant supplied snapshots at about 45 seconds (8 enemies, 9 projectiles, 12 gems) and 150 seconds (12 enemies, 13 projectiles, 71 gems). A separate busy fixture retained the late loadout/gems and used the authored 60 ordinary enemies plus one elite and 16 projectiles. The busy fixture measures capacity, rather than claiming to be a naturally reached route snapshot.

Each presentation/scenario ran 150 real frames, discarding the first 30. Times below cover `resize` plus CPU drawing/submission, including driver work visible to JavaScript. They are not isolated GPU execution timings. The browser timer's approximately 0.1 ms granularity makes individual simulation medians uninformative, so small simulation costs are reported as averages.

| Presentation | Ordinary draw median / p95 | Busy draw median / p95 | Busy frame interval median / p95 |
| --- | --- | --- | --- |
| Lanternwood Canvas | 0.6 / 1.3 ms | 1.5 / 2.5 ms | 16.7 / 17.3 ms |
| Ember Ruins Canvas | 1.0 / 1.4 ms | 1.3 / 1.9 ms | 16.7 / 16.8 ms |
| Prism Garden | 2.0 / 2.9 ms | 4.2 / 5.0 ms | 16.7 / 17.2 ms |
| Ember Conservatory | 1.5 / 2.8 ms | 2.8 / 3.7 ms | 16.7 / 17.4 ms |
| Abyssal Bloom | 0.6 / 0.9 ms | 0.5 / 1.1 ms | 16.7 / 17.6 ms |

- The full deterministic round averaged approximately **0.0044 ms per simulation step**, excluding notification draining, upgrade selection and rendering. This is a small local CPU sample, not a device guarantee.
- Swept collision with 61 enemies and 16 projectiles averaged **0.0191 ms per call** over 1,500 identical cloned busy fixtures, with cloning excluded. No collision optimization justified.
- Already-imported presentation construction took about 0.2–0.8 ms for Canvas, 44 ms for Prism, 8 ms for pixel garden, and 47 ms for Bloom including pipeline preparation. Image decoding and module transfer were excluded from those construction timings.
- A paused HUD sample of 120 updates cost about 0.004 ms per call in the preceding run. One repeated meter-attribute mutation per update was visible, without meaningful measured cost. Left alone.

Twenty frame-paced resets and draws at the same busy state retained identical Three.js geometry/material/texture counts. Prism retained 6 authored geometries, 25 materials and one authored texture; its renderer reported 6 resident geometries and 4 textures including render targets. Pixel garden retained 68 authored geometries, 26 materials and two authored textures; the renderer reported 68 resident geometries and 5 textures after every actor slot had been drawn. This is expected slot residency, not growth with restart count.

Bloom retained **6 native buffers and 2 pipelines** after warm-up and after 20 frame-paced resets. It submitted once per draw: 450 sampled/warm-up frames plus 20 reset frames produced 470 submissions. After disposal and queued cleanup, all 6 buffers were destroyed and the native device was destroyed once. vgpu's extra buffers are frame-uniform capture pages, reused after submitted work completes. An artificial burst of 20 submissions in one JavaScript turn temporarily allocated additional in-flight pages; its implementation retires those pages after completion/disposal. No application-level pool was added.

Repeated game mounts leave one live session/frame, and application disposal leaves no frame or mount DOM. Existing replacement checks observe matching creation/disposal counts for garden resources. These counters establish ownership and bounded resource behavior in the exercised paths; they are not an exhaustive heap-retention proof.

## Loading and lifecycle verification

The production build retains independent lazy garden and Bloom chunks. The browser check verifies Canvas play does not fetch either graphics implementation/library. The final main script is about 59.1 kB (20.9 kB gzip), garden 543.6 kB (136.8 kB gzip), and Bloom 220.0 kB (59.4 kB gzip). CSS scoping adds about 0.1 kB gzip. No dependency or bundle-splitting policy changed.

Local verification uses the existing invariant and Chromium suites plus two focused mounting regressions. Covered paths include Start, Pause, Resume, repeated Restart/Retry, Return to title, both rounds and outcomes, upgrades/confirmation release, interface/accent/appearance replacement, held keyboard and pointer cancellation, resize/fullscreen, focus loss/restoration, failed images/audio, superseded async preparation, GPU initialization failure, native WebGL/WebGPU loss, active game replacement, pending preparation disposal and remount.

- `pnpm check`: strict types, all 25 invariants, and production build passed.
- `pnpm check:browser`: 7 passed; the adapter-less WebGPU case verified failure retention and skipped its GPU-only assertions.
- `pnpm check:browser --headed`: all 8 passed, including native WebGPU pipeline preparation, replacement and device loss.
- `git diff --check`: passed.

## Remaining monitoring points

- Prism reached 859 render calls including shadows in the busy fixture, versus 278 for the pixel garden. It sustained the sampled frame cadence, so leave it alone until slower-device evidence justifies a rendering change.
- The garden chunk still triggers Vite's existing 500 kB warning. It remains lazy and does not affect Canvas startup transfer; its selection-time cost is worth watching on slower connections.
- These short local samples do not establish mobile GPU performance, long-duration heap stability, physical touch-device behavior, or subjective audio quality. Native shader execution and device loss were exercised in headed Chromium; headless Chromium without an adapter verifies initialization fallback and skips GPU-only assertions.
