/** Shared collection copy and canonical presentation previews; no game runtime imports. */
export const gameInfo = [
  { id: 'clearing', title: 'Last Light Clearing', cover: new URL('../../docs/games/last-light-clearing/preview.webp', import.meta.url).href,
    genre: 'SURVIVAL', controls: 'Move · auto-fire', description: 'Survive enemy waves, collect gems and upgrade automatic weapons.' },
  { id: 'skybreak', title: 'Skybreak', cover: new URL('../../docs/games/skybreak/preview.webp', import.meta.url).href,
    genre: 'AERIAL ARCADE', controls: 'Steer · shoot · evade', description: 'Shoot down aircraft, collect supplies and destroy the fortress.' },
  { id: 'hollow', title: 'Clockwork Hollow', cover: new URL('../../docs/games/clockwork-hollow/preview.webp', import.meta.url).href,
    genre: 'PLATFORM ADVENTURE', controls: 'Run · jump · explore', description: 'Jump across three districts, collect motes and reach each bell.' },
  { id: 'circuit', title: 'Midnight Circuit', cover: new URL('../../docs/games/midnight-circuit/preview.webp', import.meta.url).href,
    genre: 'STREET BRAWLER', controls: 'Move · combo · jump', description: 'Fight through two stages with combos, heavy attacks and jumping kicks.' },
  { id: 'duel', title: 'Obsidian Duel', cover: new URL('../../docs/games/obsidian-duel/preview.webp', import.meta.url).href,
    genre: 'ONE-ON-ONE FIGHTER', controls: 'Strike · guard · counter', description: 'Choose a fighter and beat the CPU in a best-of-three match.' },
  { id: 'blastline', title: 'Blastline', cover: new URL('../../docs/games/blastline/preview.webp', import.meta.url).href,
    genre: 'RUN & GUN', controls: 'Run · shoot · rescue', description: 'Rescue an operator, destroy defenses and reach extraction.' },
  { id: 'cloudwake', title: 'Cloudwake', cover: new URL('../../docs/games/cloudwake/preview.webp', import.meta.url).href,
    genre: 'ENDLESS FLIGHT', controls: 'Rise · slide', description: 'Thread the sky ruins, gather lost light and fly as far as you can.' },
  { id: 'guest', title: 'The Thirteenth Guest', cover: new URL('../../docs/games/point-and-click-adventure/preview.webp', import.meta.url).href,
    genre: 'GHOST MYSTERY · PROTOTYPE', controls: 'Investigate · deduce · contain', description: 'Uncover a Victorian castle’s secret with an occult detective and a troublesome ghost household.' },
] as const;
export type GameId = typeof gameInfo[number]['id'];
