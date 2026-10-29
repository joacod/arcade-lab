# Genre guidance

Use the matching section to frame questions, then read the owning game's guide and source for implementation details. Existing mechanics are examples to evaluate, not requirements for every game in that genre. Each linked guide identifies its simulation, content, input, presentation and sound owners; keep tuning and technical details there.

## Arena survival

Players expect readable crowd pressure, useful movement choices and a growing sense of capability. The central loop often connects avoiding encirclement, defeating enemies, collecting rewards and choosing upgrades. If attacks are automatic, routes and build decisions need enough influence to sustain agency.

Examine whether collecting XP creates an interesting risk, whether upgrades change tactics and whether rising density leaves recoverable space. Common problems include passive waiting for weapons, dominant builds and spawns that trap the player without warning. Distinguish enemy bodies, pickups and harmful effects in crowds; offscreen entry cues should help route planning without overwhelming it.

Study [Last Light Clearing](../../../../docs/games/last-light-clearing/README.md), especially its weapon/progression owners and camera cues. [MDA and skill chains](research-sources.md#design-learning-and-challenge) help reason about upgrade incentives and escalating pressure.

## Vertical shooter

Players expect precise steering, legible projectile trajectories and patterns with learnable responses. Formation sequencing, target priority, firing lanes, power-ups and defensive resources shape the experience. A pattern's difficulty depends on available space and travel time as well as projectile speed or count.

Examine overlapping waves, boss transitions and the consequences of losing power. Can a player recover after a lost life, or does reduced firepower make every later encounter harder? Keep hostile shots and vulnerable regions readable above scenery and player fire. Decorative wings and glow must not misrepresent the hittable body.

Study [Skybreak](../../../../docs/games/skybreak/README.md), its formations, boss warnings and relative gesture input. Use [visual-direction research](research-sources.md#visual-direction) for role separation and [feedback research](research-sources.md#combat-and-feedback) for differentiated shot/contact responses.

## Platformer

Players expect predictable contact, reliable takeoff and enough information to judge a landing. Traversal depends on movement and jump shape interacting with authored geometry, hazards and checkpoints. Optional routes can reward mastery without blocking basic completion.

Examine acceleration, braking, variable jump height, coyote time and input buffering where they explain a real control problem. Generosity can preserve intent but can also erase deliberate precision. Common failures include corner snags, ambiguous platform solidity, blind landings and a camera that follows every hop. Show safe surfaces and active hazards clearly, including during retries.

Study [Clockwork Hollow](../../../../docs/games/clockwork-hollow/README.md), its swept solid contact, checkpoints and camera. [Thorson and Keren](research-sources.md#movement-and-cameras) offer original examples of forgiveness and framing tradeoffs.

## Side-scrolling beat 'em up

Players expect expressive strikes, crowd control and readable spatial alignment. Ground-depth lanes, elevation, combos, knockback and gated encounters can work together, but a fighter's painted overlap is not enough to explain a hit.

Examine facing, horizontal reach, lane tolerance and height when attacks seem inconsistent. Can enemies surround the player without attacking simultaneously? Crowd coordination can preserve pressure and room for counterplay; too much waiting makes enemies look passive. Distinguish ordinary reactions, armor and recovery openings. Ground anchors and depth sorting should make feet and targets legible even during jumps and effects.

Study [Midnight Circuit](../../../../docs/games/midnight-circuit/README.md), its combat phases, attack admission and shared pose observations. [Combat feedback](research-sources.md#combat-and-feedback) and [camera research](research-sources.md#movement-and-cameras) can help when crowd density hides actionable information.

## One-on-one fighting game

Players expect spacing, attack commitment, defensive choices and punishable mistakes. Startup, active time, recovery, guard decisions, stun and resource readiness shape counterplay. An accessible command set can still support deep timing and positioning decisions.

Examine what happens on hit, guard and miss before shortening every attack. Can a defender recognize the threat and act after recovery? Do buffers preserve intent without producing unintended chains? Watch for repeated helpless corner damage and CPU responses that appear to know future input. Readable poses, guard reactions and recovery cues should explain combat without requiring a frame-data overlay.

Study [Obsidian Duel](../../../../docs/games/obsidian-duel/README.md), especially `content.ts`, `game.ts` and `cpu.ts` for move windows, trades and delayed visible observations. [Sirlin's fighting tutorials](research-sources.md#combat-and-feedback) offer a vocabulary for space and timing; adapt it to this game's rules instead of adding genre conventions automatically.

## Destructible run-and-gun

Players expect responsive movement and aiming, satisfying weapons and destruction that changes tactical space. Mutable cover, projectile contact, explosions, objectives and checkpoints form an interacting system. Weapons should offer useful choices rather than only different damage numbers.

Examine the route after cover and supporting terrain disappear: can required objectives and extraction still be reached? Do shots query the newly changed world? Common problems include stale collision, unreadable chain reactions and objectives lost behind debris. Distinguish destructible cover, structural terrain, hazards and scenery; preserve aim and target cues through explosions.

Study [Blastline](../../../../docs/games/blastline/README.md), especially its terrain, movement, combat and mission owners. [Feedback research](research-sources.md#combat-and-feedback) can help differentiate rifle contact, rockets and structural destruction; [camera research](research-sources.md#movement-and-cameras) helps expose changed routes.

For future genres, add a short section only when actual implementation yields useful expectations, tradeoffs or research. Keep game-specific mechanics and renderer details in their existing owners.
