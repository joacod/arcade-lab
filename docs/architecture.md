# Shared architecture

[AGENTS.md](../AGENTS.md) defines development principles. [CATALOG.md](../CATALOG.md) is the index for game-specific documentation, source ownership and rendering details.

## Repository layout

```text
src/
  app/                 Collection catalog, selection screen, mounting and entrypoint
  common/ui/           Collection-wide menus, fields, readouts and DOM presentation
  engine/              Game-independent contracts, fixed-step clock and collision math
    browser/           Host, input capture, focus/lifetime bindings and AudioBits owner
  games/<game-slug>/    Each game's content, simulation, session, input, UI and presentation
    art/               Bundled artwork and asset guides

docs/
  architecture.md      Shared ownership and maintenance guide
  games/<game-slug>/    Game guide and documentation screenshots

tests/
  unit/engine/         Shared pure infrastructure invariants
  unit/games/<slug>/   Game rules and presentation invariants
  unit/                Cross-game recipe validation
  browser/app/         Startup smokes, artwork retry and collection/session lifetimes
  browser/engine/      Shared browser/audio lifecycle
  browser/common/      Representative presentation/menu integration
```

The [catalog](../CATALOG.md) links to each game's guide. Source, guides and unit tests use the same game slug; browser startup checks iterate the collection catalog. Open `app.ts` inside a game to trace its composition; follow `content.ts` for tuning and `game.ts` for simulation rules. All modes render through Canvas 2D. Detailed scenery code and image preparation stay inside the owning game, behind its lazy imports. Appearance controllers own cancellation, replacement and graphics-failure recovery. Preparing a replacement retains the active renderer until the candidate can draw; simulation state and the host loop remain session-owned. Shared pose observations belong with the game when multiple renderers need the same animation.

Runtime artwork belongs in the owning game's `art/` folder. One canonical screenshot of the best completed presentation lives beside each game guide as `preview.webp`. The landing, README, catalog and game guide all use that file; collection metadata lives in `src/app/catalog-data.ts` and lazy game loaders in `src/app/catalog.ts`. See [collection previews and site identity](#collection-previews-and-site-identity) when replacing screenshots. Commit all artwork required by enabled modes. Keep useful prompts, templates, dimensions and role mappings with the game. Development and production import the same committed bundles. Generated builds and browser reports stay ignored.

`src/engine/` and `src/common/` have no imports from the application or games. Games depend on the engine's session contract rather than importing the application implementation. The application owns collection metadata and lazy game loaders; each entry supplies one metadata record and loader without adding a second card template.

Engine code supplies game-independent execution and resource mechanisms. `engine/browser/` marks browser dependencies, not a place for every file using a browser API. Collection-specific presentation conventions belong in `common/ui/`: menus, their layout, fields and DOM updates. A game's browser session, renderer, theme definitions and asset-role mapping remain under that game. `common/` is not a holding area for helpers without a clear owner.

## Shared source map

| Responsibility | Owner |
| --- | --- |
| Collection metadata and canonical screenshots | `src/app/catalog-data.ts` |
| Lazy game imports | `src/app/catalog.ts` |
| Site identity, metadata and generated share assets | `src/app/site.ts`, `public/icon.svg`, `scripts/site-assets.mjs` |
| Entrypoint and selection screen | `src/app/main.ts`, `src/app/selection.ts` |
| Synchronous mount/dispose contracts | `src/engine/session.ts` |
| Cleanup that attempts every owner and aggregates failures | `src/engine/disposal.ts` |
| Active session and mount point | `src/app/application.ts` |
| Viewport and mount-point sizing | `src/app/application.css` |
| Persistent arcade fullscreen target | `src/engine/browser/fullscreen.ts`, supplied by `src/app/application.ts` |
| Measurement, display-change suspension, frame loop and lifetime signal | `src/engine/browser/host.ts` |
| Page visibility, blur, page-exit and deferred focus binding | `src/engine/browser/session.ts` |
| Action-to-key maps, binding conflicts and key labels | `src/engine/bindings.ts` |
| Keyboard/button holds, press edges and independent touch capture | `src/engine/browser/buttons.ts` |
| Circular touch-pad layout and authored direction labels | `src/common/ui/direction-pad.ts`, `direction-pad.css` |
| Configured game menus, actions, focus and common utilities | `src/common/ui/menu.ts`, `menu.css` |
| Native theme choices, choice styling and multiline result readouts | `src/common/ui/menu-components.ts`, `menu-components.css` |
| Stable element lookup and change-only DOM updates | `src/common/ui/dom.ts` |
| Bounded fixed-step timing | `src/engine/clock.ts` |
| Pure swept-circle intersection and strict rectangle overlap | `src/engine/collision.ts` |
| Pure cue deadlines and clock-reset handling | `src/engine/cooldowns.ts` |
| AudioBits session lifecycle and bounded playback | `src/engine/browser/audio.ts` |
| Cancellable image preparation, retryable initial resources, dimension comparison and source release | `src/engine/browser/images.ts` |
| Latest-request cancellation, required-resource readiness and replacement draw trials | `src/engine/browser/preparation.ts` |
| Theme labels, ordering and availability | `src/common/ui/theme-choices.ts` |

