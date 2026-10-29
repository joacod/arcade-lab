# Reasoning about player experience

Read only the section that explains the problem: [control](#responsiveness-and-perceived-control), [movement](#movement-acceleration-and-recovery), [camera](#camera-framing-and-anticipation), [teaching](#teaching-through-play), [threats](#anticipation-action-and-consequence), [combat](#combat-spacing-and-counterplay), [feedback](#layered-feedback-and-game-feel), [decisions](#agency-and-meaningful-decisions), [difficulty](#fair-difficulty-and-understandable-failure), [pacing](#progression-pacing-and-challenge), [art direction](#visual-hierarchy-and-art-direction) or [rewards](#rewards-and-replayability). Genre examples and source owners are in [genre guidance](genre-guidance.md).

These are practical heuristics and design lenses, not required mechanics or tuning formulas. Begin with the requested experience, an observable situation and a hypothesis. For example, increasing pickup value may create riskier routes, which may produce tension or merely punish players who cannot read danger. Inspect the resulting behavior, not just the changed number. In MDA, “aesthetics” means the felt experience, including discovery or tension, rather than graphics alone. Attribution and limits are in the optional [bibliography](research-sources.md); ordinary implementation needs no external reading.

## Responsiveness and perceived control

When a command feels late, locate the delay between physical capture, action translation, simulation eligibility and visible response. Compare a short tap, hold, simultaneous actions and reversal in the failing situation. An immediate pose cannot recover a lost input; faster movement cannot repair capture latency. Conversely, input can arrive correctly while an unclear recovery state makes a deliberate commitment feel broken.

A buffer can remember an early press until an action becomes legal. Choose what expires, what consumes it and whether later intent replaces it. Too broad a window produces unwanted actions after the player changes plans. Distinguish holds from fresh presses and inspect interruption/reset behavior. For a jump, separate pressing just before landing from pressing just after leaving an edge; these are different eligibility problems. Trace existing allowances before adding another.

## Movement, acceleration and recovery

Can players predict where they stop, land and regain control? Compare open space with the actual platform, corridor or projectile gap. Acceleration, braking, air steering and collision response interact with level spacing; a controller that feels good in an empty room can fail in authored geometry. Immediate steering supports precise dodging; momentum rewards planning but needs recoverable space.

For jumping, inspect takeoff, ascent, release, apex and landing separately. A launch delay suggests a different fix from excessive drift or an unexpected head collision. Coyote time, landing buffers, variable height and limited corner correction can preserve intended actions; they can also bypass obstacles or remove deliberate precision. Thorson's Celeste account demonstrates allowances in a demanding game, not a package every platformer needs. Cosmetic wind-up must not silently delay takeoff. Keep deliberate attack commitment distinct from movement latency.

## Camera framing and anticipation

When players say a hazard is too fast, inspect when it becomes visible relative to travel, stopping and response time. Check approaching a landing, reversing direction, crossing a boundary and retrying, including a narrow viewport. Enlarging actors may improve recognition while shrinking the visible planning space.

A dead zone can suppress hop-by-hop motion but leave the actor near an edge. Forward focus reveals approaching threats but can swing on every reversal or hide pursuers. Smoothing softens motion but can lag behind a fast actor. Bounded look-ahead or region framing can help; adding all techniques often creates competing camera goals. Preserve the view needed for the next decision, not merely a centered protagonist. Keren's examples are a vocabulary for these tradeoffs, not a default camera recipe. See Clockwork Hollow's camera and Midnight Circuit's encounter framing in [genre guidance](genre-guidance.md).

## Teaching through play

When players repeatedly fail a new mechanic, identify the missing knowledge: the control, its effect, the relevant cue or when to use it. A controls label teaches a binding; it does not establish that a beetle is safe to stomp or that a locked aim can be escaped after targeting. Inspect the first encounter with the rule and what outcome would let a newcomer infer it.

One useful approach is a low-cost example with a clear consequence, a nearby chance to repeat it, then a variation or combination with something familiar. Space, enemy placement and optional rewards can invite experimentation without a compulsory tutorial room. Keep essential learning on the required route rather than hiding it behind an optional reward. A short contextual prompt helps when the action is hard to discover; removing all text is not a design goal.

Cook's skill chains help find missing prerequisites; teach/test/twist is a sequencing heuristic. Neither requires a fixed number of stages. Long safe introductions can bore returning players, and a sequence that permits accidental success may never teach the rule. Judge whether the player can recognize and reuse the idea in a changed situation, not simply whether they passed the first obstacle.

## Anticipation, action and consequence

For an unreadable threat, inspect the cue's identity, direction or area, timing and available response. Before the hit, can the player recognize what matters? During it, does the threat represent the actual active area and interval? Afterward, can the player tell whether they avoided, guarded or suffered it?

A tracking wind-up and a locked target ask different questions. Make the moment of commitment understandable; a locked marker that keeps following teaches the wrong response. Differentiate preparations that require different defenses, and separate recovery from danger. A long glow does little if it communicates neither attack direction nor a viable escape.

Stout emphasizes clear warnings for avoidance combat. Riot's counterplay account also allows answers made earlier through positioning or resource planning; not every quick strike needs a long reaction window. Choose whether this threat tests reaction, prediction or preparation. A severe consequence deserves a correspondingly useful opportunity to respond, and combined threats must leave that opportunity intact.

## Combat spacing and counterplay

When an option dominates or defense feels futile, examine hit, guard and miss at several distances. Account for startup, reach, active duration, recovery, defender stun, pushback and the time needed to approach. A nominal recovery window is not punishable if the defender is still stunned or cannot reach it. Safe blocking can restore neutral spacing without guaranteeing a free hit.

Give each enemy a recognizable demand and a weakness: closing distance, leaving a lane, timing a guard or exploiting commitment. Distinct behavior matters more than another health total. Combine demands only after checking whether answering one prevents answering the other. Attack admission, spatial separation or staggered starts can keep a crowd legible; excessive waiting makes it inert. Better cues cannot fix a situation with no possible answer.

Preserve useful asymmetry while addressing dominant actions. A slow heavy can control space while risking a miss; making it as quick and safe as a light may erase both roles. Distinguish intended prediction from a CPU that reads future input. Existing examples include Obsidian Duel's delayed observations and Midnight Circuit's crowd admission; see their [genre sections](genre-guidance.md) before borrowing either policy.

## Layered feedback and game feel

When an action feels weak, first identify what the player cannot perceive: acceptance, direction, contact, material, force or outcome. Swink connects control with spatial context and perceived physical response; game feel reaches beyond particles and shake. Inspect both a single event and sustained play, where individually pleasing effects can become constant noise.

For a hit, a compact contact pose, localized visual response, target reaction and short sound can explain one event together. A guarded strike needs a different response from damage; a miss should not celebrate a hit. Choose channels for the game's tone: elastic motion may fit a playful creature, while a restrained recoil and settling pose may better express machinery. Linear motion can be appropriate for a steady projectile; easing everything changes its apparent trajectory.

Remove competing decoration before adding another effect. Reserve strong feedback for consequential events, let it return to rest and keep warnings readable during impacts. Information should survive muted sound and reduced decorative motion. Audio synthesis belongs to [AudioBits](../../audiobits/SKILL.md); this reference concerns what an event needs to communicate. Hit pause changes action timing and needs an explicit simulation policy under the [architecture](../../../../docs/architecture.md#lifetimes-and-execution), including input and other active threats. A renderer callback must not stop gameplay.

## Agency and meaningful decisions

When play becomes repetitive, compare the intended strategy with standing still, holding the main attack, repeating one move or always taking the same upgrade. These are diagnostic comparisons, not behaviors every genre must forbid. Ask what information or tradeoff would make a different action useful. Routes, target priority and timing can create depth without more buttons.

A meaningful choice has consequences the player can anticipate and alternatives that matter in some situation. More options, random drops or hidden numbers can obscure an obvious best answer. An upgrade may change spacing or risk, while a numerical upgrade may still be appropriate for a power fantasy. Explain which experience the change serves. Keep character identity when tuning balance rather than making every option equivalent.

## Fair difficulty and understandable failure

After failure, can players identify a cause and imagine a better response? Separate a missing cue, an execution error, a misunderstood rule and an impossible combination before lowering all damage. Inspect reachable safe space and action availability at the critical moment, including the aftermath of the previous hit.

Separate challenge from repetition cost. A checkpoint can shorten the return without simplifying the jump; recovery protection can prevent helpless repeated damage but also remove meaningful risk. Inspect where retries place the player and what state persists. Automated completion establishes some rule properties, not the enjoyment or readability of a human attempt.

## Progression, pacing and challenge

When encounters drag or spike, compare the intended activity with what the player is doing: choosing targets, waiting, collecting, recovering or repeating a solved action. Track pressure from surviving enemies, lingering projectiles, space restrictions and resource state across transitions. A scheduled gap is not relief if the old threats remain.

Vary a learned demand through positioning, timing or combinations before merely adding health. Alternate pressure with chances to reposition or recognize progress when that serves the intended rhythm. Short intense games can sustain pressure; a fixed rest interval is not required. Booth's Left 4 Dead account modulates threat population for pacing; borrowing peaks and relief does not require an adaptive director or changing enemy damage.

For a difficulty spike, ask whether it adds a new response, removes space, overlaps existing demands or worsens recovery after failure. Change the cause that matters. A boss can recombine learned responses and offer readable openings without following a prescribed phase formula. Skybreak's formations and boss transition provide a compact local example in [genre guidance](genre-guidance.md#vertical-shooter).

## Visual hierarchy and art direction

When action disappears into attractive artwork, inspect a gameplay-sized scene during overlap and motion. Can the eye locate the controlled actor, immediate danger, target and next objective? Silhouette, value grouping, edge contrast and movement offer separation alongside color. A silhouette helps identify a role; a pose or ground marker may be needed to reveal what it is doing.

Give the direction a concrete visual language: related shapes, material treatment, lighting and motion that suit the fiction. Carry it across actors, environment, feedback and interface. Allocate fine detail and strong accents where attention is useful. Quiet scenery can still have broad, expressive forms; outlining everything brightly often destroys the hierarchy. Valve and Riot show how art and rendering choices can support recognition without prescribing their shaders or aesthetic.

For an Assets family, compare a representative actor, hazard and terrain piece together over real scenery before expanding production. For Quality, choose the most useful compositional or animation improvement before increasing effect density. Preserve the meaning of safe surfaces, destructible cover and active danger across treatments. A beauty image cannot establish readability in motion. Asset specifications, preparation and replacement stay in the canonical [Assets](../../../../docs/assets-themes.md) and [Quality](../../../../docs/quality-themes.md) workflows.

## Rewards and replayability

When rewards feel empty, ask what accomplishment they acknowledge and what another attempt makes possible: mastery, a new route, a different build or a better score. A changed capability or a clear ending can matter more than another counter. Inspect whether the reward encourages behavior that undermines the core action.

Motivation research offers competence, autonomy and relatedness as useful lenses, with contested applications to particular mechanics. A sense of capability can come from understanding a failure; autonomy can come from a small consequential choice. Neither implies more unlocks or multiplayer. Cook foregrounds learning, while MDA also makes room for sensation, fantasy and other experiences. Use these perspectives to question a design, not to predict enjoyment from a formula. Avoid adding persistence or grind solely to extend a complete short game.
