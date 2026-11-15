import type { GameInfo } from './catalog-data.ts';
import { site } from './site.ts';

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

/** A direct game visit has useful content and an exit before its lazy code arrives. */
export function gameLoadingMarkup(game: GameInfo) {
  return `<div class="arcade-selection-inner">
    <a class="arcade-github" href="/">← ${escape(site.name)}</a>
    <section class="arcade-introduction"><div><p class="arcade-eyebrow">${escape(game.genre)}</p><h1>${escape(game.title)}</h1></div><p class="arcade-intro">${escape(game.description)}</p></section>
    <p role="status">Loading ${escape(game.title)}…</p><noscript><p>Enable JavaScript to play this game.</p></noscript>
    </div>`;
}
