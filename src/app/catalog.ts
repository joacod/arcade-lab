import clearingCover from '../games/last-light-clearing/art/cover.svg';
import skybreakCover from '../games/skybreak/art/cover.svg';
import hollowCover from '../games/clockwork-hollow/art/cover.svg';
import circuitCover from '../games/midnight-circuit/art/cover.svg';
import duelCover from '../games/obsidian-duel/art/cover.svg';
import blastlineCover from '../games/blastline/art/cover.svg';

/** Collection metadata is eager; game code loads only when selected. */
export const games = [
  { id: 'clearing', title: 'Last Light Clearing', className: 'arcade-clearing', cover: clearingCover,
    genre: 'SURVIVAL', description: 'A little light against a crowded forest.<br>Collect. Grow. Survive until dawn.', tag: 'AUTO COMBAT', duration: '90–180 SEC',
    load: async () => (await import('../games/last-light-clearing/app.ts')).mountClearing },
  { id: 'skybreak', title: 'Skybreak', className: 'arcade-skybreak', cover: skybreakCover,
    genre: 'AERIAL ARCADE', description: 'A small aircraft. A wide ocean.<br>Break formation. Bring down the fortress.', tag: 'VERTICAL SHOOTER', duration: '2–3 MIN',
    load: async () => (await import('../games/skybreak/app.ts')).mountSkybreak },
  { id: 'hollow', title: 'Clockwork Hollow', className: 'arcade-hollow', cover: hollowCover,
    genre: 'PLATFORM ADVENTURE', description: 'Forgotten machinery. A little keeper.<br>Find your footing. Wake the hollow.', tag: 'PLATFORMER', duration: '3–6 MIN',
    load: async () => (await import('../games/clockwork-hollow/app.ts')).mountHollow },
  { id: 'circuit', title: 'Midnight Circuit', className: 'arcade-circuit', cover: circuitCover,
    genre: 'STREET BRAWLER', description: 'The grid is dead. The streets aren\'t.<br>Find your rhythm. Bring back the light.', tag: '2.5D BEAT \'EM UP', duration: '4–6 MIN',
    load: async () => (await import('../games/midnight-circuit/app.ts')).mountCircuit },
  { id: 'duel', title: 'Obsidian Duel', className: 'arcade-duel', cover: duelCover,
    genre: 'ONE-ON-ONE FIGHTER', description: 'Two warriors. One eye of the storm.<br>Read the stance. Find the opening.', tag: 'ARCADE FIGHTER', duration: 'BEST OF THREE',
    load: async () => (await import('../games/obsidian-duel/app.ts')).mountDuel },
  { id: 'blastline', title: 'Blastline', className: 'arcade-blastline', cover: blastlineCover,
    genre: 'RUN &amp; GUN', description: 'Two operators. Explosive possibilities.<br>Make an entrance. Catch the last ride out.', tag: 'DESTRUCTIBLE ACTION', duration: '3–5 MIN',
    load: async () => (await import('../games/blastline/app.ts')).mountBlastline },
] as const;
export type GameId = typeof games[number]['id'];