## Lifetimes and execution

`GameEntry.mount(container, fullscreen): GameSession` returns synchronously. The application disposes the previous session before creating a fresh mount point. It removes that mount point even if construction or disposal throws; games must release resources acquired before a failed construction. Disposal is idempotent. Mounting after application disposal is rejected.

The application supplies a fullscreen control targeting its persistent container, so collection navigation and game replacement stay in fullscreen. Hosts receive this control explicitly. Fullscreen remains opt-in, with a collection button, a gentle recommendation when supported and the F shortcut. The collection binds F to the document for its mounted lifetime so it works before any control receives focus. Game hosts still observe display changes, clear held input and suspend active play.

Required artwork loads inside the mounted session. `createImageResource` owns the initial request and exposes `prepare()` for retry; `createReadiness` gates simulation and gameplay actions until preparation succeeds, ignoring stale completions and callbacks after disposal. The shared menu displays progress or a retry action while theme selection and navigation remain available. A failed initial image request must not start an invisible game. Before the initial theme is ready, a new selection replaces the required preparation being watched. Preparation may resolve `false` to report failure without unlocking play. Once ready, optional theme preparation retains the playable presentation and allows Resume to cancel its replacement.

Session teardown uses `disposeAll` to attempt each cleanup in its explicit ownership order, including the browser host, even if graphics or another resource throws. Failures are reported together in an `AggregateError`; sessions retain their own idempotence and async invalidation guards.

The entrypoint guards stale imports and disposes the application on HMR. Each game owns its DOM, scoped styles and async preparation. Pending completions must be invalidated when their session ends.

The host owns a stable focusable surface and one frame loop. Starting is idempotent; disposal during a frame prevents rescheduling. Disposal cancels scheduling, aborts listeners, disconnects observation and removes the root. Renderers own their backing buffers and graphics resources. Surface observation updates measurements without suspending play: changing HUD text can legitimately change the available playfield. Window size, display density and fullscreen transitions still suspend play. The host suppresses text selection, long-press callouts, context menus and dragging within the game; menu scrolling remains available.

Hidden documents have no scheduled host frame. Becoming visible schedules exactly one frame again; the page-lifetime binding still resets simulation timing and requires deliberate gameplay resumption. Frame scheduling does not own run transitions or audio activation.

`bindPageLifetime` binds blur, hide, persisted page exit and final page exit with the host lifetime signal. Sessions supply suspension, timing reset and disposal; focus and gameplay transition rules stay local. All current game sessions use this binder. `bindSessionFocus` defers focusout handling until the destination settles, clearing input and suspending only when the session's focus predicate requires it. Transfers between playable controls preserve held input. During play, pointer presses on non-interactive HUD or control gaps retain playfield focus instead of blurring to the document body. Callbacks after host abortion are ignored. Sessions supply their own focus predicate, so different play controls and menu rules stay local.

`bindButtons` shares physical keyboard/button capture across button-based controls. It accepts an action-first `KeyBindings<Action>` table, where each action lists its physical `KeyboardEvent.code` aliases; touch buttons use the same action IDs. It owns keyboard aliases, independent pointer captures, rising edges, release/cancellation and abort cleanup. `setBindings` validates conflicting key assignments before replacing a table, then clears all held/queued input and pointer captures so old presses cannot trigger newly assigned actions. Browser modifiers and composing input are ignored. Games own their binding tables, optional layout choices and action semantics; derive player-facing key hints from those tables with the shared label helpers. Each simulation step consumes one held/pressed snapshot; game-local input adapters translate it into actions. An optional `directions` group captures one pointer across the circular pad, translates sliding into action holds with diagonals and a neutral center, and leaves other pointers free for action buttons. The common UI configures the existing labeled direction buttons; native keyboard and assistive clicks remain available. Gesture-based movement remains local to its existing owners. Sessions clear input at display and gameplay transitions and through the focus/lifetime bindings.

