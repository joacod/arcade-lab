# Menus and interaction UI

Treat the menu as part of playing: it helps the player enter, decide and return to action. Start with the concrete moment causing friction, then inspect the current UI before adding structure. Preserve simplicity that already works. The [research notes](research-sources.md#menus-and-settings) credit the sources and distinguish game-specific guidance from general control-design heuristics.

## What does the player need now?

Give the next action a clear place and name. In the catalog, identity, genre and a short action cue help players choose; keep opening a game one click away. On the title screen, offer a useful default and a direct Play action. Do not require a tour through settings or a decorative extra title screen before play. During a pause, prioritize Resume. A result or stage transition needs its outcome, useful run context and a clear next action, without repeating the title screen's setup or general settings.

After failure, distinguish retrying a checkpoint from restarting a full run. Name destinations when several continuations are plausible. Explain discarded progress near the relevant action when that consequence is not obvious. Reserve confirmation for genuinely costly mistakes; routine resume, theme changes and retries should not need an extra approval.

Choose visibility by task importance and frequency, not by whether a control can be called a setting. A frequently compared visual choice can deserve permanent space beside Play or Resume. Do not make a two-option choice require opening Settings and then a second picker. Secondary detail should not hide the interaction the player came to use.

Keep setup options before play and current-run information beside decisions. Primary actions stay reachable while constrained details scroll. Prefer one readable panel over nested menus, and assess real labels and setup content before adding columns or navigation levels.

## Which control fits the choice?

For a small mutually exclusive set that fits comfortably, show labeled radio choices or a segmented radio group. This lets the player see both alternatives and choose either directly. A binary on/off switch fits a property such as sound; it does not communicate two named artistic presentations as well as named alternatives do. Dropdowns earn their space when a longer or genuinely secondary list would otherwise overwhelm the screen. The choice count is a heuristic, not a universal numeric cutoff.

Give each option a stable name and make its purpose easy to compare. A short game-owned presentation name can add identity below a shared theme label. Avoid adding thumbnails, verbose explanations, rarity decorations or another confirmation step unless they help the actual decision.

Prefer native controls and their keyboard behavior. For a radio group, Tab enters/exits the group and arrows move between choices; do not repurpose Tab as a theme hotkey. Style the complete label as the target, with a visible focus outline and selected marker in addition to color. A focus outline means the next input goes there; a checked marker means selected. These states must remain distinguishable.

## What is selected, loading or confirmed?

An immediate setting change should acknowledge the action in place. For asynchronous artwork, distinguish the current working theme from a requested replacement. Keep the working scene visible, mark the requested option as loading and announce progress through the existing status owner. Commit the selected marker only when the candidate is ready. Failure clears the pending state and leaves the working choice and run intact; a late result must not overwrite a newer request. Keep option positions and focus stable while labels/status change.

Use the [mode contract](../../../../docs/architecture.md#mode-contract): show Arcade / Deluxe directly when both exist; hide the selector for a single presentation. Prototype is temporary and never coexists with Arcade. Omit missing choices and environment-specific controls. Keep artistic names, pending versus active selection, retained-run switching, retry and navigation clear.

For release-to-continue gameplay decisions, retain the chosen card and mark it while held, then return promptly to action. Avoid an extra confirmation step merely to display feedback.

## In-game navigation, focus and HUDs

Separate utility navigation from gameplay-critical information. Keep Pause easy to find. Put frequently used sound, fullscreen and presentation controls in predictable places on title/pause screens, with a visible way back to play. Screen names, action meanings and navigation order should agree throughout the collection. Browser fullscreen belongs to the persistent arcade shell so returning to the catalog does not unexpectedly exit it.

Use the shared [menu contract](../../../../docs/architecture.md#menus): Settings holds keyboard preferences and instructions, and Back returns to the originating menu without resetting the game. Keep game-specific new-run choices on the title screen. Reuse the shared [action-based bindings and layout replacement](../../../../docs/architecture.md#lifetimes-and-execution) and the keyboard-choice UI described in the menu contract.

Move focus into the visible menu when play is deliberately paused, and back to the playfield on deliberate resume. Do not let hidden HUD controls or a closed disclosure receive menu focus. A scrolling region must reveal the focused control, and pinned action bars must not cover its outline. If a loading or retry control disappears, leave focus on an appropriate visible control. Preserve focus when a choice updates; loading artwork should not start play or move the player to another screen automatically. Browser blur must never steal focus back from another page or window.

Respect browser keyboard ownership: P pauses/resumes, repeated keydowns do not toggle repeatedly, and editable fields retain their own input. Menu shortcuts supplement visible controls rather than replace them. Avoid gameplay collisions: S is movement/aim/crouch during play, so its sound shortcut belongs to title/pause menus. Escape can be consumed by browser fullscreen; display transitions must leave a coherent session even when no key event arrives. Do not add controller support or replace native keyboard navigation unless the task calls for it.

Prioritize the HUD by the decisions and genre: survival needs protection and equipment, combat needs health and readiness, exploration needs route and location. Group related resources and make critical state recognizable through shape, text and contrast as well as color. Show temporary prompts and encounter feedback when relevant. Detailed upgrades and results belong beside their menu decisions; avoid permanent counters or repeated instructions that do not help the next decision.

## Can the player predict a gameplay choice?

Lead each choice with its purpose, then its consequence. For upgrades, distinguish a new ability, a rank increase, recovery and a prerequisite before presenting exact stat changes. Show relevant current equipment or prerequisites beside the choices. Use the simulation's summaries and content values so UI does not invent a second balance model. Do not imply an evolution is ready when prerequisites are missing.

An icon helps when it has a stable meaning and a text label. Artwork earns its space when it explains a fighter, weapon or visual mode. Prefer committed assets or small local vectors; avoid invented currencies and generic RPG chrome unrelated to the game.

## What should be shared, and what should feel local?

Keep collection navigation, theme labels, utility buttons, focus treatment and action hierarchy consistent through `src/common/ui`. Let game-owned UI express its decisions, vocabulary, colors and imagery. An upgrade card is not automatically a reusable engine widget. Promote a common responsibility only when it simplifies actual composition.

Use the game's real scene and accent to connect menus to the world while keeping text on a readable surface. Decorative motion, HUD messages or bright effects must not compete with decisions or move interactive targets. Respect reduced motion. Menu space follows the game viewport independently of hidden HUD wrapping or theme font metrics. Do not load another art pack or runtime solely to decorate a menu, and do not present concept art as gameplay.

Keep DOM updates tied to changed state and use the existing readiness, preparation and lifetime mechanisms. Follow the [testing policy](../../../../AGENTS.md#testing-policy): run relevant existing checks, and change browser coverage only for a specific integration regression that cheaper checks cannot protect. Shared menu and retained-run behavior use representative coverage, not a scenario per action or game. Inspect compact layouts on demand to find scrolling/focus problems without creating screenshot suites. A small label or focus fix does not require a new menu framework or a new browser test.
