# Creating a Quality theme

Quality is a complete visual direction for an existing game: composition, actors, environment, animation, materials, lighting, effects and interface. A renderer upgrade or a new palette alone does not complete it. Follow the [mode and ownership contracts](architecture.md#appearance-changes); keep game-specific art direction and implementation details in the owning game's guide and `art/` documentation.

When creating or improving a Quality presentation, incorporate genuinely reusable lessons into this guide. Keep guidance independent of specific games, genres, renderers and generation tools. Record game-specific decisions in the owning game's documentation. Refine or replace outdated guidance rather than continually appending new rules.

## Establish the direction

Read the game's guide, simulation/content boundaries, presentation, appearance preparation, assets, generators and existing browser checks. Identify which owners can be extended and which concrete responsibilities need a new local boundary. Preserve useful role mappings, sprite templates and authored footprints. Keep editable original sources when adding another presentation.

Write a brief in the game guide before polishing individual effects:

- A named setting and visual identity, with a palette and materials that work together.
- The visual hierarchy: gameplay-critical characters, objects, objectives and cues, then environment and decoration. Specify where scenery must stay quiet and how roles differ in silhouette as well as color.
- The treatment of important characters and objects, the environment, feedback and interface. Cover significant gameplay transitions and outcomes.
- The animation language: movement response, articulated parts, attacks, interactions and feedback where applicable. Separate cosmetic motion from movement that communicates gameplay.
- The renderer and asset choices needed to deliver that identity, plus the behavior when preparation or graphics fails.

Use game and asset sites as inspiration for composition, role differentiation, scale, animation and asset layouts. Adapt useful template structures when generating assets. Keep inspiration links when they help future artwork.

## Choose assets and rendering together

Use the least complicated combination that delivers the intended result. Canvas supports detailed layered artwork, lighting and animation. Three.js helps with sculpted geometry, materials, articulation and lighting. vgpu/WebGPU helps when a specific shader, field, particle system or finish warrants it. Existing dependencies are available tools, not requirements to use every backend. Keep expensive code and asset requests behind the selected mode's preparation boundary.

For raster artwork, define its role before creating it. A background plate should leave gameplay-critical areas quiet and keep dynamic actors, objects, cues and UI separate. A sprite needs a clear camera angle, orientation, transparent background, frame layout, anchors and intended on-screen size. Keep independently moving elements separable. Reuse the game's atlas contract when suitable. Inspect output at its gameplay size; a beautiful source image can become noisy or unreadable in motion.

Describe AI-generated images simply as AI-generated. Retain useful creative briefs, prompts, asset specifications (dimensions, export settings and intended roles), layouts and editable sources to reproduce the intended visual result with appropriate tools. Omit generation tools, models, providers, harnesses, services, versions and production dates. Preserve code-native artwork or its generator. Keep regeneration separate from runtime loading; a fresh clone must work without generation services. Optimize the shipped image after visual inspection and validate its decoded dimensions before activation.

## Build one coherent presentation

Keep one authoritative uniform world-to-screen transform. Orthographic geometry can add depth without moving projected collision centers. Decorative depth, shapes, shadows, glow and screen-space effects never determine physical geometry. Avoid camera shake or parallax on collision-critical layers. Multiple layers should consume the same run and transform rather than independently reconstructing poses or gameplay cues.

Build the readable scene first, then add polish. Detailed silhouettes and material separation should remain legible without bloom. Reserve bright accents for important actions, interactions and state changes, and broad low-contrast forms for scenery. Keep hazards, objectives, warnings and interaction markers readable above atmospheric effects. Match HUD/menu colors, surfaces and accents to the scene without adding graphics controls to gameplay setup.

Drive effects from semantic events and age them in active simulation time. Pausing freezes gameplay effects and environmental drift. Title animation can use separate cosmetic time. Reduced motion suppresses decorative drift, spin, trails, shockwaves and flashes while preserving gameplay-critical movement, warnings and state cues. Do not freeze a gameplay position because it looks like animation.

Bound particles, trails, temporary lights and history buffers. Cache expensive scenery, share geometry/materials, batch compatible static parts and recycle actors where this saves allocation. Cap render-target resolution independently of display DPR, especially for bloom. Optimizations must preserve visual hierarchy and collision alignment.

## Replace and recover safely

Use the session host and its frame loop. Keep the current presentation visible during loading, imports and graphics preparation. Validate images, construct a detached candidate, and draw it against the current run before committing it. Check request validity after every await. Dispose superseded candidates, failed construction resources and late completions. Release the old renderer and images after a successful commit. If starting/resuming cancels pending preparation, restore the selector and status to the active mode.

Treat image sources, textures, geometries, materials, postprocessing passes, render targets, listeners and graphics contexts as explicit owned resources. Context loss or draw failure must suspend play, restore a working presentation and report recovery through existing status UI. Preserve the run and require explicit Resume. A failed candidate retains the previous mode. A capability fallback within Quality must preserve its visual direction; otherwise restore an available mode and reflect it in the selector.

## Verify the delivered experience

Run the [shared local checks](architecture.md#local-verification). Extend existing Chromium coverage for the resource boundary rather than building a screenshot matrix. Compare the paused serialized run before/after a theme change, confirm Resume advances it and Restart keeps the selection. Exercise cancellation, failed preparation, completion after unmount, graphics failure, recovery and resource release. Check that Normal does not request the Quality renderer or images.

Inspect a real gameplay capture at the intended display size and a demanding scene relevant to the game, such as overlapping characters and effects, dense interaction cues or an important gameplay transition. Check narrow/fullscreen sizing through existing layout coverage. Inspect reduced motion and pause behavior. Use captures to find and fix concrete composition or readability problems. Keep useful screenshots beside the game guide and report local verification in the task response. Project docs describe usage and maintenance without manual sign-off or acceptance reports.
