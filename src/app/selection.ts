import type { GameSession } from '../engine/session.ts';
import { games, type GameId } from './catalog.ts';
import './selection.css';

export function mountSelection(container: HTMLElement, select: (id: GameId) => void, message = ''): GameSession {
  const root = document.createElement('main'); root.className = 'arcade-selection';
  root.innerHTML = `<div class="arcade-selection-inner"><h1 id="selection-heading">Games</h1>
    <div class="arcade-games" aria-labelledby="selection-heading">${games.map(game => `
      <button class="arcade-game" data-game="${game.id}" aria-label="Play ${game.title}">
        <span class="arcade-cover" aria-hidden="true"><img src="${game.cover}" alt="" width="480" height="260"></span>
        <span class="arcade-card-copy"><span class="arcade-game-title">${game.title}</span><span class="arcade-game-description">${game.description}</span><span class="arcade-genre">${game.genre}</span></span>
      </button>`).join('')}</div><p class="arcade-selection-status" role="status" ${message ? '' : 'hidden'}></p></div>`;
  container.append(root);
  const lifetime = new AbortController();
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-game]')];
  const status = root.querySelector('.arcade-selection-status')!; status.textContent = message;
  for (const button of buttons) button.addEventListener('click', () => {
    for (const item of buttons) item.disabled = true;
    status.removeAttribute('hidden'); status.textContent = 'Loading game…'; select(button.dataset.game as GameId);
  }, { signal: lifetime.signal });
  buttons[0]?.focus({ preventScroll: true });
  return { dispose() { lifetime.abort(); root.remove(); } };
}
