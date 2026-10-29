# Menus and interaction UI

Treat the menu as part of playing: it helps the player enter, decide and return to action. Start with the concrete moment causing friction, then inspect the current UI before adding structure. Preserve simplicity that already works.

## What does the player need now?

Give the next action a clear place and name. In the catalog, identity, genre and a short action cue help players choose; keep opening a game one click away. During a pause, prioritize Resume. After failure, distinguish retrying a checkpoint from restarting a full run. Explain lost progress near an action when the distinction matters, rather than adding a routine confirmation dialog.

Keep setup options before play and current-run information beside decisions. Disclose controls and secondary details on demand, but keep required choices, warnings and primary actions visible. A scrollable details area with reachable actions is often enough for compact screens; avoid stacking nested panels and tabs.

## Can the player compare choices and predict the result?

Lead each choice with its purpose, then its consequence. For Clearing upgrades, distinguish a new weapon, a rank increase, recovery and an evolution ingredient before presenting exact stat changes. Show relevant current equipment or prerequisites beside the choices. Use the simulation's existing summaries and content values so UI does not invent a second balance model. Do not imply an evolution is ready when prerequisites are missing.

An icon can make categories easier to scan when it has a stable meaning and a text label. Artwork earns its space when it explains a fighter, weapon or visual mode. Prefer committed assets or small local vectors; avoid decorative rarity tiers, invented currencies and generic RPG chrome.

## What is selected, available or confirmed?

Keep hover, keyboard focus, selection and confirmation distinguishable. Focus means a choice can be activated; it does not mean it has been applied. Use native controls and existing keyboard behavior where possible. Show a selected label/check as well as color, retain focus through updates, and give disabled choices a readable explanation.

For themes, retain the common Normal / Assets / Quality names, with Custom only when supplied. Pair a mode with its game-owned presentation name when that clarifies identity. Keep missing modes visible and disabled, and explain availability outside a closed dropdown when useful. State that switching changes visuals and retains the run. Pending preparation and failure feedback belong to the existing session/status owners; a chosen option must not imply loading has finished.

When a choice applies immediately, give brief acknowledgement in the existing interaction. For release-to-continue decisions, retain the chosen card and mark it while held, then return promptly to action. Avoid an extra confirmation step just to display feedback.

## Would a preview help enough to justify its cost?

A catalog cover can distinguish games without loading their runtime. A theme name or concise visual description may answer the question before a thumbnail does. Use an accurate lightweight preview when appearance is central to the choice; do not eagerly prepare renderers or load all art packs to decorate a menu. Avoid presenting concept art as a gameplay screenshot.

## What should be shared, and what should feel local?

Keep collection navigation, theme labels, utility buttons, focus treatment and action hierarchy consistent through `src/common/ui`. Let game-owned UI express its own decisions, vocabulary, colors and imagery. An upgrade card is not automatically a reusable engine widget. Promote a common responsibility only when it simplifies actual composition.

Let theme accents support hierarchy without sacrificing text contrast. Keep DOM work tied to changed state, avoid per-frame reconstruction, and respect reduced motion. Check the relevant flow with keyboard and pointer at a compact viewport: entry, selection, acknowledgement, resume/retry and return. Verify that controls fit and focus survives without expanding the browser suite into a screen matrix. A small bug should stay a small fix.
