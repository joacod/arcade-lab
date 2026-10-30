# Creating an Assets theme

Assets gives an established game a cohesive authored identity through image artwork. Aim for a substantial visual transformation from Normal, beyond a palette change or a few swapped sprites. Follow the [development progression and mode contracts](architecture.md#appearance-changes); build on the playable foundation described in the [Normal guide](normal-themes.md).

When implementing or improving Assets, incorporate genuinely reusable lessons into this guide. Keep guidance independent of specific games, genres, rendering technologies, models, providers and development tools; game-specific art decisions belong with the owning game. Refine outdated guidance instead of accumulating rules, improving practical usefulness without unnecessary length or restrictions.

## Inspect roles and choose a direction

Read the game's guide, presentation contract, theme data, animation observations and any existing artwork specifications. Trace how state and semantic events become visible actors, environments, interactions and feedback. Extend useful local owners and role mappings instead of inventing a shared atlas or renderer abstraction.

Write a short creative brief in the owning game's documentation. Choose a setting, perspective, palette, shape language and treatment of materials that work together. Retro, pixel-art, illustrated and other styles are valid; choose what suits the game. Preserve the visual hierarchy that makes its actions readable.

Plan coverage across significant characters, enemies, environments, interactable objects, animations and relevant feedback. Decide which roles need sprites or scenery images and which benefit from procedural drawing. Effects, UI and some scenery can remain procedural if they support the same identity. Cohesion and meaningful coverage matter more than replacing every drawn element with an image.

## Specify artwork before integrating it

Keep perspective, apparent scale, silhouettes, lighting and visual style consistent across roles and frames. Distinguish actors and interactive objects from scenery at their intended gameplay size. Reserve quiet areas for action and keep substantial decorative props outside traversable space when they could be mistaken for obstacles.

Record the technical information needed to draw and maintain each asset:

- Its semantic role, viewing angle, facing direction, transparency and sampling treatment.
- Sheet dimensions, explicit frame rectangles or inspected row/stride layout, frame count, clip timing and looping behavior.
- Anchors or pivots and intended on-screen sizes expressed through visual footprints in world units, including transparent padding.
- Movement, idle and event-reaction clips where useful, plus mirroring, rotation or directional variants supported by the artwork.

Keep independently moving actors, articulated parts, interactable objects, attack warnings and UI separate from static scenery. Do not bake a dynamic state into a background plate. Define animation from the available artwork and gameplay observations; a larger sheet does not require inventing new mechanics. Inspect the complete treatment in motion at its actual display size, where padding, frame jitter or noisy detail become visible.

Choose the animation representation for the action. Separate part images suit some designs; complete character cels allow pose-specific silhouettes, foreshortening and cloth. Renderers can share semantic action observations without sharing a rig. Align anticipation, contact and recovery drawings to the simulation's actual windows, use a stable pivot across frames, and avoid stretching anatomy to match attack reach. Inspect planted feet and transitions as well as the contact pose.

Full-body cels should read as one drawn figure, including in an idle stance. Continuous contours, connected joint anatomy, garment folds and consistent volume establish that cohesion; storing separately outlined limbs in one cell does not. Let the illustration define its silhouette and proportions while sharing the game's semantic action timing. Assess a representative standing pose and an attack sequence before expanding the complete set.

## Prepare and replace within existing owners

Commit all required artwork in the owning game's `art/` folder and import its URLs locally. Check redistribution rights and retain required credits and license notices alongside third-party artwork. A fresh clone must run the presentation without regeneration or external services.

Keep role definitions and frame validation game-local. Reuse `src/engine/browser/images.ts` for cancellable image preparation and source release, supplying the game's validator for decoded dimensions, referenced frames and visual metadata. See [extending a mode](architecture.md#extending-a-mode) for request validity, candidate activation, cancellation, failure and disposal ownership.

Source dimensions, anchors, animation timing and draw footprints are cosmetic. Never derive physical collision bodies from them or change geometry to fit artwork. Switching preserves the existing run, rules, positions, gameplay timers and progression. Keep the working presentation visible while preparing a candidate; failed or superseded work must not replace it.

## Preserve the direction and assess the result

Keep editable sources or code-native generators, creative briefs, useful prompts, frame layouts, export settings and role specifications with the game. Document how to edit or regenerate committed outputs as an artwork maintenance step, separate from runtime loading. Keep instructions focused on the intended visual result rather than a particular production tool or provider.

Compare with Normal at gameplay size: the important roles and environment should now form a distinct, thoughtfully directed presentation while actions and state remain readable. Use the [shared local checks](architecture.md#local-verification) and existing appearance checks to verify retained gameplay state and resource cleanup. An established Assets direction provides the foundation for a later [Quality pass](quality-themes.md).
