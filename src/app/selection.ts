import type { GameSession } from '../engine/session.ts';
import { games, type GameId } from './catalog.ts';
import './selection.css';

export function mountSelection(container: HTMLElement, select: (id: GameId) => void, message = ''): GameSession {
  const root = document.createElement('main'); root.className = 'arcade-selection';
  root.innerHTML = `<div class="arcade-selection-inner"><header><span class="arcade-wordmark">ARCADE LAB<span>SMALL WORLDS. GOOD GAMES.</span></span><span class="arcade-edition">THE PLAYABLE COLLECTION / ${String(games.length).padStart(3, '0')}</span></header>
    <section aria-labelledby="selection-heading"><p class="arcade-kicker">PICK A WORLD. STAY A WHILE.</p><h1 id="selection-heading">A little escape.</h1><p class="arcade-intro">Small worlds, made to be played. Where are we going?</p>
    <div class="arcade-games">${games.map((game, index) => `
      <button class="arcade-game ${game.className}" data-game="${game.id}" aria-label="Play ${game.title}">
        <span class="arcade-cover" aria-hidden="true"><img src="${game.cover}" alt="" width="480" height="260"><span class="arcade-number">${String(index + 1).padStart(2, '0')} / ${game.genre}</span></span>
        <span class="arcade-card-copy"><span class="arcade-game-title">${game.title} <span>↗</span></span><span class="arcade-game-description">${game.description}</span><span class="arcade-tag">${game.tag} <span>${game.duration}</span></span></span>
      </button>`).join('')}</div>
      <p class="arcade-selection-status" role="status"></p></section><footer><span>Built for the joy of playing.</span><span>KEYBOARD + TOUCH</span></footer></div>`;
  container.append(root);
  const lifetime = new AbortController();
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-game]')];
  const status = root.querySelector('.arcade-selection-status')!; status.textContent = message;
  for (const button of buttons) button.addEventListener('click', () => {
    for (const item of buttons) item.disabled = true;
    status.textContent = 'Preparing your world…'; select(button.dataset.game as GameId);
  }, { signal: lifetime.signal });
  buttons[0]?.focus({ preventScroll: true });
  return { dispose() { lifetime.abort(); root.remove(); } };
}
