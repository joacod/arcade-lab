import { createGameMenu } from '../../engine/browser/menu.ts';
import { stageOf, type Run } from './game.ts';
import type { Control } from './input.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'interlude' | 'victory' | 'defeat';
export type Intent = 'start' | 'resume' | 'restart' | 'continue' | 'pause' | 'quit' | 'fullscreen';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (muted: boolean) => void) {
  root.innerHTML = `<header class="circuit-hud"><div class="circuit-wordmark">MC<span>MIDNIGHT CIRCUIT</span></div><div class="circuit-vitals"><span>ROOK <output aria-label="Lives">× 3</output></span><meter aria-label="Health" min="0" max="100" value="100"></meter></div><div class="circuit-score"><small>SCORE</small><output aria-label="Score">000000</output></div><button data-intent="pause" aria-label="Pause">Ⅱ</button></header>
  <main class="circuit-stage"><div class="circuit-location"><span>01 / NEON BACKSTREETS</span><small>FOLLOW THE DEAD GRID EAST</small></div><div class="circuit-combo" aria-live="off"></div><div class="circuit-boss" hidden><span>CIRCUIT WARDEN <small>BREAK THE BLACKOUT</small></span><meter aria-label="Circuit Warden health" min="0" max="720" value="720"></meter></div>
  </main>
  <footer class="circuit-footer"><div class="circuit-hint">WASD <span>MOVE / ALIGN</span>　J <span>COMBO</span>　K <span>HEAVY</span>　SPACE <span>JUMP</span></div><div class="circuit-touch"><div class="circuit-pad" aria-label="Direction controls"><button data-control="up" aria-label="Move up lane">↑</button><button data-control="left" aria-label="Move left">←</button><span>＋</span><button data-control="right" aria-label="Move right">→</button><button data-control="down" aria-label="Move down lane">↓</button></div><div class="circuit-attack-buttons"><button data-control="jump" aria-label="Jump">↟<small>JUMP</small></button><button data-control="heavy" aria-label="Heavy attack">K<small>HEAVY</small></button><button data-control="light" aria-label="Light attack">J<small>STRIKE</small></button></div></div></footer>`;
  root.querySelector('.circuit-stage')!.prepend(surface);
  const pause = root.querySelector<HTMLButtonElement>('[data-intent="pause"]')!;
  pause.addEventListener('click', () => act('pause'), { signal });
  const menu = createGameMenu<Intent, Screen>(root, surface, root.querySelector('.circuit-stage')!, {
    id: 'circuit', title: 'Midnight Circuit', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'),
    game: `<output class="circuit-results" aria-label="Run results" hidden></output>`,
    controls: `<b>WASD / ARROWS</b> move & align · <b>J</b> combo<br><b>K</b> heavy · <b>SPACE</b> jump · <b>J IN AIR</b> flying kick<br>Tap J three times for a finisher. Step out of red telegraphs.<p><b>Escape / P</b> pause. Touch: use the on-screen controls.</p>`,
    actions: [{ id: 'start', label: 'Play', screens: ['title'], primary: true },
      { id: 'resume', label: 'Resume', screens: ['paused'], primary: true },
      { id: 'continue', label: 'Continue', screens: ['interlude'], primary: true },
      { id: 'restart', label: 'Restart', screens: ['paused', 'victory', 'defeat', 'interlude'], primary: true },
      { id: 'quit', label: 'Game selection', screens: ['title', 'paused', 'victory', 'defeat', 'interlude'] }],
  });

  const controls = Object.fromEntries((['left', 'right', 'up', 'down', 'light', 'heavy', 'jump'] as const).map(key => [key, root.querySelector<HTMLButtonElement>(`[data-control="${key}"]`)!])) as Record<Control, HTMLButtonElement>;
  const description = menu.description, results = root.querySelector<HTMLOutputElement>('.circuit-results')!;
  let current: Screen = 'title';
  return { controls,
    soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    fullscreen: menu.fullscreen,
    show(screen: Screen, focus = true) {
      current = screen;
      menu.heading.textContent = screen === 'title' ? 'Midnight Circuit' : screen === 'paused' ? 'Paused' : screen === 'victory' ? 'Victory' : screen === 'defeat' ? 'Defeat' : 'Stage complete';
      description.textContent = screen === 'title' ? "Fight through the backstreets and defeat the Circuit Warden at the power station." : screen === 'paused' ? '' : screen === 'interlude' ? 'The backstreets are behind you. The Warden is waiting at the heart of the grid. Health restored for the final push.' : screen === 'victory' ? 'Circuit Warden defeated.' : 'No lives remaining.';
      results.hidden = !['paused', 'interlude', 'victory', 'defeat'].includes(screen);

      for (const button of Object.values(controls)) button.disabled = screen !== 'playing';
      menu.show(screen, focus);
    },
    update(run: Run) {
      const stage = stageOf(run), encounter = stage.encounters[run.encounter];
      root.querySelector<HTMLMeterElement>('[aria-label="Health"]')!.value = run.player.health;
      root.querySelector('[aria-label="Lives"]')!.textContent = `× ${run.lives}`;
      root.querySelector('[aria-label="Score"]')!.textContent = String(run.score).padStart(6, '0');
      root.querySelector('.circuit-location > span')!.textContent = `0${run.stageIndex + 1} / ${stage.name.toUpperCase()}`;
      const alive = run.enemies.filter(a => a.health > 0).length;
      root.querySelector('.circuit-location > small')!.textContent = run.respawn > 0 ? 'GET UP. THE CITY NEEDS YOU.' : run.finale > 0 ? 'CIRCUIT RESTORED' : run.gated ? `${encounter?.name.toUpperCase()} · WAVE ${run.wave + 1}/${encounter?.waves.length} · ${alive} LEFT` : encounter ? 'MOVE RIGHT → · FOLLOW THE DEAD GRID' : 'ALL CLEAR → HEAD FOR THE STATION';
      const combo = root.querySelector<HTMLElement>('.circuit-combo')!;
      combo.textContent = run.combo > 1 ? `${run.combo} HITS` : ''; combo.classList.toggle('is-hot', run.combo >= 6);
      const boss = run.enemies.find(a => a.kind === 'warden');
      root.querySelector<HTMLElement>('.circuit-boss')!.hidden = !boss || current !== 'playing';
      const bar = root.querySelector<HTMLMeterElement>('[aria-label="Circuit Warden health"]')!;
      if (boss) { bar.max = boss.maxHealth; bar.value = boss.health; }
      results.textContent = `${run.score.toLocaleString()} POINTS  /  ${Math.floor(run.elapsed / 60)}:${String(Math.floor(run.elapsed % 60)).padStart(2, '0')}\n${run.hits} hits landed · ${run.bestCombo} best chain · ${run.lives} lives remaining${run.status === 'victory' ? '\nCITY GRID: ONLINE' : ''}`;
    },
  };
}