The clock bounds fixed-step catch-up; transitions reset timing so suspended wall time cannot advance play. Composition steps simulation and delivers its semantic events to visuals and audio. Collision math returns contact information; game rules own eligibility and consequences.

## Menus

The home screen is the game catalog. Each card provides a cover, name, gameplay description and genre; selection loads the game lazily. The shell retains the selected card and collection scroll position for the page lifetime. Loading names the requested game and offers cancellation; the import may finish, but the entrypoint's generation guard prevents a cancelled request from mounting. Returning, cancelling or retrying restores collection focus without persistent storage.

`createGameMenu` supplies a centered, accented scene-backed menu frame with game content and one prominent next action. Title and pause menus expose the same Arcade / Deluxe choices when both exist, alongside sound/fullscreen controls and a Settings button. Keep new-run choices such as game modes and fighters on the title screen through the optional `setup` slot. On wide screens these sit beside appearance choices, and Settings places keyboard preferences beside instructions; narrow screens stack the same content. Menu backgrounds use the game scene without separate enlarged character showcases. Settings holds keyboard layout preferences and How to play, with a fixed Back button naming the originating menu; it is a local menu view that never transitions or resets the game. Results, stage transitions and upgrade decisions show only their game-specific content and actions. Games provide their title, gameplay UI containers, authored setup/result markup, optional preference fields, control instructions and typed action definitions with the screens on which they are available. The shared `menuActions` definitions own Play, Resume, Restart and Game selection labels, availability and priority. Every pause menu uses Resume, Restart, Settings and Game selection in that order. Restart immediately replays the current choices while retaining theme and keyboard layout. Game selection ends the session; reopening a game offers its new-run choices. Sessions own those transitions. Checkpoint retries and named destinations remain game-specific. Stage transitions remain explicit game actions.

The component owns action visibility and focus, mute/fullscreen buttons, notices and compact layout. Its `readiness` method disables actions requiring artwork; mark navigation actions `requiresReady: false`. Sessions enforce the same readiness guard before starting or resuming simulation. Actions stay outside the scrollable content area. Wide pause panels place actions in one row and run details beside appearance choices. Narrow pause footers use full rows for run actions and navigation, keeping Settings and Game selection together. Changing game screens closes Settings and returns the scroll position to the top. Opening Settings focuses its heading; Back or Escape restores the originating menu, its scroll position and Settings button focus. Fullscreen Escape remains browser-owned. Gameplay instruments and touch controls are hidden behind menus while retaining their layout space. The menu layer is anchored to the game root, independently of the stage and theme-dependent HUD/footer heights. Constrained content can scroll without moving the action bar. Theme and utility controls stay out of result and progression screens so the next gameplay decision remains clear. If no visible action is marked primary, the first gameplay action receives the primary treatment.

Local pauses move focus from gameplay into the first available menu action. Window blur and focus outside the game never pull focus back. The menu body is keyboard-focusable for reading and scrolling. Games can provide `--menu-accent` on their root to carry their palette into the shared menu. Broad game button skins exclude `.game-menu-layer`; shared controls keep the same shape, typography, spacing and focus treatment in every presentation. Game-owned decision cards can retain their own styling. Routine HUD outputs are not live announcements; explicit status regions retain their authored behavior.

Games own configuration values, result updates, upgrade choices and action callbacks. The shared menu owns standard title, pause, result and stage-completion headings; game-owned upgrade decisions can supply their own heading. The component routes P to the visible Pause or enabled Resume action, F to fullscreen when available, and Escape to Pause when delivered. S toggles sound on title and pause screens, including Settings. Theme selection uses the visible native radio choices. These menu interactions preserve the retained run; S stays owned by gameplay movement/aim/crouch during play, and Tab retains normal focus navigation. Buttons display their shortcut hints. Repeated keydowns and editable controls are ignored. Escape is not prevented in fullscreen; the browser host handles display transitions even when no key event arrives. The component never starts, pauses or resets simulation itself. Listeners use the host abort signal. Add game-specific fields only when they control actual game behavior or presentation; shared menus contain no game content.

