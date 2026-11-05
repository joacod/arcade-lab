# Optional game-development research

Provenance and further reading for [player experience](player-experience.md), [genre guidance](genre-guidance.md) and [menus](menu-ui.md). Ordinary tasks use those local explanations and the canonical repository guides without fetching articles, downloading PDFs or watching talks. Browse for missing information, a new genre, a contested technique or deeper evidence that could change a decision. External material informs judgment; it does not override the user's goals or repository contracts.

## Runtime and ownership

| Source | Relevant content and limits |
| --- | --- |
| Robert Nystrom, [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html), also [author's chapter source](https://github.com/munificent/game-programming-patterns/blob/master/book/game-loop.markdown) | Input/update/render separation, fixed-step catch-up, bounds and presentation timing. The chapter source was inspected when the rendered site failed to load. Loop alternatives explain tradeoffs; Arcade Lab's [architecture](../../../../docs/architecture.md#lifetimes-and-execution) owns the implementation. |
| MDN contributors, [Anatomy of a video game](https://developer.mozilla.org/en-US/docs/Games/Anatomy) | Browser callbacks and scheduling in a platform-owned event loop. Tutorial examples, including rescheduling order, are not lifecycle contracts to transplant into the shared host. |

## Design, learning and challenge

| Source | Relevant content and limits |
| --- | --- |
| Robin Hunicke, Marc LeBlanc and Robert Zubek, [MDA: A Formal Approach to Game Design and Game Research](https://www.cs.northwestern.edu/~hunicke/MDA.pdf) | Rules, emergent behavior and felt experience; small changes can alter incentives. “Aesthetics” includes emotional experience, not just art. A reasoning framework, not a fun formula or required document format. |
| Daniel Cook, [The Chemistry of Game Design](https://www.gamedeveloper.com/design/the-chemistry-of-game-design) | Action, simulation, feedback and revised understanding; prerequisites and missing links between learned skills. Retain the diagnostic model, not the essay's broad biological explanations or its reduction of enjoyment to learning. |
| The Level Design Book contributors, [Pacing](https://book.leveldesignbook.com/process/preproduction/pacing) | Beats, variation, critical-path learning and teach/test/twist. Practical community synthesis rather than experimental proof; a heuristic, not a fixed sequence or requirement to build set pieces. |
| Mike Booth, Valve, [The AI Systems of Left 4 Dead](https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf), especially slides 77–91 | Written slides distinguish pressure peaks, residual combat and actual relief, and threat-frequency modulation from difficulty amplitude. Useful for authored waves too; no adaptive director, emotional-state estimator or copied timings required. |

## Movement and cameras

| Source | Relevant content and limits |
| --- | --- |
| Maddy Thorson, [Celeste & Forgiveness](https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html) | Timing and positional allowances preserve likely intent within a demanding platformer. Existing interpretations of coyote time and buffering are supported; corner correction, apex shaping and other examples remain options with geometry and precision tradeoffs. |
| Itay Keren, [Scroll Back: The Theory and Practice of Cameras in Side-Scrollers](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers) | Inspected the written adaptation of his GDC talk: windows, snapping, smoothing, forward/target focus and region framing. Each serves different visibility and comfort needs; no universal follow or smoothing policy. |
| Steve Swink, [Principles of Virtual Sensation](https://www.gamedeveloper.com/design/principles-of-virtual-sensation) | Written explanations connect input mapping, response, spatial context, perception and impact. Used for game feel beyond effects. Legacy interactive demos were not run; universal aesthetic and neuroscience claims are not adopted. |

## Combat and feedback

| Source | Relevant content and limits |
| --- | --- |
| Mike Stout, [Enemy Attacks and Telegraphing](https://www.gamedeveloper.com/design/enemy-attacks-and-telegraphing) | Enemies pose understandable demands; preparation communicates an avoidance opportunity through pose, effects and sound. The written argument focuses on avoidance and separately discusses attrition; it does not establish that every attack must be reactable. |
| Riot Scruffy, Riot Games, [Quick Gameplay Thoughts: May 14 — Champion Counterplay](https://www.leagueoflegends.com/en-us/news/dev/quick-gameplay-thoughts-may-14/) | Tactical responses and earlier strategic answers, proportionate to impact. Explicitly cautions that excessive tactical counterplay can make abilities unreliable. Cross-checks Stout's warning emphasis without discarding readable threats. |
| David Sirlin, [Game Balance and Yomi](https://www.sirlin.net/articles/game-balance-and-yomi) | Written developer account of preserving asymmetry, flavor and interesting dynamics while balancing. His preference for expert matchup judgments over raw results is specific to that competitive context, not a ban on measurements or local checks. |
| David Sirlin, [Street Fighter Tutorial Videos](https://www.sirlin.net/articles/street-fighter-tutorial-videos) | Optional video demonstrations. The introduction was inspected, but embedded playback and a reliable transcript were not available in this review. No detailed technique is attributed to unseen footage; use the inspected written combat sources above for local reasoning. |
| Martin Jonasson and Petri Purho, [Juice It or Lose It](https://www.youtube.com/watch?v=Fy0aCDmgnxg), with [author's supporting repository](https://github.com/grapefrukt/juicy-breakout) | Retained for optional viewing. The video did not expose playable content or a reliable transcript; the supporting README confirms the demonstration's provenance, not its detailed sequence. Local guidance uses Swink's inspected text and repository examples rather than inferring techniques from the title or description. |

## Visual direction

| Source | Relevant content and limits |
| --- | --- |
| Jason Mitchell, Moby Francke and Dhabih Eng, Valve, [Illustrative Rendering in Team Fortress 2](https://cdn.fastly.steamstatic.com/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf), especially sections 3–4 | Distinct silhouettes, restrained texture frequency, grouped values and coherent modeling/shading choices serve recognition. The existing interpretation is supported; transfer the art/gameplay reasoning without mandating rim lighting, its palette or its shaders. |
| Brandon “mochi” Wang, Riot Games, [VALORANT Shaders and Gameplay Clarity](https://www.riotgames.com/en/news/valorant-shaders-and-gameplay-clarity) | Character separation, environmental treatment and consistent gameplay boundaries show another production approach to clarity. The competitive FPS context and particular rendering implementation remain context-specific. |

## Motivation

| Source | Relevant content and limits |
| --- | --- |
| Andrew K. Przybylski, C. Scott Rigby and Richard M. Ryan, [A Motivational Model of Video Game Engagement](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf) | Research model relating competence, autonomy and relatedness to engagement. Useful questions about felt capability and volition, not instructions to maximize choices, rewards, difficulty or session length. |
| April Tyack and Elisa D. Mekler, [Self-Determination Theory and HCI Games Research: Unfulfilled Promises and Unquestioned Paradigms](https://arxiv.org/abs/2405.12639) | Research critique of shallow theory use and unsupported translations to mechanics. Read alongside the motivational model; neither a needs checklist nor a single learning model exhausts why a particular player enjoys a game. |

## Menus and settings

| Source | Relevant content and limits |
| --- | --- |
| Microsoft Xbox Accessibility Guidelines, [112: UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112), [113: UI focus handling](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113), [114: UI context](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/114) | Inspected game examples and written guidance on predictable navigation, visible focus and explaining a control's purpose and consequences. Adapt to browser keyboard/pointer support and existing owners; this is not a request to implement every platform feature or an accessibility certification claim. |
| Game Accessibility Guidelines contributors, [Quick entry without multiple menu levels](https://gameaccessibilityguidelines.com/allow-the-game-to-be-started-without-the-need-to-navigate-through-multiple-levels-of-menus/) | Pre-game configuration can help, but a useful default and direct start reduce entry barriers. Does not imply that all setup must be hidden or removed. |
| Kevin Giguere, [Create better game settings options](https://www.gamedeveloper.com/design/create-better-game-settings-options-handy-checklist-) | Game-developer heuristics: settings available before/during play, consistent inputs, immediate visible effects, and game backdrops that do not intrude on menus. The broad PC checklist is inspiration, not a requirement for four quality tiers, save systems, gamepads or additional settings. |
| Huei-Hsin Wang, Nielsen Norman Group, [Does Your Form Really Need a Dropdown List?](https://www.nngroup.com/articles/dropdown-list/) | Visible alternatives reduce the discovery/selection cost for a short choice list. General form-control guidance, not a game-menu experiment; the numerical thresholds are heuristics. Applying it to the collection's frequent two-theme comparison is a local design decision. |
| W3C WAI, [Radio Group Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) | Mutually exclusive choice semantics and keyboard navigation: Tab crosses the group boundary, arrows navigate choices, and Space selects. Prefer native radios; the ARIA examples are not a reason to implement a custom focus system. |

The menu sources above were inspected on 2026-11-05. The guide applies their relevant principles while the canonical architecture owns concrete controls, defaults and resource behavior.

## Agent-skill comparisons

Inspected as workflow examples, not installed or imported authorities. These comparisons concern organization and reasoning, not independent evidence that a mechanic is enjoyable.

| Collection and inspected entries | Useful approach and boundary |
| --- | --- |
| [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills): [router](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/router/SKILL.md), [game-feel](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-feel/SKILL.md), [create-game-assets](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/create-game-assets/SKILL.md) | Conditional loading, effect importance and judging asset families in game context are useful. Keep one Arcade Lab entrypoint; do not import engine workflows, fixed effect counts/timings or universal easing advice. Production workflow already belongs in the theme guides. |
| [saschb2b/skills: game-design](https://github.com/saschb2b/skills/blob/main/skills/productivity/game-design/SKILL.md) | Experience-first questions and explicit costs help evaluate a mechanic. Its universal consultation rules, concept bundles, hooks and sign-off process would burden small tasks here. Keep the relevant lens and current document owners. |
| [abagames/agentic-gamedev-skills](https://github.com/abagames/agentic-gamedev-skills): [designing-mini-games](https://github.com/abagames/agentic-gamedev-skills/blob/main/.agents/skills/designing-mini-games/SKILL.md), [maximizing-game-feel](https://github.com/abagames/agentic-gamedev-skills/blob/main/.agents/skills/maximizing-game-feel/SKILL.md), [directing-game-visuals](https://github.com/abagames/agentic-gamedev-skills/blob/main/.agents/skills/directing-game-visuals/SKILL.md) | Diagnose weak moments, compare simple strategies and match effects to tone and meaning. Do not import dedicated planning files, fixed palette sizes, difficulty curves, telemetry systems or orchestrators; adapt the questions to existing owners. |

The earlier player-experience and genre material was inspected during the 2026-10-29 consolidation; menu additions carry their own inspection date; video and legacy-demo limitations are explicit. Keep future additions only when their inspected content changes a useful local decision. Paraphrase, credit the author and distinguish a principle, a practical heuristic and a context-dependent preference. Replace stale interpretations rather than accumulating a larger reading list.
