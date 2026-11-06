# Arcade Lab

A personal workshop for building complete, enjoyable browser games and evolving the shared engine behind them. Each game improves both the collection and the foundations for future games.

Built with TypeScript, Canvas 2D, original and bundled artwork, and procedural sound powered by [AudioBits](https://github.com/joacod/audiobits).

<table>
  <tr>
    <td align="center" width="33%"><a href="CATALOG.md#last-light-clearing"><img src="docs/games/last-light-clearing/preview.webp" alt="Last Light Clearing · Deluxe: the spell knight faces goblins and a horned demon in painted ruins" width="240"><br>Last Light Clearing</a></td>
    <td align="center" width="33%"><a href="CATALOG.md#skybreak"><img src="docs/games/skybreak/preview.webp" alt="Skybreak · Deluxe: painted aircraft exchange fire over the Tempest Coast" width="240"><br>Skybreak</a></td>
    <td align="center" width="33%"><a href="CATALOG.md#clockwork-hollow"><img src="docs/games/clockwork-hollow/preview.webp" alt="Clockwork Hollow · Deluxe: the porcelain keeper and a beetle beneath cathedral arches and a waterwheel" width="240"><br>Clockwork Hollow</a></td>
  </tr>
  <tr>
    <td align="center" width="33%"><a href="CATALOG.md#midnight-circuit"><img src="docs/games/midnight-circuit/preview.webp" alt="Midnight Circuit · Deluxe: Rook faces street fighters in the painted Afterglow backstreets" width="240"><br>Midnight Circuit</a></td>
    <td align="center" width="33%"><a href="CATALOG.md#obsidian-duel"><img src="docs/games/obsidian-duel/preview.webp" alt="Obsidian Duel · Deluxe: Nera and Kael duel beneath the lunar orrery of Moonfall Sanctum" width="240"><br>Obsidian Duel</a></td>
    <td align="center" width="33%"><a href="CATALOG.md#blastline"><img src="docs/games/blastline/preview.webp" alt="Blastline · Deluxe: Bolt approaches the tracked Bastion against a painted coastal foundry" width="240"><br>Blastline</a></td>
  </tr>
</table>

Screenshots show the **Deluxe** themes. See the [game catalog](CATALOG.md) for descriptions, controls and theme options.

## Play locally

```sh
git clone https://github.com/joacod/arcade-lab.git
cd arcade-lab
pnpm install
pnpm dev
```

Open the local URL printed in the terminal and choose a game. Keyboard and touch controls are available, with fullscreen where supported. All required artwork is included.

Finished games start in Arcade and offer Arcade / Deluxe choices when both exist. New games use a temporary Prototype until Arcade replaces it. Single-presentation games hide the selector. In title and pause menus, S toggles sound and T switches themes. P pauses or resumes and F toggles fullscreen, which stays active when returning to game selection.

[Architecture](docs/architecture.md) · [Development guidance](AGENTS.md) · [MIT license](LICENSE)
