# Tempest Coast scenery

[Coastal sortie direction and contracts](../coastal-sortie/README.md) | [Shared Quality workflow](../../../../../docs/quality-themes.md)

The AI-generated orthographic ocean tile supplies painted sea, rocky shoals and palms along the margins. The central corridor stays dark and uncluttered. Aircraft, clouds, pickups and combat cues are separate images or semantic overlays. The original PNG and [prompt](prompt.txt) are retained beside the optimized `backdrop.webp`.

The runtime image is 1024 × 1536, exported as WebP at quality 90. `../../presentation.ts` scrolls the coast downward through the shared world projection, blending an 80-world-unit incoming edge over the previous tile. This preserves continuous travel instead of stretching a fixed vista behind the aircraft. Reduced motion fixes its travel position.

```sh
node src/games/skybreak/art/tempest-coast/pack.mjs
```

The owning game's preparation validates decoded dimensions before activation. Source export is an artwork maintenance step and is never required at runtime.
