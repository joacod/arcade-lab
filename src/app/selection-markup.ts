import { gameInfo, type GameId } from './catalog-data.ts';
import { githubIcon } from './brand.ts';
import { site } from './site.ts';

/** The initial HTML and later collection visits share one landing layout. */
export function selectionMarkup({ selected, message = '', coverUrl = (url: string) => url }: {
  selected?: GameId | undefined;
  message?: string;
  coverUrl?: (url: string) => string;
} = {}) {
  return `<div class="arcade-selection-inner">
    <header class="arcade-selection-header">
      <div class="arcade-brand"><img src="/icon.svg" width="36" height="36" alt=""><span>ARCADE LAB</span></div>
      <div class="arcade-collection-tools"><button type="button" class="arcade-fullscreen" aria-keyshortcuts="F" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span>Fullscreen (F)</span></button><a class="arcade-github" href="${site.repository}" target="_blank" rel="noopener noreferrer">${githubIcon}<span>GitHub</span><span aria-hidden="true">↗</span></a></div>
    </header>
    <section class="arcade-introduction" aria-labelledby="selection-heading">
      <div><p class="arcade-eyebrow">SMALL WORLDS</p><h1 id="selection-heading">Press Play</h1></div>
      <p class="arcade-intro">${site.introduction}<br><span>Keyboard or touch. Right in your browser.</span></p>
    </section>
    <noscript><p>Enable JavaScript to choose and play a game.</p></noscript>
    <div class="arcade-games" aria-labelledby="selection-heading">${gameInfo.map(game => `
      <button type="button" class="arcade-game" disabled data-game="${game.id}" aria-label="Open game: ${game.title}" aria-describedby="${game.id}-description">
        <span class="arcade-cover" aria-hidden="true">${selected === game.id ? '<span class="arcade-return">Last selected</span>' : ''}<img src="${coverUrl(game.cover)}" alt="" width="1440" height="1000" decoding="async"><span class="arcade-cover-shade"></span><span class="arcade-genre">${game.genre.replaceAll('&', '&amp;')}</span></span>
        <span class="arcade-card-copy"><span class="arcade-game-title">${game.title}</span><span class="arcade-card-action" aria-hidden="true"><span class="arcade-card-action-label">Play</span><svg class="arcade-play-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 1.7 10.4 6 3.2 10.3Z"/></svg></span></span>
        <span id="${game.id}-description" class="arcade-game-description">${game.description} ${game.controls}.</span>
      </button>`).join('')}</div>
    <footer class="arcade-selection-footer"><span class="arcade-display-hint">A little arcade. A lot to explore.</span><span class="arcade-credit">Built by <a href="https://joacod.com" target="_blank" rel="noopener noreferrer">joacod</a></span></footer>
    <p class="arcade-display-status" role="status" hidden></p>
    <div class="arcade-loading" ${message ? '' : 'hidden'}><p class="arcade-selection-status" role="status"></p><button type="button" class="arcade-cancel" hidden>Cancel loading</button></div>
    </div>`;
}
