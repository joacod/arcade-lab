import clearingCover from '../games/last-light-clearing/art/cover.svg';
import skybreakCover from '../games/skybreak/art/cover.svg';
import hollowCover from '../games/clockwork-hollow/art/cover.svg';
import circuitCover from '../games/midnight-circuit/art/cover.svg';
import duelCover from '../games/obsidian-duel/art/cover.svg';
import blastlineCover from '../games/blastline/art/cover.svg';

/** Collection metadata is eager; game code loads only when selected. */
export const games = [
  { id: 'clearing', title: 'Last Light Clearing', cover: clearingCover,
    genre: 'SURVIVAL', description: 'Survive enemy waves, collect gems and upgrade automatic weapons.',
    load: async () => (await import('../games/last-light-clearing/app.ts')).mountClearing },
  { id: 'skybreak', title: 'Skybreak', cover: skybreakCover,
    genre: 'AERIAL ARCADE', description: 'Shoot down aircraft, collect supplies and destroy the fortress.',
    load: async () => (await import('../games/skybreak/app.ts')).mountSkybreak },
  { id: 'hollow', title: 'Clockwork Hollow', cover: hollowCover,
    genre: 'PLATFORM ADVENTURE', description: 'Jump across three districts, collect motes and reach each bell.',
    load: async () => (await import('../games/clockwork-hollow/app.ts')).mountHollow },
  { id: 'circuit', title: 'Midnight Circuit', cover: circuitCover,
    genre: 'STREET BRAWLER', description: 'Fight through two stages with combos, heavy attacks and jumping kicks.',
    load: async () => (await import('../games/midnight-circuit/app.ts')).mountCircuit },
  { id: 'duel', title: 'Obsidian Duel', cover: duelCover,
    genre: 'ONE-ON-ONE FIGHTER', description: 'Choose a fighter and beat the CPU in a best-of-three match.',
    load: async () => (await import('../games/obsidian-duel/app.ts')).mountDuel },
  { id: 'blastline', title: 'Blastline', cover: blastlineCover,
    genre: 'RUN &amp; GUN', description: 'Rescue an operator, destroy defenses and reach extraction.',
    load: async () => (await import('../games/blastline/app.ts')).mountBlastline },
] as const;
export type GameId = typeof games[number]['id'];
