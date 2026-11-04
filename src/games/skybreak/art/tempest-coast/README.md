# Tempest Coast artwork

[Game art direction](../../../../../docs/games/skybreak/README.md#tempest-coast-art-direction) | [Shared Quality workflow](../../../../../docs/quality-themes.md)

Quality combines complete aircraft sprites with an AI-generated aerial ocean plate, painted coastal depth and restrained Canvas atmosphere. The central flight corridor stays dark and uncluttered. The original PNG and [prompt](prompt.txt) are retained beside the optimized `backdrop.webp`.

The runtime plate is 1024 × 1536, exported as WebP at quality 90. Actors, supplies, projectiles, warning lanes and UI remain independent. The game-local preparation validates decoded dimensions before activation. Re-export complete artwork with local Chromium:

```sh
node src/games/skybreak/art/tempest-coast/pack.mjs
```

`../../presentation.ts` owns the layered scenery and complete aircraft cels, with the same uniform projection as every other mode. No graphics backend is needed for this presentation.
