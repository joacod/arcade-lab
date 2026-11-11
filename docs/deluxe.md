# Creating a Deluxe theme

Deluxe is an optional substantial modern art upgrade of the Arcade direction. Use Arcade as a design reference for character identities, setting, visual roles and readable action, then create new or substantially improved artwork with exceptional form, materials, animation and finish. Preserve the fiction and recognizable cast, not the original pixels. Redrawing an established knight, creature or object in a richer modern style is part of the Deluxe pass.

Plan the principal actor, interactive-object and environment assets together. Strong existing artwork may remain when it already meets the intended finish, but keeping its files is not an objective. A new background behind unchanged low-resolution actors, enlarged or smoothed sprites, color grading, glow or additional particles is not a sufficient Deluxe upgrade. Establish the quality of the artwork itself before adding effects. The whole visible scene, including perimeter props, spells and interface, must share a coherent visual language. Use complete custom image sprites and authored action cels; painted or pre-rendered artwork can provide dimensional richness without actual 3D actors. Use Canvas 2D for runtime rendering.

Follow the [development progression and mode contracts](architecture.md#appearance-changes), normally after gameplay is established and the Arcade direction has been explored. Keep mechanics unchanged and game-specific art direction and implementation details in the owning game's guide and `art/` documentation.

When implementing or improving Deluxe, incorporate genuinely reusable lessons into this guide. Keep guidance independent of specific games, genres, models, providers and development tools; game-specific art decisions belong with the owning game. Refine outdated guidance instead of accumulating rules, improving practical usefulness without unnecessary length or restrictions.

## Establish the direction

Read the game's guide, simulation/content boundaries, presentation, appearance preparation, assets, generators and existing browser checks. Identify which owners can be extended and which concrete responsibilities need a new local boundary. Preserve useful role mappings, sprite templates and authored footprints. Keep editable original sources when adding another presentation.

Write a brief in the game guide before polishing individual effects:

- The character identities, setting and visual roles carried forward from Arcade, the new or upgraded artwork required, and a concrete modern art target. Distinguish preserving a design from retaining its source pixels. Record a different setting or adaptation only when explicitly requested.
- The visual hierarchy: gameplay-critical characters, objects, objectives and cues, then environment and decoration. Specify where scenery must stay quiet and how roles differ in silhouette as well as color.
- The treatment of important characters and objects, the environment, feedback and interface. Cover significant gameplay transitions and outcomes.
- The animation language: authored sprite clips, anticipation, contact, recovery, movement response, interactions and feedback where applicable. Separate cosmetic motion from movement that communicates gameplay.
- One or a few memorable visual moments that fit the game, such as moving scenery, expressive action animation, atmospheric depth or a striking event response. Keep them subordinate to readable play.
- The artwork, Canvas layers and effects needed to deliver that identity, plus the behavior when image preparation or drawing fails.

Use game and asset sites as inspiration for composition, role differentiation, scale, animation and asset layouts. Adapt useful template structures when generating assets. Keep inspiration links when they help future artwork.

## Choose assets and rendering together

Compare directly with Arcade at gameplay size. The main characters and interactive objects should show a clear improvement in authored form, material definition and animation, before lighting or postprocessing is applied. Preserve useful anchors and semantic timing while giving new illustrations room for their own silhouettes and proportions. Assess a representative new actor and environment prop together before expanding the set. Do not mix enlarged retro props with modern painted characters or scenery unless that combination is an explicitly chosen, coherent art direction. Complete custom sprites and cels carry character design, anatomy, costume, silhouette and action. Do not replace good sprites with runtime body-part assembly, cut-up limb sprites, procedural skeleton drawings or mesh rigs. Painted or offline pre-rendered 3D sprites can supply convincing volume.

Canvas 2D delivers detailed layered artwork, animation, light, mist, reflections and expressive contact effects. Compose transforms, gradients, image layers and blending around the artwork. Choose a specific visual result before adding effects; more glow or particles alone does not establish Deluxe. Keep expensive code and image requests behind the selected mode's preparation boundary.

For raster artwork, define its role before creating it. A background plate should leave gameplay-critical areas quiet and keep dynamic actors, objects, cues and UI separate. Match scenery to the core action: for traversal, plan travel direction, relative depth speeds and loop seams as part of the artwork contract. The environment should communicate movement at gameplay scale, with decorative motion subordinate to readable hazards. A sprite needs a clear camera angle, orientation, transparent background, frame layout, anchors and intended on-screen size. Keep independently moving whole actors and objects separate from scenery; do not split a character into anatomical pieces. Reuse the game's atlas contract when suitable. Inspect output at its gameplay size; a beautiful source image can become noisy or unreadable in motion.

Describe AI-generated images simply as AI-generated. Retain useful creative briefs, prompts, asset specifications (dimensions, export settings and intended roles), layouts and editable sources to reproduce the intended visual result with appropriate tools. Omit generation tools, models, providers, harnesses, services, versions and production dates. Preserve code-native artwork or its generator. Keep regeneration separate from runtime loading; a fresh clone must work without generation services. Optimize the shipped image after visual inspection and validate its decoded dimensions before activation.

Match visible silhouettes and their registration to the established gameplay scale, rather than comparing source-canvas dimensions. If the art must read smaller, redesign proportions, material shapes and detail for that size. Keep the gameplay anchor distinct from an authored foot-contact point. Preserve registered pivots across an animation sequence; aligning every cel by its lowest opaque pixel can erase intended passing poses and create sliding. Check body-centered spells and protective outlines against the full silhouette without moving their physical geometry.

## Build one coherent presentation

Keep one authoritative uniform world-to-screen transform. Painted perspective and layered scenery can add depth without moving projected collision centers. Decorative depth, shapes, shadows, glow and screen-space effects never determine physical geometry. Avoid camera shake or parallax on collision-critical layers. Multiple layers should consume the same run, semantic action samples and transform rather than independently reconstructing anatomy or gameplay cues.

Build the readable scene first, then add polish. Detailed silhouettes and material separation should remain legible without bloom. Reserve bright accents for important actions, interactions and state changes, and broad low-contrast forms for scenery. Keep hazards, objectives, warnings and interaction markers readable above atmospheric effects. Match HUD/menu colors, surfaces and accents to the scene without adding graphics controls to gameplay setup.

Follow the [shared presentation timing and reduced-motion rules](architecture.md#presentation-timing-and-motion). Choose which decorative layers to suppress without freezing gameplay-critical positions or hiding warnings.

Bound particles, trails, temporary lights and history buffers. Cache expensive scenery, reuse atlas images, batch compatible sprite/effect draws and recycle temporary presentation objects where this saves allocation. Size cached canvases and light stamps from their displayed footprint and cap both axes. Bound backing-buffer resolution independently of display DPR when needed. Optimizations must preserve visual hierarchy and collision alignment.

Use standard image smoothing for live Canvas transforms. Perform expensive image resampling during asset preparation or when building a bounded cache instead of enabling high-quality filtering across every frame. Profile actual gameplay at large display sizes and high DPR: short JavaScript draw calls can still queue costly graphics work, so compare frame delivery as well as callback duration.

## Replace and recover safely

Follow the [shared replacement and recovery contract](architecture.md#replacement-and-recovery) for candidate validation, cancellation, resource release, draw failure and Canvas state recovery. Keep Deluxe’s local resource ownership and recovery behavior in the owning game’s guide.

## Verify the delivered experience

Follow the [testing policy](../AGENTS.md#testing-policy) and run the relevant [local checks](architecture.md#local-verification). Reuse the representative presentation-switching browser check and deterministic preparation, readiness and rollback tests. A new Deluxe presentation does not automatically need browser scenarios for every failure, restart or disposal path. Add or replace a focused check only for a specific regression that existing coverage cannot protect at a cheaper layer.

Compare real Arcade and Deluxe gameplay at the intended display size, including the main actors and arena edges. Reject a pass whose visible improvement comes mainly from the background or effects. Inspect locomotion and neutral airborne frames separately from attack clips; extra atlas columns do not guarantee distinct, coherent poses. Inspect a real gameplay capture and a demanding scene relevant to the game, such as overlapping characters and effects, dense interaction cues or an important gameplay transition. Inspect narrow/fullscreen sizing on demand. Inspect reduced motion and pause behavior. Use captures to find and fix concrete composition or readability problems. Keep useful screenshots beside the game guide and report local verification in the task response. Project docs describe usage and maintenance without manual sign-off or acceptance reports.

Reuse Arcade’s primary Canvas pipeline, camera, semantic animation and resource handling where practical. Add local specialized scenery or effects only when their visual contribution justifies it. Keep Arcade complete and independently playable. A Deluxe draw failure recovers to Arcade through the [shared recovery workflow](architecture.md#replacement-and-recovery); Prototype is already retired.
