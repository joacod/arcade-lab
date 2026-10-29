# Creating a Quality theme

Quality is a complete visual direction for an existing game: composition, actors, environment, animation, materials, lighting, effects and interface. A renderer upgrade or a new palette alone does not complete it. Follow the [mode and ownership contracts](architecture.md#appearance-changes); keep game-specific art direction and implementation details in the owning game's guide and `art/` documentation.

## Establish the direction

Read the game's guide, simulation/content boundaries, presentation, appearance preparation, assets, generators and existing browser checks. Identify which owners can be extended and which concrete responsibilities need a new local boundary. Preserve useful role mappings, sprite templates and authored footprints. Keep editable original sources when adding another presentation.

Write a brief in the game guide before polishing individual effects:

- A named setting and visual identity, with a palette and materials that work together.
- The visual hierarchy: player, threats, objectives, warnings, environment and decoration. Specify where scenery must stay quiet and how roles differ in silhouette as well as color.
- The treatment of every important actor, the environment, combat feedback, milestones and interface. Include the late-game encounter, pickups and results.
- The animation language: movement response, articulated parts, propulsion, impacts and outcomes. Separate cosmetic motion from movement that communicates gameplay.
- The renderer and asset choices needed to deliver that identity, plus the behavior when preparation or graphics fails.

Use game and asset sites as inspiration for composition, role differentiation, scale, animation and asset layouts. Adapt useful template structures when generating assets. Keep inspiration links when they help future artwork.

## Choose assets and rendering together

Use the least complicated combination that delivers the intended result. Canvas supports detailed layered artwork, lighting and animation. Three.js helps with sculpted geometry, materials, articulation and lighting. vgpu/WebGPU helps when a specific shader, field, particle system or finish warrants it. Existing dependencies are available tools, not requirements to use every backend. Keep expensive code and asset requests behind the selected mode's preparation boundary.

For generated raster artwork, define its production role before generating it. A background plate should leave the combat corridor quiet and contain no baked-in ships, bullets or UI. A sprite needs a clear camera angle, orientation, transparent background, frame layout, anchors and intended on-screen size. Keep independently moving elements separable. Reuse the game's atlas contract when suitable. Inspect output at its gameplay size; a beautiful source image can become noisy or unreadable in motion.

Describe generated images as AI-generated and keep their useful prompts, dimensions, export settings and intended roles. The generation tool, model and production date do not belong in artwork docs. Commit the final assets with the game. Preserve editable code-native artwork or its generator. Keep regeneration separate from runtime loading; a fresh clone must work without generation services. Optimize the shipped image after visual inspection and validate its decoded dimensions before activation.

## Build one coherent presentation

Keep one authoritative uniform world-to-screen transform. Orthographic geometry can add depth without moving projected collision centers. Decorative depth, wings, shadows, glow and screen-space effects never determine physical geometry. Avoid camera shake or parallax on collision-critical layers. Multiple layers should consume the same run and transform rather than independently reconstructing poses or warnings.

Build the readable scene first, then add polish. Detailed silhouettes and material separation should remain legible without bloom. Use bright light for engines, weak points and important impacts; reserve broad low-contrast forms for scenery. Keep bullets, attack lanes, pickups and interaction markers above atmospheric effects. Match HUD/menu colors, surfaces and accents to the scene without adding graphics controls to gameplay setup.

Drive effects from semantic events and age them in active simulation time. Pausing freezes trails, explosions, damage feedback and environmental drift. Title animation can use separate cosmetic time. Reduced motion suppresses decorative drift, banking, roll spin, trails, shockwaves and flashes while preserving threats, attack warnings, protection cues and moving weak points. Do not freeze a gameplay position because it looks like animation.

Bound particles, trails, temporary lights and history buffers. Cache expensive scenery, share geometry/materials, batch compatible static parts and recycle actors where this saves allocation. Cap render-target resolution independently of display DPR, especially for bloom. Optimizations must preserve visual hierarchy and collision alignment.

## Replace and recover safely

Use the session host and its frame loop. Keep the current presentation visible during loading, imports and graphics preparation. Validate images, construct a detached candidate, and draw it against the current run before committing it. Check request validity after every await. Dispose superseded candidates, failed construction resources and late completions. Release the old renderer and images after a successful commit. If starting/resuming cancels pending preparation, restore the selector and status to the active mode.

Treat image sources, textures, geometries, materials, postprocessing passes, render targets, listeners and graphics contexts as explicit owned resources. Context loss or draw failure must suspend play, restore a working presentation and report recovery through existing status UI. Preserve the sortie and require explicit Resume. A failed candidate retains the previous mode. A capability fallback within Quality must preserve its visual direction; otherwise restore an available mode and reflect it in the selector.

## Verify the delivered experience

Run the [shared local checks](architecture.md#local-verification). Extend existing Chromium coverage for the resource boundary rather than building a screenshot matrix. Compare the paused serialized run before/after a theme change, confirm Resume advances it and Restart keeps the selection. Exercise cancellation, failed preparation, completion after unmount, graphics failure, recovery and resource release. Check that Normal does not request the Quality renderer or images.

Inspect a real gameplay capture at the intended display size and a targeted demanding scene: overlapping actors, bullets, pickups, warnings and the final encounter. Check narrow/fullscreen sizing through existing layout coverage. Inspect reduced motion and pause behavior. Use captures to find and fix concrete composition or readability problems. Keep useful screenshots beside the game guide and report local verification in the task response. Project docs describe usage and maintenance without manual sign-off or acceptance reports.
