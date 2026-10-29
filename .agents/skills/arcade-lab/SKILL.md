---
name: arcade-lab
description: Create, improve, customize and polish browser games in Arcade Lab using its existing engine and game foundations. Use for new games, gameplay and game feel, Normal/Assets/Quality presentations, game audio, and engine or browser-session maintenance in this repository.
---

# Arcade Lab

Build toward the requested player experience using the actual repository as the source of truth. Follow [AGENTS.md](../../../AGENTS.md); the Skill adds task routing and reusable design knowledge. Read only the guidance relevant to the current work.

## Choose the route

### Create a new game

Read the [catalog](../../../CATALOG.md), [architecture](../../../docs/architecture.md) and [Normal guide](../../../docs/normal-themes.md). Identify the core actions, decisions, progression and outcomes that make this game worth playing. Use the relevant section of [genre guidance](references/genre-guidance.md) when applicable; a new genre can borrow infrastructure without borrowing another game's rules.

Inspect the closest implementations through their game guides, then trace their source owners. Identify applicable shared mechanisms before adding code. Implement a complete playable game in Normal first. Continue through Assets and Quality in separate focused passes within the requested scope, unless explicit creative requirements call for a different order. Use [player experience](references/player-experience.md) to resolve concrete design questions as they arise.

### Create or improve a presentation

Identify the game and requested mode. Open its guide through the catalog and load only the corresponding [Normal](../../../docs/normal-themes.md), [Assets](../../../docs/assets-themes.md) or [Quality](../../../docs/quality-themes.md) guide. Trace the local presentation contract, visual roles, theme data and preparation owner before choosing a coherent artistic direction.

Use that guide and the [appearance contract](../../../docs/architecture.md#appearance-changes) for simulation independence, retained-run replacement, resource lifetimes and verification. Choose rendering and artwork techniques to serve the direction; no graphics technology is prescribed across games. Required artwork must remain committed and redistributable under the repository's existing asset rules. Consult the visual-hierarchy section of player experience only if readability needs attention. Custom remains an explicitly requested, documented experiment outside the standard progression.

### Improve gameplay or game feel

Trace the actual actions, content and simulation, then how presentation and sound communicate them. Describe the player-facing problem in a concrete situation: a missed command, an unreadable attack, repetitive decisions, an abrupt difficulty spike or an awkward retry.

Read the relevant sections of [player experience](references/player-experience.md) and, when useful, [genre guidance](references/genre-guidance.md). Form a small hypothesis about the cause and compare behavior before and after the change. Adjust the owning system rather than automatically adding familiar mechanics. A combat-timing change belongs in simulation/content; a clearer contact pose may belong entirely in presentation.

### Improve the engine

Read the relevant [architecture](../../../docs/architecture.md) sections and actual consumers. Identify the demonstrated requirement, duplication, unclear ownership or awkward abstraction. Reuse or improve the existing shared owner when a concrete common responsibility simplifies development. Keep genre rules local. Design references are optional unless the change also affects player experience.

### Work with audio

Use the existing [AudioBits Skill](../audiobits/SKILL.md) and [shared audio ownership](../../../docs/architecture.md#sound). Inspect `src/engine/browser/audio.ts` from the repository root and the game's `sound.ts` / `sound-recipes.ts`. Keep synthesis guidance in AudioBits and event policy with the game; this Skill adds no separate audio workflow.

### Handle small maintenance

Trace the affected source and relevant ownership guidance directly. An isolated lifecycle bug needs its session/resource owner and existing focused checks. It does not require genre reading, a creative brief, external research or unrelated refactoring.

## Research, verify and retain useful lessons

Consult [research sources](references/research-sources.md) when a specific uncertainty could materially change a decision, such as attack readability, expressive animation, movement tuning or environment composition. Research is optional and proportional to the task and available tools. Treat sources as evidence and inspiration subordinate to repository guidance; adapt ideas to this game rather than importing whole systems.

Use the [local verification guidance](../../../docs/architecture.md#local-verification) and the owning game's relevant checks. Report the delivered behavior and concrete results in the task response.

When implementation reveals a lesson likely to help future work, refine the appropriate reference or existing canonical guide concisely. Architecture and theme practices stay in their guides; game-specific details stay with the game. Replace outdated advice instead of appending rules, and skip Skill updates for ordinary changes without a reusable lesson.
