import { gameInfo, type GameInfo } from './catalog-data.ts';

export const gamePath = (game: GameInfo) => `/${game.slug}/`;

/** Accept directory URLs with or without the host's trailing-slash redirect. */
export function gameAtPath(pathname: string) {
  return gameInfo.find(game => pathname === gamePath(game) || pathname === gamePath(game).slice(0, -1));
}

/**
 * Vite serves `index.html` for a directory visit. `originalUrl` is the browser
 * address; the rewritten file path is only a fallback for the production landing.
 */
export function htmlRequestPath({ path = '/', originalUrl }: { path?: string; originalUrl?: string } = {}) {
  const pathname = (originalUrl || path).split(/[?#]/)[0] ?? '/';
  return pathname.replace(/\/index\.html$/, '/') || '/';
}
