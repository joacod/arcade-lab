# Genre guidance

Use the matching section for a concrete problem, then trace the linked game guide and source. Existing mechanics illustrate decisions; they are not a required genre package. The [player-experience reference](player-experience.md) supplies reusable reasoning locally. The optional [bibliography](research-sources.md) records provenance. Suggested changes below are hypotheses to evaluate, not claims that they are already implemented.

## Arena survival

**Design question:** If weapons fire automatically, what makes movement and upgrades engaging? Inspect routes between danger and rewards, recoverable space in crowds and whether builds change target priority or movement. Compare active routing with passive waiting before adding another weapon.

XP placement can tempt a risky detour; distinct weapon coverage can make positioning matter. Both fail if rewards become invisible in effects or one build solves every situation. Escalating body count without space to recover can turn decisions into unavoidable contact. Entry cues should support route planning without making the edge a wall of warnings. Check whether a weaker build can still collect the resources needed to improve.

**Local example:** [Last Light Clearing](../../../../docs/games/last-light-clearing/README.md) connects auto-attacks, gems, paused upgrades and an elite. Its guide maps weapon/progression owners and camera entry cues. Inspect actual upgrade effects before assuming that more choices add agency. Use [meaningful decisions](player-experience.md#agency-and-meaningful-decisions) and [pacing](player-experience.md#progression-pacing-and-challenge).

## Vertical shooter

**Design question:** Does encounter pressure change the player's decisions or just fill the screen? Inspect formation overlap, firing lanes, bullet travel time, lingering shots, supply placement and the transition into a boss. Observe both a strong sortie and one recovering after a lost life. Reduced firepower may prolong enemies and compound an earlier mistake.

Alternate demands such as clearing a firing lane, moving after an aimed lock and threading a spread. A gap between wave deadlines is not a breather while old bullets still cross it. Stagger an overlap or change an approach direction when it blocks every route; simply slowing every bullet can remove the intended rhythm. Keep hostile fire and vulnerable regions distinct from friendly shots and scenery. Decorative wings need not match the physical body, but that body needs an understandable cue.

**Local example:** [Skybreak](../../../../docs/games/skybreak/README.md) documents authored formations, fixed supplies, respawn recovery and three fortress patterns. Start pacing work at formations and deadlines in `content.ts`, then trace `game.ts` for the actual overlap. The boss's fixed target lock illustrates movement after commitment, while lane warnings communicate safe corridors. Use [threats](player-experience.md#anticipation-action-and-consequence) and [pacing](player-experience.md#progression-pacing-and-challenge).

## Platformer

**Design question:** Was a jump missed because intent was lost, movement was unpredictable or the landing could not be seen? Inspect the press relative to leaving an edge or touching down, held/released jump behavior, braking, collision and camera framing. Compare an ordinary jump with the specific failing obstacle.

An early press may need buffering, a late one a ledge allowance, and a snag a collision fix. Extending every window can permit unintended routes and make a fresh press trigger much later. Retune sightlines and recoverable space when changing speed or jump shape. For teaching, an approachable landing or optional reward can invite practice before hazards combine, but required learning must not depend on collecting it.

**Local example:** [Clockwork Hollow](../../../../docs/games/clockwork-hollow/README.md) already has variable height, coyote time, a press buffer and swept solids. Inspect `movement` in `content.ts`, jump ordering in `game.ts`, then the camera in `presentation.ts`. Its vents distinguish warning from active danger, and checkpoints reduce repetition. Use [control](player-experience.md#responsiveness-and-perceived-control), [movement](player-experience.md#movement-acceleration-and-recovery) or [camera](player-experience.md#camera-framing-and-anticipation) according to the observed cause.

## Side-scrolling beat 'em up

**Design question:** Can the player identify an attacker and choose a defense within a crowd? Inspect facing, horizontal reach, ground-depth alignment and elevation independently of painted overlap. Watch the warning through startup, contact and recovery from the player's actual position.

Distinct preparation poses, lane/area cues and visible recovery can reveal a response. Extra warning time does little if another body hides the cue or blocks the exit. Crowd admission and spatial separation can preserve counterplay; overly strict serialization makes enemies wait visibly. Teach an enemy's demand in a manageable encounter before mixing threats. Distinguish ordinary stagger, armor and openings so repeated attacks do not appear inconsistent.

**Local example:** [Midnight Circuit](../../../../docs/games/midnight-circuit/README.md) has Strikers, committed Bruisers, one attack token and a Warden with charge/ground-impact patterns and an OPEN recovery. Trace phases and eligibility in `game.ts`, definitions in `content.ts` and shared poses in `animation.ts` across presentations. Ground anchors and depth sorting matter when jumping bodies overlap. Use [threats](player-experience.md#anticipation-action-and-consequence), [counterplay](player-experience.md#combat-spacing-and-counterplay) and [hierarchy](player-experience.md#visual-hierarchy-and-art-direction).

## One-on-one fighting game

**Design question:** Is defense useful, understandable and followed by a real decision? Compare hit, guard and miss at near, tip and outside range. After blocking, examine both fighters' remaining commitment, stun, pushback and approach time. An opening on paper may be unreachable; a safe block need not guarantee retaliation.

Preserve roles in speed, reach and exposure rather than shortening every move. Some fast strikes reward prediction and spacing, while a high-consequence heavy can offer a clearer reactive answer. Differentiate guard heights and reactions before adding another defensive mechanic. Buffers can preserve timing but may launch a stale attack when guard is released. Investigate corner loops and what a CPU knows before tuning its reaction speed.

**Local example:** [Obsidian Duel](../../../../docs/games/obsidian-duel/README.md) explains high/low guards, blockstun, protected wake-up and heavy recovery. Read move data in `content.ts`, guard/contact and action eligibility in `game.ts`, and delayed observations in `cpu.ts`. Use [counterplay](player-experience.md#combat-spacing-and-counterplay) and [understandable failure](player-experience.md#fair-difficulty-and-understandable-failure). Competitive fighting vocabulary is useful without importing throws, parries or complex commands automatically.

## Destructible run-and-gun

**Design question:** Does destruction create tactical choices while preserving navigation and readable targets? Inspect the route after cover and support disappear, what later shots hit and how a retry inherits the changed world. Weapons should differ in useful reach, timing or terrain consequences, not merely damage totals.

**For an Assets pass:** Use the [Assets workflow](../../../../docs/assets-themes.md) and map the existing terrain materials, operators, guards, machines and objective cues before producing artwork. Consider one intact/damaged cover pair beside structural steel and a moving actor over the intended scenery. Surface joins and damage states can explain destructibility without making solid steel look breakable. Keep dust and debris subordinate to aim, projectiles and objectives. These are visual design options; frame, anchor and loading contracts belong in the canonical guide and game owners.

**Local example:** [Blastline](../../../../docs/games/blastline/README.md) separates mutable cover from structural routes. `terrain.ts`, `movement.ts`, `combat.ts` and `game.ts` own contact and mission consequences; `themes.ts` and `presentation.ts` own the existing material treatment and effects. Read [art direction](player-experience.md#visual-hierarchy-and-art-direction) and [feedback](player-experience.md#layered-feedback-and-game-feel) for the specific creative problem. An appearance must preserve the meanings of the existing materials.

For future genres, add guidance only when a concrete task exposes a useful decision or failure mode. Keep implementation constants, renderer details and game-specific decisions in their current owners.