Cache stable session DOM through `createElementLookup`, and use the change-only text, attribute and property writers for frame-driven readouts. Keep rebuilt choice lists outside the lookup cache. Round CSS percentages to display precision so browser serialization does not trigger repeated equivalent writes. Formatting, update timing and the meaning of each readout stay with the game.

Compose the `game` content, `theme` field and optional `setup` and `preferences` as DOM elements, preserving references and listeners. Preferences appear only inside Settings; game setup and results retain their game-owned visibility. `createThemeChoices` supplies directly visible native radio choices with game-owned artistic names when both Arcade and Deluxe exist. Single-presentation games hide the field. Native arrows and Space operate the radio group; Tab retains focus navigation. During replacement the active option remains checked while the requested choice shows pending, and failure/cancellation restores the active choice. Definitions are game-owned; the menu never loads artwork. See the [mode contract](#mode-contract) for availability and defaults.

Required initial artwork gates Play, with retry and navigation available on failure. Selecting another implemented presentation also satisfies readiness. Gameplay setup choices can use native radio cards. `createKeyboardChoices` supplies Settings’ Keyboard layout cards from game-owned names and hand descriptions. Games retain the layout for the session, replace bindings through `setBindings` and derive hints from the active table.

`createMenuReadout` returns an `element` and `update(text)` for multiline scores or results. It starts hidden; the game controls visibility and formats its own summary. Unchanged text is not rewritten, and frame-driven updates do not announce as live status messages. Use the menu's notices for sound/display status. Keep HUD arrangements, health/XP displays, touch layouts and game-specific choice interactions local; menu actions and utility buttons already share their presentation and behavior through `createGameMenu`.

## Sound

All game sound uses the installed AudioBits public runtime and JSON-only recipes. Follow the [local skill](../.agents/skills/audiobits/SKILL.md) and installed package contracts when adding sound. There is no custom synthesis runtime, audio asset dependency, singleton or audio event bus.

Use layer `startOffset` for a secondary transient or staggered fanfare within one voice, keeping attack for the onset shape and delay for echoes. Offsets shift the source, envelope and layer automation together; recipe effects retain voice time zero. One-shot layers share the duration gate, so offset plus effective attack and decay must fit within it, and layer automation must end within the remaining duration. Pending layers belong to the same cancellation and voice budget as immediate layers.

`src/engine/browser/audio.ts` owns a lazy AudioBits engine per game session. Mounting and importing stay silent and create no native context. Start/Retry/Resume call activation synchronously in their existing gesture handlers; playback waits for successful activation. The owner reports failures through the game's existing status UI, allows another gesture to retry, and drops events while unavailable without a backlog. Its generation guard prevents cancelled activation from making old work audible.

The owner handles mute, normalized volume, overlap admission (including retiring/releasing voices), cancellation, suspension and disposal. AudioBits supplies graph construction, envelopes, seeded variation, filters, delay, per-sound limits and graph cleanup. Cancellation disposes the owned Sound instances immediately, including effect tails on a suspended clock; recipes are rebound lazily. Ordinary pauses retain the engine. A gesture racing an unfinished suspension or following a terminal context replaces it, disposing the old engine first. Muting or zero volume cancels and suspends; a fresh eligible gesture can restore sound. Disposal invalidates pending starts, disconnects all graphs and closes the native context.

Browser composition owns hide, blur, focus, display and page-lifetime decisions alongside gameplay suspension. Returning from a hidden page never resumes audio automatically. Restart cancels the old run before gesture activation; game selection and HMR dispose the departing session. Simulation emits only semantic notifications and never imports AudioBits or reads the audio clock.

Each game's sound adapter owns recipes, event mapping, batch coalescing, priority, cooldown intervals and expressive playback values. `engine/cooldowns.ts` shares deadline bookkeeping and resets deadlines when a replacement audio clock moves backward. Record a cooldown only after playback is admitted; clear it when resetting the adapter. Important milestones replace combat tails; routine bursts are throttled and excess voices discarded. Audio time is used only for presentation throttling. A new game supplies recipes and an adapter, reuses this owner, and wires the same session lifecycle without introducing another lifecycle implementation.

## Local development

See the [README](../README.md#play-locally) to start the development server. `pnpm build` creates a production build in `dist/`; `pnpm preview` serves it locally.

## Collection previews and site identity

Keep exactly one committed screenshot per game at `docs/games/<slug>/preview.webp`. Use a representative active scene from the best completed presentation, Deluxe when available or Arcade otherwise, without a pause/menu overlay. After changing that artwork, replace the screenshot as part of the same change. Deluxe is never required for a finished catalog entry. The landing, README, catalog and game guide link to the same stable file, so they cannot drift into separate image sets. Do not add hand-maintained thumbnails or retain the input PNG alongside it.

Capture gameplay on demand with browser tooling, outside the permanent test suite, then run:

```sh
pnpm screenshot clearing /tmp/preview-capture.png
```

The first argument is the collection ID from `src/app/catalog-data.ts`. The command encodes WebP at quality 82, caps width at 1440 without enlargement and replaces the canonical file. It also refreshes the generated social card. At the current screenshot sizes, one shared image is small enough for cards and detailed enough for documentation; separate thumbnail files add no useful maintenance benefit.

`public/icon.svg` owns the arcade cabinet mark. `src/app/site.ts` owns the public URL, repository link and search/share copy. Vite generates the PNG favicon, Apple touch icon, 1200×630 social card, robots.txt and sitemap.xml at startup and on every build. Those files stay ignored; the social card composes the canonical screenshots in collection order. Only the icon SVG and the canonical game screenshots need to be maintained. Restart development or rebuild after changing branding or site metadata.

The Vite HTML transform emits canonical, Open Graph, Twitter and WebSite structured data plus a static collection introduction. Search and link-preview clients receive this content before JavaScript runs. Only the collection URL belongs in the sitemap: games currently mount within it rather than exposing individual routes. A production build remains a static `dist/` directory.

## Local verification

Follow the mandatory [testing policy](../AGENTS.md#testing-policy) when choosing or changing coverage. `pnpm check` runs TypeScript, fast Node invariants and the production build. There is no separate lint runner.

`pnpm check:browser` runs the focused Chromium suite for browser integration, shared UI, presentation lifecycle and input changes. Minor artwork, documentation and game-data edits do not automatically require it. Install Chromium with `pnpm exec playwright install chromium` if needed. During individual game work, select the relevant checks, for example:

```sh
node --test 'tests/unit/games/<slug>/*.test.mjs'
pnpm check:browser tests/browser/app/startup.spec.ts --grep '<game title>'
pnpm check:browser tests/browser/common/appearance.spec.ts
```

The [startup suite](../tests/browser/app/startup.spec.ts) gives every catalog entry one ready-presentation/start smoke. Shared contracts use representative checks for required-artwork retry, paused-run presentation replacement, host suspension/disposal, cancelled lazy imports, captured input and native audio activation races. Deterministic rules, image validation, cancellation and replacement rollback stay in Node. Existing bounded simulation checks remain useful when they protect mechanics cheaply; they are not a template for adding gameplay bots or browser journeys.

Playwright uses two workers with sequential tests within each file, one local Vite server per invocation (reusing a running server when available), fresh page/context fixtures and Chromium only. Keep retries, routine screenshots, video and tracing off; enable diagnostics only for a concrete failure. The on-demand `pnpm screenshot` command maintains collection previews independently of tests. Timing comparisons belong in the task response, never in committed benchmark artifacts.

## Documentation ownership

Link to the owner of shared guidance instead of restating it in each game:

| Subject | Owner |
| --- | --- |
| Shared controls, navigation and player-facing session behavior | [Catalog introduction](../CATALOG.md) |
| Browser lifetimes, input capture and pause/focus behavior | [Lifetimes and execution](#lifetimes-and-execution) |
| Menu composition and interaction | [Menus](#menus) |
| Audio activation, admission and resource ownership | [Sound](#sound) |
| Theme meaning, progression, retained-run replacement and recovery | [Appearance changes](#appearance-changes) |
| Artwork production, anchors, layouts and source retention | [Arcade guide](arcade.md#specify-artwork-before-integrating-it) |
| Mode-specific implementation practices | [Prototype](prototype.md), [Arcade](arcade.md), [Deluxe](deluxe.md) guides |
| Verification commands and browser scope | [Local verification](#local-verification) |

Game guides own mechanics, progression, camera policy, sound identity, local source maps and distinctive verification cases. Artwork guides own asset specifications, provenance, sources and editing commands. Give each art family's detailed brief one home in its game or artwork guide and link to it from summaries. Describe shipped implementations accurately and keep them aligned with the shared mode contract. Keep only game-specific exceptions to shared behavior in local prose.

## Boundaries for future games

Share mechanisms with a concrete common responsibility: session contracts, bounded timing, browser measurement, captured buttons, focus/lifetime binding, audio ownership, cancellable image preparation and pure collision primitives. Game input adapters translate these mechanisms into local actions. Relative gestures stay in CSS pixels; camera policies and world transforms remain presentation concerns.

Keep gameplay state machines, retry/checkpoint policies, collision eligibility, authored content, UI intents and cosmetic animation local. Image-atlas roles, expected dimensions, frame validation and renderer contracts that depend on a game's state also stay with that game. The browser image helper owns loading, cancellation, retry and source release, with `validateImageDimensions` sharing exact size comparison. Each game supplies its expected sizes and any role-specific validation. Procedural artwork does not need an image bundle.

Each `app.ts` explicitly connects its run, clock, input, UI, presentation and sound. Extract repeated policies when doing so clarifies ownership; different transition rules stay local rather than moving into a universal run/entity framework, scene manager, camera or menu state machine.

## Adapting an existing game

Start with the owning game guide, then its typed content, simulation and artwork contracts. Reuse a game foundation when the requested actions and rules fit it; change local mechanics when the adaptation needs different behavior. A new classic game can reuse browser, input, menu, timing, audio and image owners without inheriting another genre's state machine.

Add levels or rounds as typed content, with stable identities and explicit placements, geometry, objectives and progression. Keep reusable environment/style keys separate from level IDs and sequence indices: another level can reuse a district or scenery family without copying a renderer branch. Check transitions, retries and completion with the added content, rather than encoding the current level count in presentation.

For an artwork replacement, edit the game's role mappings, source rectangles, anchors, draw footprints and clips. Preserve physical geometry and semantic action timing; do not resize collision bodies to match transparent padding. Keep these visual definitions local and typed. A new sheet layout should change the owning art definition and validator, not spread atlas arithmetic throughout gameplay or rendering code. Follow the [artwork workflow](arcade.md#specify-artwork-before-integrating-it) and the relevant mode guide.

## Appearance changes

An appearance changes how an existing run is presented. It does not select a new level, reset a clock, change collision geometry or alter combat. Games with both Arcade and Deluxe expose the same directly visible Theme field on their title and pause menus. Resume is an explicit action. A selection belongs to the mounted session and can survive restarts without becoming persisted data.

### Development progression

Build in focused stages: **Prototype → Arcade → Deluxe**.

1. [Prototype](prototype.md) is temporary: establish playable mechanics, controls, feedback, progression and fun with simple graphics. Avoid premature artwork investment.
2. [Arcade](arcade.md) completes the game with cohesive original or suitably licensed artwork, sprites, backgrounds, animation and effects. Once verified, **delete Prototype**, including dedicated renderers, artwork, fallbacks and tests.
3. [Deluxe](deluxe.md) optionally enhances Arcade with more sophisticated artwork and visual treatments. Reuse the primary game-owned Canvas pipeline, camera, semantic animation and preparation wherever practical. Specialized scenery and effects are appropriate when they contribute to the result.

These are development stages, not three permanent alternatives. Preserve existing gameplay and artwork when migrating a finished game; new artistic work belongs in its own pass.

### Mode contract

`prototype`, `arcade` and `deluxe` are the presentation identities. All use Canvas 2D. Each game declares its implementations explicitly; `availableThemes` and `defaultTheme` apply these rules equally in development and production:

| Implementations | Available choices | Fresh-launch default |
| --- | --- | --- |
| Prototype only | Prototype, selector hidden | Prototype |
| Arcade only | Arcade, selector hidden | Arcade |
| Arcade + Deluxe | Arcade, Deluxe | Arcade |

Prototype never coexists as an available presentation with Arcade. Deluxe requires Arcade. Missing presentations have no controls or placeholders. Stale IDs are ignored, without aliases for retired identities. Fresh launches derive the default from definitions, never storage or a previous session. Valid selection survives switching and restarts within the mounted session. Artistic names can accompany the standard labels; do not add palette selectors.

Arcade is the finished game, with complete custom actor and interactive-object sprites and cohesive scenery, animation and effects. Choose a suitable art direction rather than requiring a particular era or pixel treatment. Deluxe builds on its identities and visual roles with improved complete artwork; a background/filter pass around unchanged low-resolution actors is insufficient. Keep physical geometry, mechanics, progression and timing independent of both presentations.

Use the [Prototype](prototype.md), [Arcade](arcade.md) and [Deluxe](deluxe.md) guides for practical work. Briefs and asset contracts stay with the owning game.

### Presentation timing and motion

Presentation observes simulation state and semantic events without advancing rules. World animation and effects use active run time; pause freezes them. Title animation may use separate cosmetic time, and outcome flourishes may finish after simulation stops. Reduced motion suppresses decorative drift, flashes, shake and particle motion while preserving physical movement, warnings and state cues. Keep each game's concrete animation choices and reduced-motion treatment in its guide.

### Extending a mode

Author complete actor silhouettes and action cels as custom image assets. Keep artwork roles, frame rectangles, anchors and clip mappings explicit so a game can receive a new cast or visual identity by replacing its assets. Share semantic action observations between presentations; a common skeleton or part rig is not a requirement. Offline 3D artwork can become pre-rendered sprites or background plates. Layer images and Canvas effects to convey depth while keeping runtime rendering simple.

Start with the owning game's presentation contract and visual data. Add palette, costume, scenery or asset-role definitions there, keyed by explicit environment/style identities when levels share a visual treatment. Keep artwork dimensions, anchors, draw footprints and clip mappings separate from physical bodies. Typed local data is sufficient for a synchronous procedural change; do not introduce an asset loader or renderer registry for it. Existing renderers may accept new theme data without resetting their camera or effects.

Use descriptive filenames and document the image roles, dimensions and animation layout. Define the roles and frame validation in the game. Reuse `engine/browser/images.ts` to prepare the URL bundle, cancel loading and release image sources; pass the local validator rather than teaching that helper about actors, aircraft or animations. Asset dimensions are validated before a candidate becomes active. Import committed images directly from the owning game; modes must not depend on ignored artwork or machine-specific manifests.

Before promoting code, identify the responsibility being shared, the actual consumers or concrete new requirement, and what game knowledge its contract would retain. Image ownership, request cancellation, native menu fields and resource cleanup meet that test. Standard mode semantics belong in collection UI rather than the engine. A universal renderer would still need each game’s state, camera, event and animation contracts, so those remain local. Sprite roles, hit flashes, cameras and per-game renderer transitions do not become shared merely because they look similar. Prefer extending an existing useful owner over creating another wrapper.

### Replacement and recovery

When a change needs asynchronous resources or a new presentation owner, the game session uses `createPreparationScope` from `engine/browser/preparation.ts`. `begin()` aborts the previous request; check `current()` after each await, and `dispose()` invalidates all later completions. The scope owns request validity only: each game still owns candidate resources, validation, commit and recovery. For a reversible in-place replacement, `trialReplacement` draws once and invokes rollback on failure or commit on success; it does not own images or renderer interfaces. Keep the active presentation usable during preparation, draw the candidate against the current run before committing it, then dispose the replaced owner. Failure keeps the working presentation and updates the option/status; superseded or disposed requests cannot attach anything. Starting or resuming cancels pending preparation and restores the selector/status to the active mode. Renderer interfaces and animation semantics stay local unless a concrete shared contract can simplify their owners.

Release failed construction resources, cancelled candidates and late completions, including images, cached canvases, buffers and listeners. A failed Deluxe preparation retains the working Arcade and current run. An active Deluxe draw failure pauses the retained run, releases the failed presentation and prepares Arcade with fresh Canvas state. Readiness gates Resume until recovery succeeds, and only explicit Resume continues. If Arcade itself fails, offer Retry artwork or navigation; never fall back to retired Prototype. Retry prepares and trial-draws Arcade against the same run. Prototype-only games use the same actionable loading-error policy for any required resources. A failed recovery stays gated rather than repeatedly throwing from the frame loop.

Use the existing representative browser check to verify that presentation replacement preserves a paused run and Resume advances it. Pure preparation, readiness, rollback and image-lifetime checks protect cancellation, failure and late completion. Follow the [testing policy](../AGENTS.md#testing-policy) before adding coverage: only a distinct integration risk justifies another browser scenario. Inspect appearance and motion on demand without building a per-game failure or screenshot matrix.
