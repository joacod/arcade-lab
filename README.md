# Arcade Lab

A personal workshop for creating small, beautiful, fun browser games with our own evolving browser-native game engine. Each complete game helps us improve both the collection and the foundations for future games.

## Run locally

Use **Node 24.x** (see `.node-version`) and **pnpm 12.15.0**.

```sh
git clone https://github.com/joacod/arcade-lab.git
cd arcade-lab
pnpm install
pnpm dev
```

Open the local URL printed by Vite, then choose a game. **Game selection** in the game's menus returns to the collection. Games fill the browser viewport, with fullscreen available where supported.

See the [game catalog](CATALOG.md) for the available games, screenshots and controls.

`pnpm build` creates a production build in `dist/`; `pnpm preview` serves it locally.

## Learn more

Built with TypeScript and Vite, using Canvas 2D, Three.js and vgpu/WebGPU for graphics. [AudioBits](https://github.com/joacod/audiobits) is the selected library for all game sound; integration is pending.

- [Architecture](docs/architecture.md): shared engine ownership and local verification.
- [Development guidance](AGENTS.md): contributor and agent instructions.

Code is available under the [MIT license](LICENSE).
