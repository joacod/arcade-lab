import type { GameSession } from './application.ts';
import './selection.css';
export type GameId = 'clearing' | 'skybreak';
export function mountSelection(container: HTMLElement, select: (id: GameId) => void, message = ''): GameSession {
  const root = document.createElement('main'); root.className = 'arcade-selection';
  root.innerHTML = `<div class="arcade-selection-inner"><header><span class="arcade-wordmark">ARCADE LAB<span>SMALL WORLDS. GOOD GAMES.</span></span><span class="arcade-edition">THE PLAYABLE COLLECTION / 002</span></header>
    <section aria-labelledby="selection-heading"><p class="arcade-kicker">PICK A WORLD. STAY A WHILE.</p><h1 id="selection-heading">A little escape.</h1><p class="arcade-intro">Two worlds, made to be played. Where are we going?</p>
    <div class="arcade-games"><button class="arcade-game arcade-clearing" data-game="clearing" aria-label="Play Last Light Clearing">
      <span class="arcade-cover" aria-hidden="true"><svg viewBox="0 0 480 260"><defs><radialGradient id="clearing-glow"><stop stop-color="#b3ce7333"/><stop offset="1" stop-color="#142a2900"/></radialGradient></defs><path fill="#112d2b" d="M0 0h480v260H0z"/><circle fill="url(#clearing-glow)" cx="240" cy="140" r="200"/>
      <g fill="#1d4740" stroke="#396454" stroke-width="2"><path d="m30 190 30-95 30 95H70v40H50v-40zM370 160l28-80 28 80h-18v45h-20v-45zM110 100l22-65 22 65h-14v28h-16v-28zM290 83l22-65 22 65h-14v28h-16V83z"/></g>
      <ellipse cx="240" cy="202" rx="57" ry="12" fill="#9cc37a18"/><g fill="#99ce9b"><path d="m170 170 4-6 4 6-4 6zM292 153l4-6 4 6-4 6zM330 213l4-6 4 6-4 6zM200 100l4-6 4 6-4 6z"/></g><circle cx="240" cy="178" r="38" fill="#edce7a0d" stroke="#d4d58d44"/><path d="m226 193 6-30h16l6 30z" fill="#b8a777"/><circle cx="240" cy="160" r="11" fill="#f5d58b"/><circle cx="240" cy="155" r="3" fill="#fff7cd"/></svg><span class="arcade-number">01 / SURVIVAL</span></span>
      <span class="arcade-card-copy"><span class="arcade-game-title">Last Light Clearing <span>↗</span></span><span class="arcade-game-description">A little light against a crowded forest.<br>Collect. Grow. Survive until dawn.</span><span class="arcade-tag">AUTO COMBAT <span>90–180 SEC</span></span></span></button>
      <button class="arcade-game arcade-skybreak" data-game="skybreak" aria-label="Play Skybreak"><span class="arcade-cover" aria-hidden="true"><svg viewBox="0 0 480 260"><path fill="#0b425c" d="M0 0h480v260H0z"/><g fill="none" stroke="#6dc5c52b"><path d="M0 65q120-25 240 0t240 0M0 150q120-25 240 0t240 0M0 240q120-25 240 0t240 0M30 35h30m80 63h40m200-63h40M70 210h35m210-100h35"/></g><path d="m52-10 55 24 18 53-38 40-49-22-12-54z" fill="#aeb589"/><path d="m57-10 42 28 12 43-28 30-35-15-11-43z" fill="#428373"/><g fill="#ed9279"><path d="m175 44-19 13 16-3 3 15 3-15 16 3zM305 22l-19 13 16-3 3 15 3-15 16 3zM370 74l-19 13 16-3 3 15 3-15 16 3z"/></g><path d="M224 220v35m32-35v35" stroke="#b4ffff44" stroke-width="3"/><path d="m240 127-7 32-33 22v8l33-5 2 28-13 9v6l18-4 18 4v-6l-13-9 2-28 33 5v-8l-33-22z" fill="#e6f0df" stroke="#143e56" stroke-width="2"/><path d="m240 154-5 12v18h10v-18z" fill="#299ab0"/><path d="M229 98v-15m22 15v-15" stroke="#c0ffff" stroke-width="3"/></svg><span class="arcade-number">02 / AERIAL ARCADE</span></span>
      <span class="arcade-card-copy"><span class="arcade-game-title">Skybreak <span>↗</span></span><span class="arcade-game-description">A small aircraft. A wide ocean.<br>Break formation. Make it home.</span><span class="arcade-tag">VERTICAL SHOOTER <span>72 SEC</span></span></span></button></div>
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
