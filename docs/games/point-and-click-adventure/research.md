# Adventure design references

[Game guide](README.md) · [Story and puzzles](story.md)

These sources informed the adventure’s design. They are optional references for maintenance and adaptation, not runtime dependencies or an implementation checklist. Creator preferences and other tools’ capabilities do not define this game’s contract; the game guide and source describe the implementation.

## Decisions worth preserving

| Decision in this case | Design reference and rationale |
| --- | --- |
| Physical clues and explicit fictional rules precede deductions | Fernández-Vara and Osterweil’s [The Key to Adventure Game Design: Insight and Sense-making](https://clarafv.com/wp-content/uploads/2014/07/meaningfulplaypaper_final-formatted.pdf) distinguishes assumed knowledge from the insight connecting it. Teach lantern and ward rules rather than assume folklore. |
| Recoverable mistakes and no reading deadline | Ron Gilbert’s [Why Adventure Games Suck](https://grumpygamer.com/why_adventure_games_suck/) argues for understandable goals and against inaccessible required items. Here, wrong uses preserve tools and containment errors allow another attempt. |
| Two independent investigations converge at the confrontation | Gilbert’s [Puzzle Dependency Charts](https://grumpygamer.com/puzzle_dependency_charts/) informs the use of parallel chains and convergence. The local story document records the actual prerequisites. |
| Look, contextual interaction and selected-item use remain distinct | Fernández-Vara’s [From “Open Mailbox” to Context Mechanics](https://clarafv.com/wp-content/uploads/2014/07/fodg-2011-revised-final.pdf) examines the tradeoff between usability and expressive actions; Gilbert’s [Verbs and Adventure Games](https://grumpygamer.com/verbs_verbs_verbs/) supplies another perspective. Choose actions for this story rather than reproduce a historical verb panel. |
| Conversations convey motives as well as clues | Gilbert’s [Dialog Puzzles](https://blog.thimbleweedpark.com/dialog_puzzles.html) discusses coherent assembled conversations. Evelyn, Oswald, Brindle and Vale each have a reason for their responses. |
| Optional hints follow current progress | Thimbleweed Park’s [Dialogs, Hints and more](https://blog.thimbleweedpark.com/hints_and_dialogs.html) describes moving away from object-targeted help. This case offers escalating hints without requiring the player to identify the answer’s object. |
| Room targets and walking geometry have separate definitions | The [Adventure Game Studio Room Editor manual](https://raw.githubusercontent.com/adventuregamestudio/ags-manual-source/master/EditorRoom.md) is a conceptual reference for separating hotspots, objects and walkable areas. Its editor and mask formats are not used here. |
| Reading and interaction are player-paced | [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/) informs readable text, native target controls, alternatives to precise gestures and equivalent clue information. A target list alone does not establish a fully nonvisual experience. |

## Inspiration boundaries

**Maniac Mansion** suggests an inhabited house with responsive characters and objects; its dead ends are not a goal. **Monkey Island** suggests a distinctive protagonist and comprehensible puzzle goals, rather than a required setting or verb count. **Day of the Tentacle** suggests making puzzles and presentation share a coherent fictional logic; multiple protagonists and time travel are separate mechanics that this case does not implement.

For the latter distinction, see Double Fine’s [official description](https://www.doublefine.com/games/day-of-the-tentacle-remastered?platform=all) and [Dave Grossman’s interview](https://spillhistorie.no/2025/05/23/a-conversation-with-dave-grossman/). These references inspire original work. No commercial game code, dialogue, artwork or soundtrack is part of the adventure.
