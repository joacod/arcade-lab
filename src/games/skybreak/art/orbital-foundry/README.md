# Orbital Foundry artwork

Quality uses editable Three.js fleet models in `../../quality/models.ts`, orbital machinery in `../../quality/foundry.ts`, and an AI-generated background in `backdrop.webp`. The models retain the fleet's approximate drawing footprints and north-facing construction convention. Physical geometry remains in gameplay content.

## Background production

- Dimensions: 1024 × 1536. Runtime format: WebP, quality 90, approximately 174 KiB.
- Role: one distant background plate. Actors, projectiles, pickups, warnings, interface, foreground machinery and effects are independent runtime layers.
- Composition: left-edge planet and distant diagonal ring, dark combat corridor, restrained edge dust and stars.
- Use the prompt below when creating a replacement; generation is an artwork maintenance step, separate from running or building the game.
- For changes, preserve dimensions or update the game-local validator in `../../app.ts`. Inspect the new plate behind real combat before replacing it.

### Background generation prompt

```text
Use case: stylized-concept
Asset type: original production background plate for Skybreak, a portrait top-down orbital arcade shooter.
Create a premium, cinematic, richly textured deep-space environment, portrait 1024x1536. A monumental icy turquoise planet crescent occupies the far left edge in the upper half, its curve extending out of frame. Elegant diffuse blue atmospheric limb and very fine cloud bands. A distant ancient orbital ring arcs diagonally from upper left to right edge, extremely subdued and partly lost in mist, with occasional tiny amber habitat lights. Bottom right and upper right have wisps of smoky teal and petrol-blue interstellar dust, distant pinprick stars. Far lower left has a few tiny distant shattered station silhouettes. Expansive dark navy negative space across the central 70 percent and lower center MUST remain quiet and dark for fast moving game bullets. Deliberately asymmetric, sophisticated photographic science-fiction matte painting, convincing astronomical scale, subtle grain and detailed naturalistic materials, restrained light. Deep navy black, desaturated petrol teal, icy cyan, very sparse old-gold highlights. Soft distant environment, no strong sharp foreground contrast. All bright astronomical features stay at edges.
No spacecraft, fighters, enemies, projectiles, explosions, interface, text, logos, symbols, watermarks or borders. This is a background layer, NOT a screenshot or complete game composition.
```

## Editable model template

`createFoundryModels` builds all five aircraft roles and the flagship from authored beveled plates and fittings. Parts batch by material and share their resulting geometry across live ships. Engine plumes remain separate shader planes. Model source coordinates are gameplay-style XY; the helper maps Y to Three.js's upward axis and uses Z only for decorative height. Hostile ships turn south at their root. Articulated flagship nacelles use inverse local offsets so their projected positions match the simulation's weak points.

Extend role silhouettes, panel paths, fittings and material definitions here rather than flattening the models into a new sprite atlas. Preserve Aurora Fleet's separate SVG generator and atlas contract for the Assets mode. The Quality renderer and Canvas tactical overlay share `flightView`; only the session replaces owners and releases prepared image sources.
