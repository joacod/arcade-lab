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
    art/               Bundled artwork, collection cover and asset guides

docs/
  architecture.md      Shared ownership and maintenance guide
  games/<game-slug>/    Game guide and documentation screenshots

tests/
  unit/engine/         Shared pure infrastructure invariants
  unit/games/<slug>/   Game rules and presentation invariants
  unit/                Cross-game recipe validation
  browser/app/         Collection and session replacement
  browser/engine/      Shared browser/audio lifecycle
  browser/common/      Collection-wide UI behavior
  browser/games/<slug>/ Game-specific input, rendering and session behavior
```

The [catalog](../CATALOG.md) links to each game's guide. Source, guide and tests use the same game slug. Open `app.ts` inside a game to trace its composition; follow `content.ts` for tuning and `game.ts` for simulation rules. All modes render through Canvas 2D. Detailed scenery code and image preparation stay inside the owning game, behind its lazy imports. Appearance controllers own cancellation, replacement and graphics-failure recovery. Preparing a replacement retains the active renderer until the candidate can draw; simulation state and the host loop remain session-owned. Shared pose observations belong with the game when multiple renderers need the same animation.

Runtime artwork belongs in the owning game's `art/` folder. Collection covers are SVG assets imported by `src/app/catalog.ts`; one Quality screenshot per game lives beside its guide and is reused by the README and catalog, never imported by the application. Commit all artwork required by enabled modes. Keep useful prompts, templates, dimensions and role mappings with the game. Development and production import the same committed bundles. Generated builds and browser reports stay ignored.

`src/engine/` and `src/common/` have no imports from the application or games. Games depend on the engine's session contract rather than importing the application implementation. The application owns collection metadata and lazy game loaders in one catalog; adding a game does not require a second loader switch or card template.

Engine code supplies game-independent execution and resource mechanisms. `engine/browser/` marks browser dependencies, not a place for every file using a browser API. Collection-specific presentation conventions belong in `common/ui/`: menus, their layout, fields and DOM updates. A game's browser session, renderer, theme definitions and asset-role mapping remain under that game. `common/` is not a holding area for helpers without a clear owner.

## Shared source map

| Responsibility | Owner |
| --- | --- |
| Collection metadata, covers and lazy game imports | `src/app/catalog.ts` |
| Entrypoint and selection screen | `src/app/main.ts`, `src/app/selection.ts` |
| Synchronous mount/dispose contracts | `src/engine/session.ts` |
| Cleanup that attempts every owner and aggregates failures | `src/engine/disposal.ts` |
| Active session and mount point | `src/app/application.ts` |
| Viewport and mount-point sizing | `src/app/application.css` |
| Measurement, fullscreen, frame loop and lifetime signal | `src/engine/browser/host.ts` |
| Page visibility, blur, page-exit and deferred focus binding | `src/engine/browser/session.ts` |
| Keyboard/button holds, press edges and independent touch capture | `src/engine/browser/buttons.ts` |
| Configured game menus, actions, focus and common utilities | `src/common/ui/menu.ts`, `menu.css` |
| Web select fields, choice styling and multiline result readouts | `src/common/ui/menu-components.ts`, `menu-components.css` |
| Stable element lookup and change-only DOM updates | `src/common/ui/dom.ts` |
| Bounded fixed-step timing | `src/engine/clock.ts` |
| Pure swept-circle intersection and strict rectangle overlap | `src/engine/collision.ts` |
| Pure cue deadlines and clock-reset handling | `src/engine/cooldowns.ts` |
| AudioBits session lifecycle and bounded playback | `src/engine/browser/audio.ts` |
| Cancellable image preparation, retryable initial resources, dimension comparison and source release | `src/engine/browser/images.ts` |
| Latest-request cancellation, required-resource readiness and replacement draw trials | `src/engine/browser/preparation.ts` |
| Theme labels, ordering and availability | `src/common/ui/theme-select.ts` |

## Lifetimes and execution

`GameEntry.mount(container): GameSession` returns synchronously. The application disposes the previous session before creating a fresh mount point. It removes that mount point even if construction or disposal throws; games must release resources acquired before a failed construction. Disposal is idempotent. Mounting after application disposal is rejected.

Required artwork loads inside the mounted session. `createImageResource` owns the initial request and exposes `prepare()` for retry; `createReadiness` gates simulation and gameplay actions until preparation succeeds, ignoring stale completions and callbacks after disposal. The shared menu displays progress or a retry action while theme selection and navigation remain available. A failed initial image request must not start an invisible game. This readiness gate is separate from optional theme preparation, which retains an already playable presentation.

Session teardown uses `disposeAll` to attempt each cleanup in its explicit ownership order, including the browser host, even if graphics or another resource throws. Failures are reported together in an `AggregateError`; sessions retain their own idempotence and async invalidation guards.

The entrypoint guards stale imports and disposes the application on HMR. Each game owns its DOM, scoped styles and async preparation. Pending completions must be invalidated when their session ends.

The host owns a stable focusable surface and one frame loop. Starting is idempotent; disposal during a frame prevents rescheduling. Disposal cancels scheduling, aborts listeners, disconnects observation and removes the root. Renderers own their backing buffers and graphics resources.

Hidden documents have no scheduled host frame. Becoming visible schedules exactly one frame again; the page-lifetime binding still resets simulation timing and requires deliberate gameplay resumption. Frame scheduling does not own run transitions or audio activation.

`bindPageLifetime` binds blur, hide, persisted page exit and final page exit with the host lifetime signal. Sessions supply suspension, timing reset and disposal; focus and gameplay transition rules stay local. All current game sessions use this binder. `bindSessionFocus` also shares clear-input and deferred focusout handling, ignoring callbacks after host abortion. Sessions supply their own focus predicate, so different play controls and menu rules stay local.

`bindButtons` shares physical keyboard/button capture across button-based controls. It owns keyboard aliases, independent pointer captures, rising edges, release/cancellation and abort cleanup. Each simulation step consumes one held/pressed snapshot; game-local input adapters translate it into actions. Gesture-based movement remains local to its existing owners. Sessions clear input at display and gameplay transitions and through the focus/lifetime bindings.

The clock bounds fixed-step catch-up; transitions reset timing so suspended wall time cannot advance play. Composition steps simulation and delivers its semantic events to visuals and audio. Collision math returns contact information; game rules own eligibility and consequences.

## Menus

The home screen is the game catalog. Each card provides a cover, name, gameplay description and genre; selection loads the game lazily. The shell retains the selected card and collection scroll position for the page lifetime. Loading names the requested game and offers cancellation; the import may finish, but the entrypoint's generation guard prevents a cancelled request from mounting. Returning, cancelling or retrying restores collection focus without persistent storage.

`createGameMenu` supplies a single menu with game content, a Theme selector, sound/fullscreen buttons and a collapsed Controls disclosure. Games provide their title, gameplay UI containers, authored setup/result markup, control instructions and typed action definitions with the screens on which they are available. Common actions use Play, Resume, Restart and Game selection. Checkpoint retries and stage transitions remain explicit game actions.

The component owns action visibility and focus, mute/fullscreen buttons, notices and compact layout. Its `readiness` method disables actions requiring artwork; mark navigation actions `requiresReady: false`. Sessions enforce the same readiness guard before starting or resuming simulation. Actions stay outside the scrollable content area. Changing screens closes Controls and returns the scroll position to the top. Gameplay instruments and touch controls are hidden behind menus while retaining their layout space. The menu layer is anchored to the game root, independently of the stage and theme-dependent HUD/footer heights. Constrained content can scroll without moving the action bar. Upgrade choices temporarily hide settings so selection stays focused on gameplay.

Local pauses move focus from gameplay into the first available menu action. Window blur and focus outside the game never pull focus back. The menu body is keyboard-focusable for reading and scrolling. Games can provide `--menu-accent` on their root to carry their palette into the shared menu. Routine HUD outputs are not live announcements; explicit status regions retain their authored behavior.

Games own configuration values, result updates, upgrade choices and action callbacks. The component routes P to the visible Pause or enabled Resume action, F to fullscreen when available, and Escape to Pause when delivered. Buttons display their shortcut hints. Repeated keydowns and editable controls are ignored. Escape is not prevented in fullscreen; the browser host handles display transitions even when no key event arrives. The component never starts, pauses or resets simulation itself. Listeners use the host abort signal. Add game-specific fields only when they control actual game behavior or presentation; shared menus contain no game content.

Cache stable session DOM through `createElementLookup`, and use the change-only text, attribute and property writers for frame-driven readouts. Keep rebuilt choice lists outside the lookup cache. Round CSS percentages to display precision so browser serialization does not trigger repeated equivalent writes. Formatting, update timing and the meaning of each readout stay with the game.

Compose the `game` content and required `theme` field as DOM elements. Elements are inserted directly, preserving references and listeners; game-specific containers can still use authored HTML internally. `createThemeSelect` supplies the standard web-rendered selector from the game's available mode definitions, with optional game-owned `names` for presentation identity. Unavailable modes remain disabled and are summarized below the field alongside the retained-run explanation. These labels do not load artwork or renderer code. `createSelectField` owns a labeled combobox and a styled listbox in the browser top layer, so options escape scrolling and remain usable in fullscreen. Arrows, Home/End and typing preview enabled options; Enter/Space or a pointer confirms; Escape, Tab, blur and outside clicks dismiss without applying a preview. Menu transitions, scrolling, resizing and session disposal close open lists. Each field accepts typed choices, disabled values and an `onChange` callback, and returns its `element`, focusable `input` and silent `setValue` synchronization method. Short gameplay setup choices can use native radio cards with shared menu choice styling and game-owned labels and consequences.

`createMenuReadout` returns an `element` and `update(text)` for multiline scores or results. It starts hidden; the game controls visibility and formats its own summary. Unchanged text is not rewritten, and frame-driven updates do not announce as live status messages. Use the menu's notices for sound/display status. Keep HUD arrangements, health/XP displays, touch layouts and game-specific choice interactions local; menu actions and utility buttons already share their presentation and behavior through `createGameMenu`.

## Sound

All game sound uses the installed AudioBits public runtime and JSON-only recipes. Follow the [local skill](../.agents/skills/audiobits/SKILL.md) and installed package contracts when adding sound. There is no custom synthesis runtime, audio asset dependency, singleton or audio event bus.

`src/engine/browser/audio.ts` owns a lazy AudioBits engine per game session. Mounting and importing stay silent and create no native context. Start/Retry/Resume call activation synchronously in their existing gesture handlers; playback waits for successful activation. The owner reports failures through the game's existing status UI, allows another gesture to retry, and drops events while unavailable without a backlog. Its generation guard prevents cancelled activation from making old work audible.

The owner handles mute, normalized volume, overlap admission (including retiring/releasing voices), cancellation, suspension and disposal. AudioBits supplies graph construction, envelopes, seeded variation, filters, delay, per-sound limits and graph cleanup. Cancellation disposes the owned Sound instances immediately, including effect tails on a suspended clock; recipes are rebound lazily. Ordinary pauses retain the engine. A gesture racing an unfinished suspension or following a terminal context replaces it, disposing the old engine first. Muting or zero volume cancels and suspends; a fresh eligible gesture can restore sound. Disposal invalidates pending starts, disconnects all graphs and closes the native context.

Browser composition owns hide, blur, focus, display and page-lifetime decisions alongside gameplay suspension. Returning from a hidden page never resumes audio automatically. Restart cancels the old run before gesture activation; game selection and HMR dispose the departing session. Simulation emits only semantic notifications and never imports AudioBits or reads the audio clock.

Each game's sound adapter owns recipes, event mapping, batch coalescing, priority, cooldown intervals and expressive playback values. `engine/cooldowns.ts` shares deadline bookkeeping and resets deadlines when a replacement audio clock moves backward. Record a cooldown only after playback is admitted; clear it when resetting the adapter. Important milestones replace combat tails; routine bursts are throttled and excess voices discarded. Audio time is used only for presentation throttling. A new game supplies recipes and an adapter, reuses this owner, and wires the same session lifecycle without introducing another lifecycle implementation.

## Local development

See the [README](../README.md#play-locally) to start the development server. `pnpm build` creates a production build in `dist/`; `pnpm preview` serves it locally.

## Local verification

Run `pnpm check` for types, invariants and the build. Run `pnpm check:browser` for input or lifecycle changes; install Chromium with `pnpm exec playwright install chromium` if needed. Renderer-specific checks belong with the owning game's documentation.

## Documentation ownership

Link to the owner of shared guidance instead of restating it in each game:

| Subject | Owner |
| --- | --- |
| Shared controls, navigation and player-facing session behavior | [Catalog introduction](../CATALOG.md) |
| Browser lifetimes, input capture and pause/focus behavior | [Lifetimes and execution](#lifetimes-and-execution) |
| Menu composition and interaction | [Menus](#menus) |
| Audio activation, admission and resource ownership | [Sound](#sound) |
| Theme meaning, progression, retained-run replacement and recovery | [Appearance changes](#appearance-changes) |
| Artwork production, anchors, layouts and source retention | [Assets guide](assets-themes.md#specify-artwork-before-integrating-it) |
| Mode-specific implementation practices | [Normal](normal-themes.md), [Assets](assets-themes.md), [Quality](quality-themes.md) guides |
| Verification commands and browser scope | [Local verification](#local-verification) |

Game guides own mechanics, progression, camera policy, sound identity, local source maps and distinctive verification cases. Artwork guides own asset specifications, provenance, sources and editing commands. Give each art family's detailed brief one home in its game or artwork guide and link to it from summaries. Describe shipped implementations accurately and keep them aligned with the shared mode contract. Keep only game-specific exceptions to shared behavior in local prose.

## Boundaries for future games

Share mechanisms with a concrete common responsibility: session contracts, bounded timing, browser measurement, captured buttons, focus/lifetime binding, audio ownership, cancellable image preparation and pure collision primitives. Game input adapters translate these mechanisms into local actions. Relative gestures stay in CSS pixels; camera policies and world transforms remain presentation concerns.

Keep gameplay state machines, retry/checkpoint policies, collision eligibility, authored content, UI intents and cosmetic animation local. Image-atlas roles, expected dimensions, frame validation and renderer contracts that depend on a game's state also stay with that game. The browser image helper owns loading, cancellation, retry and source release, with `validateImageDimensions` sharing exact size comparison. Each game supplies its expected sizes and any role-specific validation. Procedural artwork does not need an image bundle.

Each `app.ts` explicitly connects its run, clock, input, UI, presentation and sound. Extract repeated policies when doing so clarifies ownership; different transition rules stay local rather than moving into a universal run/entity framework, scene manager, camera or menu state machine.

## Adapting an existing game

Start with the owning game guide, then its typed content, simulation and artwork contracts. Reuse a game foundation when the requested actions and rules fit it; change local mechanics when the adaptation needs different behavior. A new classic game can reuse browser, input, menu, timing, audio and image owners without inheriting another genre's state machine.

Add levels or rounds as typed content, with stable identities and explicit placements, geometry, objectives and progression. Keep reusable environment/style keys separate from level IDs and sequence indices: another level can reuse a district or scenery family without copying a renderer branch. Check transitions, retries and completion with the added content, rather than encoding the current level count in presentation.

For an artwork replacement, edit the game's role mappings, source rectangles, anchors, draw footprints and clips. Preserve physical geometry and semantic action timing; do not resize collision bodies to match transparent padding. Keep these visual definitions local and typed. A new sheet layout should change the owning art definition and validator, not spread atlas arithmetic throughout gameplay or rendering code. Follow the [artwork workflow](assets-themes.md#specify-artwork-before-integrating-it) and the relevant mode guide.

## Appearance changes

An appearance changes how an existing run is presented. It does not select a new level, reset a clock, change collision geometry or alter combat. Every game exposes the same Theme selector on its title and paused/result menus. Resume is an explicit action. A selection belongs to the mounted session and can survive restarts without becoming persisted data.

### Development progression

For new games and game types, prefer **Normal → Assets → Quality**, giving each stage a separate focused pass:

1. Establish complete mechanics, progression and readable feedback in [Normal](normal-themes.md), with a modest custom sprite set.
2. Give the established game a cohesive retro or pixel-inspired artistic pass in [Assets](assets-themes.md).
3. Upgrade that direction with substantially improved modern artwork and animation in [Quality](quality-themes.md), preserving the cast, setting and visual roles.

Avoid combining all three presentations into one enormous initial task. This is a recommended development process, not a runtime dependency: every implemented mode presents the same simulation and gameplay rules, independently of whether other modes exist. Explicit creative requirements may justify a different order. Missing modes stay visible and unavailable until a dedicated pass implements them.

### Mode contract

The menu always shows **Normal**, **Assets**, then **Quality**. A missing definition produces a disabled “(not available)” entry. Availability describes an implemented presentation in the current build, not a promise that an image request or drawing operation will succeed. Runtime failures retain the working mode and report a notice. Normal, Assets and Quality are the only supported modes, all using Canvas 2D. Do not expose palette variants as extra modes.

- **Normal:** the default gameplay-first baseline. Establish a complete, playable game with sound mechanics, clear controls and readable feedback. Simple, appealing visuals and a modest custom image set are sufficient; image assets belong in the baseline too, without requiring a dedicated artistic or visual-polish pass. Use a lightweight Canvas 2D presentation.
- **Assets:** a focused artistic pass with a cohesive retro or pixel-inspired look suited to the game by default. Cover the important actors, interactive objects and environment with custom sprites and generated, authored or suitably licensed/adapted artwork. Effects and UI may remain procedural when they fit the direction. Validate frames and keep source dimensions separate from physical geometry. Commit the full bundle so the same mode works from a fresh clone in development and production.
- **Quality:** a polished modern improvement of the established Assets presentation, unless a different adaptation is explicitly requested. Use its character identities, setting and visual roles as design references, then create new or substantially improved artwork and animation with a coherent modern finish. Redrawing the same cast in a richer style is part of the pass. Unchanged low-resolution actors surrounded by a new background, filters or effects are insufficient. Modern is visual finish, not a time period or demand for realism. Custom image assets remain the representation for players, enemies and interactive objects; author complete sprites and action cels, retaining existing files only where they already meet the artistic target. Painted or pre-rendered artwork can add volume and material richness. Canvas 2D renders the whole mode, including layered environments, transforms, compositing, lighting treatments and bounded particles.

A mode includes its palette, actor treatment, environment, effects and matching interface styling. Carry the game's setting and identity through the standard passes unless the user explicitly asks for a particular adaptation. Camera policy remains game-owned and consistent across modes. Do not add separate skin or accent selectors. Gameplay setup, such as choosing a fighter or round, stays in game content. Missing modes remain placeholders until a dedicated game-specific task implements them.

Use the [Normal](normal-themes.md), [Assets](assets-themes.md) and [Quality](quality-themes.md) guides for practical guidance within these contracts. Keep the resulting briefs, artwork prompts and templates with the game.

### Presentation timing and motion

Presentation observes simulation state and semantic events without advancing rules. World animation and effects use active run time; pause freezes them. Title animation may use separate cosmetic time, and outcome flourishes may finish after simulation stops. Reduced motion suppresses decorative drift, flashes, shake and particle motion while preserving physical movement, warnings and state cues. Keep each game's concrete animation choices and reduced-motion treatment in its guide.

### Extending a mode

Author complete actor silhouettes and action cels as custom image assets. Keep artwork roles, frame rectangles, anchors and clip mappings explicit so a game can receive a new cast or visual identity by replacing its assets. Share semantic action observations between presentations; a common skeleton or part rig is not a requirement. Offline 3D artwork can become pre-rendered sprites or background plates. Layer images and Canvas effects to convey depth while keeping runtime rendering simple.

Start with the owning game's presentation contract and visual data. Add palette, costume, scenery or asset-role definitions there, keyed by explicit environment/style identities when levels share a visual treatment. Keep artwork dimensions, anchors, draw footprints and clip mappings separate from physical bodies. Typed local data is sufficient for a synchronous procedural change; do not introduce an asset loader or renderer registry for it. Existing renderers may accept new theme data without resetting their camera or effects.

Use descriptive filenames and document the image roles, dimensions and animation layout. Define the roles and frame validation in the game. Reuse `engine/browser/images.ts` to prepare the URL bundle, cancel loading and release image sources; pass the local validator rather than teaching that helper about actors, aircraft or animations. Asset dimensions are validated before a candidate becomes active. Import committed images directly from the owning game; modes must not depend on ignored artwork or machine-specific manifests.

Before promoting code, identify the responsibility being shared, the actual consumers or concrete new requirement, and what game knowledge its contract would retain. Image ownership, request cancellation, native menu fields and resource cleanup meet that test. Standard mode semantics belong in collection UI rather than the engine. A universal renderer would still need each game’s state, camera, event and animation contracts, so those remain local. Sprite roles, hit flashes, cameras and per-game renderer transitions do not become shared merely because they look similar. Prefer extending an existing useful owner over creating another wrapper.

### Replacement and recovery

When a change needs asynchronous resources or a new presentation owner, the game session uses `createPreparationScope` from `engine/browser/preparation.ts`. `begin()` aborts the previous request; check `current()` after each await, and `dispose()` invalidates all later completions. The scope owns request validity only: each game still owns candidate resources, validation, commit and recovery. For a reversible in-place replacement, `trialReplacement` draws once and invokes rollback on failure or commit on success; it does not own images or renderer interfaces. Keep the active presentation usable during preparation, draw the candidate against the current run before committing it, then dispose the replaced owner. Failure keeps the working presentation and updates the option/status; superseded or disposed requests cannot attach anything. Starting or resuming cancels pending preparation and restores the selector/status to the active mode. Renderer interfaces and animation semantics stay local unless a concrete shared contract can simplify their owners.

Release failed construction resources, cancelled candidates and late completions, including image sources, cached canvases, buffers and listeners. An active Assets or Quality draw failure pauses the retained run, releases the failed mode, restores Normal and reports recovery through existing status UI; only explicit Resume continues. A failed candidate leaves the previous presentation active. Reflect a restored mode in the selector. Canvas recovery resets saved transforms and clips before drawing the retained presentation. If required fallback images must load again, the readiness gate keeps Resume disabled until they are ready and offers retry on failure.

Verify an appearance change with an ongoing paused run: visible output changes while the same state object, position, progress and timers remain intact, then Resume advances that run. Check selection retention on restart and release on unmount through the existing session checks. Async asset changes also need cancellation, failure and late-completion coverage. Keep these checks focused rather than adding a screenshot matrix.
