---
name: game-extraction
description: Extract an Arcade Lab game and its selected presentation into an independent standalone repository, retaining only needed engine code, assets, dependencies and local adaptation guidance.
---

# Extract a standalone game

Use the [Arcade Lab skill](../arcade-lab/SKILL.md), the selected game's guide through [CATALOG.md](../../../CATALOG.md), and the relevant [architecture](../../../docs/architecture.md) owners. Confirm the requested game, presentation and destination from the task. Inspect both working trees and destination instructions before changing files. Preserve unrelated destination work and licensing. Extraction copies the playable game; deleting it from Arcade Lab is a separate request.

## Trace the dependency boundary

Start at the game's session composition and follow static imports, dynamic imports, CSS imports, `new URL` assets and package imports. Include browser owners, UI helpers, pure primitives, required artwork and licenses. Import reachability is a starting inventory, not proof that every branch belongs in the standalone result.

Trace selected-presentation branches explicitly. A common renderer may import default artwork eagerly and selected artwork lazily. Merely changing the default selector can still ship both bundles. Audit the built files as well as the source.

Retain exact required runtime/tool versions and a reproducible lockfile. Inspect package-manager configuration too: narrowly scoped version exceptions or native build settings can be necessary for installation. Keep useful authoring tools such as image packing dependencies in devDependencies. Do not incidentally upgrade packages during extraction.

For AudioBits, carry the session audio owner, local recipes/event policy/cooldowns, the `audiobits` dependency and the self-contained [AudioBits skill](../audiobits/SKILL.md) with its referenced resources and notices. Its optional MCP authoring server is not a runtime requirement. Preserve gesture activation, bounded voice overlap, cancellation, mute, pause and disposal.

## Simplify the destination

Mount the game directly from a small entrypoint with its own persistent fullscreen target and HMR cleanup. Remove the catalog, launcher, game-selection action, collection branding, generated collection social assets and source-repository paths. Keep the game's controls, results, settings, fullscreen and sound controls where they remain useful.

For one selected presentation, remove alternate artwork, theme registries, selectors, replacement UI and inactive rendering branches. Fold the chosen styling into the default. Keep semantic image roles, decoded dimensions, anchors, clips, palette and renderer logic game-owned so future artwork changes stay straightforward.

Removing presentation switching does not remove required-resource ownership. Preserve initial readiness, explicit retry, stale-completion guards, teardown during loading and graphics recovery. Define recovery for the single renderer: pause and preserve the run, release failed resources, then reconstruct/retry the same presentation. Do not retain a fallback to artwork that no longer ships. Trial a successful draw before unlocking Play or Resume.

Keep the useful separation:

- Simulation/content own rules, geometry, progression, tuning and semantic events, with no browser or renderer imports.
- Session composition owns transitions, timing, input, audio and browser lifetimes.
- Presentation owns Canvas buffers, visual transforms, cels, cosmetic history and effects.
- UI owns DOM display and emits intents. Audio recipes and event policy stay with the game.
- Local engine files contain the game-independent mechanisms actually required by these owners.

Flatten collection-specific folders when helpful, without collapsing these responsibilities into one file or publishing a new engine package. No compatibility layer is needed unless persisted data, a real external consumer or an explicit requirement requires it. Change Arcade Lab's engine only for a demonstrated extraction obstacle; most simplification belongs in the destination.

## Carry the authoring context

Include committed runtime images, useful original artwork, prompts, packing scripts and required license/credit notices. Generated originals need not enter the browser build. Rewrite source-relative documentation links and pack commands for their new locations.

Add destination-local guidance for gameplay and asset adaptation. Point to actual owners for rules, image URLs/dimensions, complete sprite cels, anchors, draw footprints, geometry and sound. Explain how to repack assets and preserve role readability, reduced motion and resource ownership. Future visual changes should replace the game's artwork directly without recreating a selectable-theme system. Keep detailed art contracts in one local home and route the skill there.

Document development, verification and static build output. Use a deployment base appropriate for root/subdirectory hosting, and check it in the production build. Do not deploy or add provider-specific infrastructure merely because deployment is a future objective.

## Leave an optional origin note

The MIT license requires the copyright notice and the permission notice to remain in copies of the software. Carry the destination LICENSE, and any third-party notices, for that reason. MIT does not require a link, a credits screen, or a visible mention of Arcade Lab.

Also leave a short courtesy note. The next owner can edit or delete it without affecting the build:

- In the architecture origin section, record `https://github.com/joacod/arcade-lab`, the game's source path, the extracted commit, and `https://joacod.com`. That section is where a later reader looks for source changes. Do not also link the playable collection there.
- End the README with a few lines that name the game and presentation, link the repository, and state that this copy is independent. Point at the architecture origin section instead of repeating the commit. Do not also link the playable collection there.
- End the destination adaptation skill with one paragraph: read that origin section before porting a later change, copy only behavior this game still wants, and remove the note once the games have diverged. Do not add a sync workflow. Tell that skill the title-menu credit opens the playable collection, and the repository address stays in the architecture origin section.
- On the title menu only, under the actions, add one quiet line: "Built by joacod · from Arcade Lab". Link joacod to `https://joacod.com` and Arcade Lab to `https://arcade.joacod.com/`. Hide it on pause, settings, and results. Use static links that open in a new tab.

Public credit links are not collection branding, and they are not source-repository paths. Imports, filesystem paths, the catalog, and the launcher stay removed. The game must still run with no request to Arcade Lab. No update check, submodule, wordmark, or more-games entry.

## Verify independence

Install from the destination's manifest and lockfile. No workspace links, symlinks into Arcade Lab, absolute machine paths, outside-repository assets or source-repository runtime requests may be required. Preserve relevant bounded mechanics/lifecycle tests, pruning imports and scenarios for removed features. Validate AudioBits recipes against the installed runtime.

Run TypeScript, deterministic checks and a production build. Use a small Chromium check for direct startup, required-art readiness/retry and the changed session boundary. Inspect the actual game and menus at desktop and narrow viewports, including pause/resume, input, fullscreen and sound as relevant. Check console/resource failures and the production asset inventory. Prefer targeted checks over copying the whole collection suite or adding playthrough matrices.

Validate documentation/skill links and any repacking command retained. Review both final diffs: the source should contain only the requested reusable guidance and any justified engine fixes, while the destination should be independently runnable and ready for its next development phase. Report checks actually completed and leave commits, publishing and deployment to the user's requested scope.
