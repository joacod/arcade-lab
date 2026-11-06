# Creating an Assets theme

Assets is a focused artistic pass over the playable Normal foundation. By default, give the game an old-school character through retro or pixel-inspired artwork suited to its genre and setting. Coordinate actors, objects, scenery, feedback and interface into a pleasing, cohesive look and feel. Normal may already use images; this pass is distinguished by deliberate art direction, rather than by introducing the first assets. Keep the scope focused instead of chasing Quality's modern finish. Follow the [development progression and mode contracts](architecture.md#appearance-changes) and [Normal guide](normal-themes.md); mechanics and run state stay the same.

When implementing or improving Assets, incorporate genuinely reusable lessons into this guide. Keep guidance independent of specific games, genres, models, providers and development tools; game-specific art decisions belong with the owning game. Refine outdated guidance instead of accumulating rules, improving practical usefulness without unnecessary length or restrictions.

## Inspect roles and choose a direction

Read the game's guide, presentation contract, theme data, animation observations and any existing artwork specifications. Trace how state and semantic events become visible actors, environments, interactions and feedback. Extend useful local owners and role mappings instead of inventing a shared atlas or renderer abstraction.

Write a short creative brief in the owning game's documentation. Carry the game's setting and identity into a suitable retro treatment: pixel art, classic arcade sprites or an old-school hand-drawn style, for example. Pixel art is a direction, not a file-format requirement; choose sampling and detail that suit the artwork. Choose perspective, palette, shape language and materials that work together, and preserve the visual hierarchy that makes the actions readable. Follow an explicitly requested adaptation when supplied rather than imposing the default direction.

Plan custom image coverage across all player characters, enemies and interactable objects, including their significant action and reaction states. Plan scenery images and relevant feedback alongside them. Render through Canvas 2D. Effects, UI and some scenery can remain procedural if they support the same identity. Cohesion and meaningful coverage matter more than replacing every drawn element with an image.

## Specify artwork before integrating it

Keep perspective, apparent scale, silhouettes, lighting and visual style consistent across roles and frames. Distinguish actors and interactive objects from scenery at their intended gameplay size. Reserve quiet areas for action and keep substantial decorative props outside traversable space when they could be mistaken for obstacles.

Record the technical information needed to draw and maintain each asset:

- Its semantic role, viewing angle, facing direction, transparency and sampling treatment.
- Sheet dimensions, explicit frame rectangles or inspected row/stride layout, frame count, clip timing and looping behavior.
- Anchors or pivots and intended on-screen sizes expressed through visual footprints in world units, including transparent padding.
- Movement, idle and event-reaction clips where useful, plus mirroring, rotation or directional variants supported by the artwork.

Keep independently moving complete actors, interactable objects, attack warnings and UI separate from static scenery. Do not bake a dynamic state into a background plate. Define animation from the available artwork and gameplay observations; a larger sheet does not require inventing new mechanics. Inspect the complete treatment in motion at its actual display size, where padding, frame jitter or noisy detail become visible.

Check a looping walk or run as a complete stride, with opposite contacts, passing poses and stable boot anchors. Match stride distance to the depicted step length and keep the upper-body guard compatible with idle and combat. Verify that the two contact poses actually exchange the near and far leg. Keep idle separate from the moving cycle; inserting a standing pose between extended strides can produce a visible snap. Drive travel phase from grounded displacement so stopping, reversing, jumping and pausing preserve coherent footwork.

Prefer complete character cels with pose-specific silhouettes, foreshortening, cloth and connected anatomy. Do not reconstruct characters from independently drawn limbs or mesh parts. Depth can be painted or pre-rendered into sprites. Renderers share semantic action observations and clip timing without requiring a common rig. Align anticipation, contact and recovery drawings to the simulation's actual windows, use a stable pivot across frames, and avoid stretching anatomy to match attack reach. Inspect planted feet and transitions as well as the contact pose.

Full-body cels should read as one drawn figure, including in an idle stance. Continuous contours, connected joint anatomy, garment folds and consistent volume establish that cohesion; storing separately outlined limbs in one cell does not. Let the illustration define its silhouette and proportions while sharing the game's semantic action timing. Assess a representative standing pose and an attack sequence before expanding the complete set.

## Prepare and replace within existing owners

Commit all required artwork in the owning game's `art/` folder and import its URLs locally. Check redistribution rights and retain required credits and license notices alongside third-party artwork. A fresh clone must run the presentation without regeneration or external services.

Keep role definitions and frame validation game-local. Reuse `src/engine/browser/images.ts` for cancellable image preparation and source release, supplying the game's validator for decoded dimensions, referenced frames and visual metadata. See [extending a mode](architecture.md#extending-a-mode) for request validity, candidate activation, cancellation, failure and disposal ownership.

Source dimensions, anchors, animation timing and draw footprints are cosmetic. Never derive physical collision bodies from them or change geometry to fit artwork. Switching preserves the existing run, rules, positions, gameplay timers and progression. Keep the working presentation visible while preparing a candidate; failed or superseded work must not replace it.

## Preserve the direction and assess the result

Keep editable illustration sources, creative briefs, useful prompts, frame layouts, export settings and role specifications with the game. Packing, resizing and atlas tools may prepare complete drawings; they should not recreate actors from body parts. Keep scenery/effect generators when useful. Document how to edit or regenerate committed outputs as an artwork maintenance step, separate from runtime loading. Keep instructions focused on the intended visual result rather than a particular production tool or provider.

Compare with Normal at gameplay size: the important roles and environment should form a thoughtfully directed retro presentation while actions and state remain readable. A new setting, new mechanics or a renderer change is not needed to make this pass worthwhile. Use the [shared local checks](architecture.md#local-verification) and existing appearance checks to verify retained gameplay state and resource cleanup. An established Assets direction provides the foundation for a later [Quality pass](quality-themes.md).
