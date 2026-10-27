# Ember Ruins artwork

Original **16x16 DungeonTileset II v1.7**, by **0x72 / Robert**.

- Official source: https://0x72.itch.io/dungeontileset-ii
- Downloaded from the author's itch.io download page on 2026-10-27.
- Archive: `0x72_DungeonTilesetII_v1.7.zip`
- Archive SHA-256: `a5b23341ebc831d7798bfb9666d864a08c079bb7aed18e3cf023a27d517c1512`
- Asset license: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/), as stated by the author on the official source page. The repository's MIT license does not replace this asset license.

`dungeon.png` is the unmodified `0x72_DungeonTilesetII_v1.7.png` atlas (512×512), renamed locally. Its SHA-256 is `b222e563f9006e609cb0a5ec99878b7ef9a92953de3abf4cf2ae9d2aff1355d2`. `tile-list.txt` is unmodified metadata from the archive. `upstream-readme.txt` preserves the author's text with its trailing blank line removed.

The manifest in `src/games/last-light-clearing/themes.ts` uses the supplied knight_f, goblin, and big_demon four-frame idle/run sequences. They face sideways and are mirrored horizontally. No directional, attack, hurt, or death sequence is claimed. Flashes and defeat rings are original cosmetic Canvas effects. Idle/run timings, normalized pivots, visual footprints, terrain opacity, layout, and effect colors are authored for this game.

Ground uses floor_1 through floor_4. Perimeter masonry, columns, crates, and the three-frame red wall-fountain flame motif remain outside the traversable arena. No scenery creates an interior obstacle.
