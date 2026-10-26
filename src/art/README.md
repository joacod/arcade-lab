# Local artwork

`woodland.svg` and `moonglass.svg` are original Arcade Lab vector drawings created for this application, covered by the repository's MIT license. No borrowed artwork, fonts, recordings or external asset services are used. Ground marks, silhouettes and effects are original Canvas 2D drawing code. Sound is synthesized locally with Web Audio.

Each sheet holds three right-facing actor frames: Keeper, crawler, elite. Woodland uses 64×64 frames; Moonglass uses 80×80 frames with different silhouettes and transparent padding. `src/themes.ts` defines each frame, center anchor and draw scale. At their authored scales the sheets occupy 32/32/48 world units, independently of the physical radii (10/11/18) in `src/content.ts`. Cloaks, legs, light halos and crystal tips are decorative. Replace frames and anchors together; padding must never change gameplay collision.

Vite bundles these local SVGs (including inlining small sheets). The image loader validates frame extents against the decoded image before making it drawable. A missing, undecodable or invalid sheet displays a status message and colored body silhouettes, preserving the arena and all mechanics. A newer selection or session disposal invalidates pending completions.
