# Reasoning about player experience

Use the sections that explain the observed problem. These are design questions, not a completion checklist. Timing, speed, difficulty and feedback intensity depend on the intended experience. The linked research offers models and examples rather than universal tuning values.

## Responsiveness and perceived control

Where does intent become action: physical capture, action translation, simulation eligibility or the visible response? Distinguish a lost press from an intentional commitment. Check short taps, simultaneous actions and direction reversals in the affected controls before changing movement speed to compensate for latency.

Does a press made just before an action becomes legal deserve to be remembered? A short jump or attack buffer can preserve intent; an overly generous buffer can trigger an unwanted move after the player has changed plans. Holds and fresh presses need distinct semantics. After an interruption, stale commands should not surprise the player.

## Movement, acceleration and recovery

Can players predict where they will stop, land or regain control? Consider acceleration, braking, air control, turning and collision response together with the space available. Immediate steering can suit precise projectile dodging; momentum can make traversal expressive but needs room to recover. Increasing speed without revisiting sightlines and stopping distance can make the same level unfair.

For jumping, ask whether launch, ascent, apex and landing support the intended rhythm. Variable height, coyote time and landing buffers are possible solutions to specific intent mismatches, not mandatory features. Cosmetic anticipation must not delay the actual command unintentionally. See [Celeste & Forgiveness](research-sources.md#movement-and-cameras).

## Anticipation, action and consequence

Before danger, can the player recognize what will happen, where it will happen and a viable response? During it, does the visible threat match the real active interval and area? Afterward, is the result clear enough to inform the next decision?

Warnings need useful information, not merely more duration. A locked aim marker teaches movement after targeting; a tracking attack communicates a different problem. Long warnings can reduce pressure but also interrupt pacing. Avoid presenting a harmless recovery pose as active danger, or a purely cosmetic flourish as an attack cue.

## Combat feedback and attack readability

Can players distinguish a miss, hit, guard, immunity and interruption? Align pose, contact location, reaction, sound and UI around the same semantic event. Stronger attacks can communicate commitment through preparation and recovery as well as impact. Bigger particles alone do not explain why an attack missed.

Does each option have a purpose and a cost in reach, exposure, timing or positioning? If one attack solves every situation, consider counterplay before adding more moves. Too little recovery can erase punish opportunities; too much can feel unresponsive if the commitment is poorly signaled. Hit pauses, if appropriate, alter action timing and need an explicit simulation policy; never stop gameplay from a renderer callback. See [fighting fundamentals](research-sources.md#combat-and-feedback).

## Agency and meaningful decisions

What can the player choose now, and why might a different choice be better next time? Movement routes, target priority, resource use and timing can provide depth without extra buttons. In an auto-attacking game, positioning and upgrade choices may carry most of the agency.

Do upgrade choices change play in understandable ways, or just hide an obvious best answer behind numbers? Preserve the intended fantasy while examining dominant strategies. More randomness or more options can obscure decisions instead of enriching them. [MDA](research-sources.md#design-learning-and-challenge) helps connect a rule change to the behavior and experience it produces.

## Fair difficulty and understandable failure

After failure, can the player identify the cause and imagine a better response? Examine warning visibility, reachable safe space, collision predictability and the overlap of threats before lowering all damage. Individually reasonable enemies can form an unavoidable combined attack.

Separate skill demand from the cost of retrying. A checkpoint can shorten repetition without simplifying the difficult action. Recovery protection can prevent repeated helpless damage, but excessive protection may remove meaningful risk. CPU challenge should arise from understandable behavior and counterplay; inspect what information it sees and which rules it obeys before making it faster.

## Progression, pacing and challenge

What does an encounter introduce, let the player practice, then combine or vary? Give enough context to understand a new threat before demanding several new responses at once. Alternate pressure with opportunities to reposition, collect rewards or recognize progress; the right rhythm depends on the game's length and intensity.

Does escalation ask for a new decision, or merely repeat the same action against more health? Inspect the hardest combination and transitions, not only the opening. A boss can recombine learned responses while preserving readable opportunities. [Cook's skill-chain model](research-sources.md#design-learning-and-challenge) is useful when a challenge assumes knowledge the game has not helped establish.

## Feedback and visual hierarchy

During active play, can the eye find the controlled actor, immediate danger, relevant target and next objective at gameplay size? Separate roles through shape, contrast, position and motion as well as color. A detailed background may need quieter values, not a brighter outline on every object. Camera framing should reveal the space needed for the next action without chasing every cosmetic movement.

Coordinate animation, graphics, sound and UI so they reinforce rather than compete. Reserve conspicuous feedback for consequential events and keep routine rewards subordinate to danger. Important information must survive muted sound, reduced decorative motion and crowded scenes. Use [visual-direction research](research-sources.md#visual-direction) to assess silhouettes and materials, and [feedback demonstrations](research-sources.md#combat-and-feedback) to explore expression without making every event equally loud.

## Rewards and replayability

Does a reward acknowledge a decision or accomplishment the player understands? Collection, a new route, a changed capability or a clear result can be more meaningful than another counter. Make progress and the ending legible before expanding progression systems.

What gives another attempt a different purpose: mastery, a different build, a riskier route or a better score? Random variation should preserve understandable rules and viable choices. Avoid adding unlocks, persistence or grind solely to extend a short complete game. Revisit the intended experience if rewards encourage behavior that makes the core action less enjoyable.
