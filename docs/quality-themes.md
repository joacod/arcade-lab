# Creating a Quality theme

Quality is the polished modern visual interpretation of the established game: exceptional artwork, composition, animation, materials, lighting, atmosphere, effects and interface. Aim for a clear visual step beyond Assets' retro treatment while preserving the game's setting and identity, unless the user explicitly requests a different adaptation. Modern describes visual craft and finish, not a futuristic setting or a requirement for photorealism. A western should have beautifully realized western characters and scenery; other genres deserve the same attention to their own fiction.

Build around high-quality custom image assets for players, enemies and interactive objects, with complete sprites and authored action cels. Painted or pre-rendered 3D artwork can add volume and material richness when it suits the direction; neither is mandatory. Reuse strong artwork where it meets the brief. Give the scene memorable visual moments through composition, animated backgrounds, expressive action, atmosphere or well-chosen effects. Quality can be delivered entirely with images and Canvas 2D. A graphics library is optional and earns its place through a visible benefit that justifies its complexity and runtime cost.

Follow the [development progression and mode contracts](architecture.md#appearance-changes), normally after gameplay is established and the Assets direction has been explored. Keep mechanics unchanged and game-specific art direction and implementation details in the owning game's guide and `art/` documentation.

When implementing or improving Quality, incorporate genuinely reusable lessons into this guide. Keep guidance independent of specific games, genres, rendering technologies, models, providers and development tools; game-specific art decisions belong with the owning game. Refine outdated guidance instead of accumulating rules, improving practical usefulness without unnecessary length or restrictions.

## Establish the direction

Read the game's guide, simulation/content boundaries, presentation, appearance preparation, assets, generators and existing browser checks. Identify which owners can be extended and which concrete responsibilities need a new local boundary. Preserve useful role mappings, sprite templates and authored footprints. Keep editable original sources when adding another presentation.

Write a brief in the game guide before polishing individual effects:

- A modern visual treatment of the game's established setting and identity, with a palette and materials that work together. Record a different adaptation only when explicitly requested.
- The visual hierarchy: gameplay-critical characters, objects, objectives and cues, then environment and decoration. Specify where scenery must stay quiet and how roles differ in silhouette as well as color.
- The treatment of important characters and objects, the environment, feedback and interface. Cover significant gameplay transitions and outcomes.
- The animation language: authored sprite clips, anticipation, contact, recovery, movement response, interactions and feedback where applicable. Separate cosmetic motion from movement that communicates gameplay.
- One or a few memorable visual moments that fit the game, such as moving scenery, expressive action animation, atmospheric depth or a striking event response. Keep them subordinate to readable play.
- The artwork and simplest rendering approach needed to deliver that identity. Explain the concrete visual benefit if adding a graphics library, plus the behavior when preparation or graphics fails.

Use game and asset sites as inspiration for composition, role differentiation, scale, animation and asset layouts. Adapt useful template structures when generating assets. Keep inspiration links when they help future artwork.

## Choose assets and rendering together

Choose the artwork first, then the simplest renderer that presents it well. Complete custom sprites and cels carry character design, anatomy, costume, silhouette and action. Do not replace good sprites with runtime body-part assembly, cut-up limb sprites, procedural skeleton drawings or mesh rigs. Use actual 3D actors only when the user explicitly requests them for the game. Painted or pre-rendered 3D sprites can supply convincing volume without that complexity.

Canvas can deliver detailed layered artwork, animation, light, mist, reflections and expressive contact effects. Start there when it serves the direction. Three.js or vgpu/WebGPU can add depth, atmosphere, lighting, particles, distortion or transitions when they work well with the artwork and make a worthwhile improvement over a simpler image-based approach. Choose a specific visual result before choosing a library; adding a backend, bloom or more particles alone does not establish Quality. Keep expensive code and asset requests behind the selected mode's preparation boundary.

Custom is for an explicitly requested, documented experimental presentation, such as exploring a shader-driven visual identity. A technology experiment can belong there when that is the requested objective. Three.js or vgpu does not automatically make a mode Custom, and Quality does not require either. Keep experiments outside the standard progression; use the [mode contract](architecture.md#mode-contract) for their availability and naming.

For raster artwork, define its role before creating it. A background plate should leave gameplay-critical areas quiet and keep dynamic actors, objects, cues and UI separate. A sprite needs a clear camera angle, orientation, transparent background, frame layout, anchors and intended on-screen size. Keep independently moving whole actors and objects separate from scenery; do not split a character into anatomical pieces. Reuse the game's atlas contract when suitable. Inspect output at its gameplay size; a beautiful source image can become noisy or unreadable in motion.

Describe AI-generated images simply as AI-generated. Retain useful creative briefs, prompts, asset specifications (dimensions, export settings and intended roles), layouts and editable sources to reproduce the intended visual result with appropriate tools. Omit generation tools, models, providers, harnesses, services, versions and production dates. Preserve code-native artwork or its generator. Keep regeneration separate from runtime loading; a fresh clone must work without generation services. Optimize the shipped image after visual inspection and validate its decoded dimensions before activation.

## Build one coherent presentation

Keep one authoritative uniform world-to-screen transform. Orthographic geometry can add depth without moving projected collision centers. Decorative depth, shapes, shadows, glow and screen-space effects never determine physical geometry. Avoid camera shake or parallax on collision-critical layers. Multiple layers should consume the same run, semantic action samples and transform rather than independently reconstructing anatomy or gameplay cues.

Build the readable scene first, then add polish. Detailed silhouettes and material separation should remain legible without bloom. Reserve bright accents for important actions, interactions and state changes, and broad low-contrast forms for scenery. Keep hazards, objectives, warnings and interaction markers readable above atmospheric effects. Match HUD/menu colors, surfaces and accents to the scene without adding graphics controls to gameplay setup.

Follow the [shared presentation timing and reduced-motion rules](architecture.md#presentation-timing-and-motion). Choose which decorative layers to suppress without freezing gameplay-critical positions or hiding warnings.

Bound particles, trails, temporary lights and history buffers. Cache expensive scenery, reuse atlas images, batch compatible sprite/effect draws and recycle temporary presentation objects where this saves allocation. Share geometry/materials when the environment or effects actually need them. Size procedurally generated textures from their displayed footprint and cap both axes. Cap render-target resolution independently of display DPR, especially for bloom. Optimizations must preserve visual hierarchy and collision alignment.

## Replace and recover safely

Follow the [shared replacement and recovery contract](architecture.md#replacement-and-recovery) for candidate validation, cancellation, resource release, graphics loss and Canvas state recovery. Keep Quality’s renderer-specific resource ownership and capability fallbacks in the owning game’s guide.

## Verify the delivered experience

Run the [shared local checks](architecture.md#local-verification). Extend existing Chromium coverage for the resource boundary rather than building a screenshot matrix. Compare the paused serialized run before/after a theme change, confirm Resume advances it and Restart keeps the selection. Exercise cancellation, failed preparation, completion after unmount, graphics failure, recovery and resource release. Check that Normal does not request the Quality renderer or images.

Inspect a real gameplay capture at the intended display size and a demanding scene relevant to the game, such as overlapping characters and effects, dense interaction cues or an important gameplay transition. Check narrow/fullscreen sizing through existing layout coverage. Inspect reduced motion and pause behavior. Use captures to find and fix concrete composition or readability problems. Keep useful screenshots beside the game guide and report local verification in the task response. Project docs describe usage and maintenance without manual sign-off or acceptance reports.
