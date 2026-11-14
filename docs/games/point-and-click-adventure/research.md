# Adventure design references

[Game guide](README.md) · [Story and puzzles](story.md)

These sources informed the adventure’s design. They are optional references for maintenance and adaptation, not runtime dependencies or an implementation checklist. Creator preferences and other tools’ capabilities do not define this game’s contract; the game guide and source describe the implementation.

## Decisions worth preserving

| Decision in this case | Design reference and rationale |
| --- | --- |
| Physical clues and explicit fictional rules precede deductions | Fernández-Vara and Osterweil’s [The Key to Adventure Game Design: Insight and Sense-making](https://clarafv.com/wp-content/uploads/2014/07/meaningfulplaypaper_final-formatted.pdf) distinguishes assumed knowledge from the insight connecting it. Teach lantern and ward rules rather than assume folklore. |
| Recoverable mistakes and no reading deadline | Ron Gilbert’s [Why Adventure Games Suck](https://grumpygamer.com/why_adventure_games_suck/) argues for understandable goals and against inaccessible required items. Here, wrong uses preserve tools and containment errors allow another attempt. |
| Two independent investigations converge at the confrontation | Gilbert’s [Puzzle Dependency Charts](https://grumpygamer.com/puzzle_dependency_charts/) informs the use of parallel chains and convergence. The local story document records the actual prerequisites. |
| One click requests the target’s contextual action; an inventory item supplies an explicit alternative | Fernández-Vara’s [From “Open Mailbox” to Context Mechanics](https://clarafv.com/wp-content/uploads/2014/07/fodg-2011-revised-final.pdf) examines the tradeoff between usability and expressive actions; Gilbert’s [Verbs and Adventure Games](https://grumpygamer.com/verbs_verbs_verbs/) supplies another perspective. Choose actions for this story rather than reproduce a historical verb panel. |
| Conversations convey motives as well as clues | Gilbert’s [Dialog Puzzles](https://blog.thimbleweedpark.com/dialog_puzzles.html) discusses coherent assembled conversations. Evelyn, Oswald, Brindle and Vale each have a reason for their responses. |
| Room targets and walking geometry have separate definitions | The [Adventure Game Studio Room Editor manual](https://raw.githubusercontent.com/adventuregamestudio/ags-manual-source/master/EditorRoom.md) is a conceptual reference for separating hotspots, objects and walkable areas. Its editor and mask formats are not used here. |
| Reading and interaction are player-paced | [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/) informs readable text, native target controls, alternatives to precise gestures and equivalent clue information. Native scene targets support keyboard activation without a parallel room list. This alone does not establish a fully nonvisual experience. |

## Interaction choice

The interface uses a direct contextual action for each target and an explicit item-to-target action. Gilbert and Grossman describe making exploration actions predictable through text in their [Return to Monkey Island design interview](https://www.gamedeveloper.com/design/return-to-monkey-island-ron-gilbert-dave-grossman-writing-design). For this case, examining a clue, collecting an object, talking and entering a doorway each have a clear default. The service tube’s label changes when its mechanism becomes available. Inventory combinations and evidence selection remain deliberate player decisions.

A permanent verb panel required selecting a target and then searching elsewhere for its action. A contextual verb wheel would put that choice closer to the object, but still require a second selection for routine exploration. Direct activation fits the current targets while freeing the scene from permanent room, inventory and journal panels. Secondary information lives in dismissible Inventory and Casebook views. Native scene buttons use the same transform as Canvas, with labels limited to the hovered or keyboard-focused target. Touch activates the same targets directly.

Clear story stakes and clues give the player something to investigate. They do not require a persistent objective, a hint button or step-by-step solution text. This case keeps its controls in Settings and lets observation, conversation and experimentation drive progress. Movement and visible changes communicate actions; text supplies observations and consequences that add information. Conversation choices appear where spoken lines appeared.

The [Adventure Game Studio hotspot tutorial](https://adventuregamestudio.github.io/ags-manual/acintro3.html) describes walk-to points before hotspot interactions. Its [general settings](https://adventuregamestudio.github.io/ags-manual/GeneralSettings.html) make walking before Look configurable, so this is a design choice rather than a universal genre rule. Here all world-targeted actions, including examining and reading, share the same approach/arrival requirement. A replacement or cancelled command cannot execute the old action or disclose its evidence. Inventory-only operations require no world approach.

## Inspiration boundaries

**Maniac Mansion** suggests an inhabited house with responsive characters and objects; its dead ends are not a goal. **Monkey Island** suggests a distinctive protagonist and comprehensible puzzle goals, rather than a required setting or verb count. **Day of the Tentacle** suggests making puzzles and presentation share a coherent fictional logic; multiple protagonists and time travel are separate mechanics that this case does not implement.

For the latter distinction, see Double Fine’s [official description](https://www.doublefine.com/games/day-of-the-tentacle-remastered?platform=all) and [Dave Grossman’s interview](https://spillhistorie.no/2025/05/23/a-conversation-with-dave-grossman/). These references inspire original work. No commercial game code, dialogue, artwork or soundtrack is part of the adventure.
