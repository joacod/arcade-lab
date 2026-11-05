# Arcade Lab

A personal workshop for building complete, enjoyable browser games and evolving the shared engine behind them. Each game improves both the collection and the foundations for future games.

Built with TypeScript, Canvas 2D, original and bundled artwork, and procedural sound powered by [AudioBits](https://github.com/joacod/audiobits).

<table>
  <tr>
    <td align="center" width="33%"><a href="CATALOG.md#last-light-clearing"><img src="docs/games/last-light-clearing/quality.webp" alt="Last Light Clearing · Quality: the spell knight faces goblins and a horned demon in painted ruins" width="240"><br>Last Light Clearing</a></td>
    <td align="center" width="33%"><a href="CATALOG.md#skybreak"><img src="docs/games/skybreak/quality.webp" alt="Skybreak · Quality: painted aircraft exchange fire over the Tempest Coast" width="240"><br>Skybreak</a></td>
    <td align="center" width="33%"><a href="CATALOG.md#clockwork-hollow"><img src="docs/games/clockwork-hollow/quality.webp" alt="Clockwork Hollow · Quality: the porcelain keeper and a beetle beneath cathedral arches and a waterwheel" width="240"><br>Clockwork Hollow</a></td>
  </tr>
  <tr>
    <td align="center" width="33%"><a href="CATALOG.md#midnight-circuit"><img src="docs/games/midnight-circuit/quality.webp" alt="Midnight Circuit · Quality: Rook faces street fighters in the painted Afterglow backstreets" width="240"><br>Midnight Circuit</a></td>
    <td align="center" width="33%"><a href="CATALOG.md#obsidian-duel"><img src="docs/games/obsidian-duel/quality.webp" alt="Obsidian Duel · Quality: Nera and Kael duel beneath the lunar orrery of Moonfall Sanctum" width="240"><br>Obsidian Duel</a></td>
    <td align="center" width="33%"><a href="CATALOG.md#blastline"><img src="docs/games/blastline/quality.webp" alt="Blastline · Quality: Bolt approaches the tracked Bastion against a painted coastal foundry" width="240"><br>Blastline</a></td>
  </tr>
</table>

Screenshots show the **Quality** themes. See the [game catalog](CATALOG.md) for descriptions, controls and theme options.

## Play locally

```sh
git clone https://github.com/joacod/arcade-lab.git
cd arcade-lab
pnpm install
pnpm dev
```

Open the local URL printed in the terminal and choose a game. Keyboard and touch controls are available, with fullscreen where supported. All required artwork is included.

Development starts in Normal; production builds start in Assets and offer Assets / Quality. In title and pause menus, S toggles sound and T switches themes. P pauses or resumes and F toggles fullscreen, which stays active when returning to game selection.

[Architecture](docs/architecture.md) · [Development guidance](AGENTS.md) · [MIT license](LICENSE)
