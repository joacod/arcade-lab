# Targeted game-development research

Start with a concrete question and the actual implementation. Choose the closest source or relevant section, extract an applicable idea, then check its tradeoffs in this game. Browsing is optional; ordinary work can proceed from local guidance when tools or source access are unavailable. External examples complement repository rules and do not authorize importing their architecture, mechanics or artwork.

## Runtime and ownership

| Source | What it teaches | Consult when |
| --- | --- | --- |
| Robert Nystrom, [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html) | Separating input, update and rendering, with timing and platform-loop tradeoffs. | Diagnosing cadence or execution ownership. Compare with the existing host and clock before proposing another loop or abstraction. |
| MDN, [Anatomy of a video game](https://developer.mozilla.org/en-US/docs/Games/Anatomy) | How browser scheduling relates to update and render work. | A browser-specific timing question needs platform context. Treat tutorial loops as illustrations; use Arcade Lab's established owners. |

## Design, learning and challenge

| Source | What it teaches | Consult when |
| --- | --- | --- |
| Robin Hunicke, Marc LeBlanc and Robert Zubek, [MDA: A Formal Approach to Game Design and Game Research](https://www.cs.northwestern.edu/~hunicke/MDA.pdf) | Connecting implemented rules, emergent behavior and the experience felt by players. | A mechanically correct change is not producing the intended tension, agency or replay value. Use the model to form hypotheses, not as a required design-document format. |
| Daniel Cook, [The Chemistry of Game Design](https://www.gamedeveloper.com/design/the-chemistry-of-game-design), Game Developer | A model of learning through action, response and revised understanding, and how skills build on one another. | Pacing repeats mastered actions or a difficulty spike assumes an untaught skill. Apply it as a design lens rather than a universal account of motivation. |

## Movement and cameras

| Source | What it teaches | Consult when |
| --- | --- | --- |
| Maddy Thorson, [Celeste & Forgiveness](https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html) | Concrete timing and positioning allowances that help a demanding platformer respect player intent. | Investigating near-missed jumps or other intent mismatches. Borrow the reasoning rather than copying Celeste's tuning or adding all its mechanics. |
| Itay Keren, [Scroll Back: The Theory and Practice of Cameras in Side-Scrollers](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers), Game Developer, adapted from his GDC talk | Camera windows, framing, forward focus and smoothing through examples and tradeoffs. | A camera hides landings, threats or objectives, or moves unnecessarily. Select techniques for the game's actual movement and spatial decisions. |

## Combat and feedback

| Source | What it teaches | Consult when |
| --- | --- | --- |
| David Sirlin, [Street Fighter Tutorial Videos](https://www.sirlin.net/articles/street-fighter-tutorial-videos) | Fighting as control of space, with examples of timing, commitment and counterplay. | An attack or defensive option lacks a clear tactical role. The author's page introduces embedded videos; inspect the relevant demonstration before relying on a specific technique. |
| Martin Jonasson and Petri Purho, [Juice It or Lose It](https://www.youtube.com/watch?v=Fy0aCDmgnxg), author-uploaded talk | A live demonstration of layered animation and feedback making a simple game more expressive. | Contacts, rewards or transitions feel inert. Choose effects that communicate the event and preserve readability; intensity is not a target. |

## Visual direction

| Source | What it teaches | Consult when |
| --- | --- | --- |
| Jason Mitchell, Moby Francke and Dhabih Eng, Valve, [Illustrative Rendering in Team Fortress 2](https://cdn.fastly.steamstatic.com/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf) | How silhouettes, value organization and shading support a cohesive style and rapid role recognition. | Planning Assets or Quality art direction, differentiating enemies or reducing environmental noise. Transfer visual principles without requiring its rendering technique. |

These are starting points, not a required reading list. For an unanswered genre or technique question, seek a focused original developer explanation, paper or official technical document. Verify the URL and relevant content before retaining a new source. If only a summary or video description is accessible, distinguish that evidence from techniques actually inspected. Paraphrase useful lessons concisely and retain attribution; do not copy substantial passages.
