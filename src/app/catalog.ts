import { gameInfo, type GameId } from './catalog-data.ts';
export type { GameId } from './catalog-data.ts';

const loaders = {
  clearing: async () => (await import('../games/last-light-clearing/app.ts')).mountClearing,
  skybreak: async () => (await import('../games/skybreak/app.ts')).mountSkybreak,
  hollow: async () => (await import('../games/clockwork-hollow/app.ts')).mountHollow,
  circuit: async () => (await import('../games/midnight-circuit/app.ts')).mountCircuit,
  duel: async () => (await import('../games/obsidian-duel/app.ts')).mountDuel,
  blastline: async () => (await import('../games/blastline/app.ts')).mountBlastline,
  cloudwake: async () => (await import('../games/cloudwake/app.ts')).mountCloudwake,
} satisfies Record<GameId, unknown>;

/** Collection metadata is eager; game code loads only when selected. */
export const games = gameInfo.map(game => ({ ...game, load: loaders[game.id] }));
