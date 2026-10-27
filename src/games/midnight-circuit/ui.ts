import { stageOf, type Run } from './game.ts';
import type { Control } from './input.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'interlude' | 'victory' | 'defeat';
export type Intent = 'start' | 'resume' | 'restart' | 'continue' | 'pause' | 'quit' | 'fullscreen';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (muted: boolean) => void) {
  root.innerHTML = `<header class="circuit-hud"><div class="circuit-wordmark">MC<span>MIDNIGHT CIRCUIT</span></div><div class="circuit-vitals"><span>ROOK <output aria-label="Lives">× 3</output></span><meter aria-label="Health" min="0" max="100" value="100"></meter></div><div class="circuit-score"><small>SCORE</small><output aria-label="Score">000000</output></div><button data-intent="pause" aria-label="Pause">Ⅱ</button></header>
  <main class="circuit-stage"><div class="circuit-location"><span>01 / NEON BACKSTREETS</span><small>FOLLOW THE DEAD GRID EAST</small></div><div class="circuit-combo" aria-live="off"></div><div class="circuit-boss" hidden><span>CIRCUIT WARDEN <small>BREAK THE BLACKOUT</small></span><meter aria-label="Circuit Warden health" min="0" max="720" value="720"></meter></div>
  <div class="circuit-menu-layer"><section class="circuit-menu" aria-labelledby="circuit-heading"><p class="circuit-eyebrow">A BLACKOUT. A CITY. ONE WAY THROUGH.</p><h1 id="circuit-heading">MIDNIGHT<br><em>CIRCUIT</em></h1><p class="circuit-description">The grid is dead. The streets aren't.<br>Fight your way to the power station.<br>Bring the city back to life.</p><div class="circuit-facts"><span>2 STAGES</span><span>ONE FIGHTER</span><span>4–6 MIN</span></div><output class="circuit-results" aria-label="Run results" hidden></output><div class="circuit-actions"><button class="circuit-primary" data-intent="start">Hit the streets <span>→</span></button><button class="circuit-primary" data-intent="resume" hidden>Resume fight →</button><button class="circuit-primary" data-intent="continue" hidden>Enter the power station →</button><button data-intent="restart" hidden>Restart run</button><button data-intent="quit">Game selection</button></div><p class="circuit-instructions"><b>WASD / ARROWS</b> move & align · <b>J</b> combo<br><b>K</b> heavy · <b>SPACE</b> jump · <b>J IN AIR</b> flying kick<br>Tap J three times for a finisher. Step out of red telegraphs.</p><div class="circuit-settings"><button class="circuit-mute" aria-pressed="false">Mute sound</button><button data-intent="fullscreen">Fullscreen</button></div><p class="circuit-display-status" role="status" hidden></p><p class="circuit-sound-status" role="status" hidden></p></section></div></main>
  <footer class="circuit-footer"><div class="circuit-hint">WASD <span>MOVE / ALIGN</span>　J <span>COMBO</span>　K <span>HEAVY</span>　SPACE <span>JUMP</span></div><div class="circuit-touch"><div class="circuit-pad" aria-label="Direction controls"><button data-control="up" aria-label="Move up lane">↑</button><button data-control="left" aria-label="Move left">←</button><span>＋</span><button data-control="right" aria-label="Move right">→</button><button data-control="down" aria-label="Move down lane">↓</button></div><div class="circuit-attack-buttons"><button data-control="jump" aria-label="Jump">↟<small>JUMP</small></button><button data-control="heavy" aria-label="Heavy attack">K<small>HEAVY</small></button><button data-control="light" aria-label="Light attack">J<small>STRIKE</small></button></div></div></footer>`;
  root.querySelector('.circuit-stage')!.prepend(surface);
  const controls = Object.fromEntries((['left', 'right', 'up', 'down', 'light', 'heavy', 'jump'] as const).map(key => [key, root.querySelector<HTMLButtonElement>(`[data-control="${key}"]`)!])) as Record<Control, HTMLButtonElement>;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-intent]')];
  for (const button of buttons) button.addEventListener('click', () => act(button.dataset.intent as Intent), { signal });
  const layer = root.querySelector<HTMLElement>('.circuit-menu-layer')!, heading = root.querySelector('h1')!;
  const description = root.querySelector('.circuit-description')!, results = root.querySelector<HTMLOutputElement>('.circuit-results')!;
  const muteButton = root.querySelector<HTMLButtonElement>('.circuit-mute')!;
  let muted = false, current: Screen = 'title';
  muteButton.addEventListener('click', () => { muted = !muted; muteButton.setAttribute('aria-pressed', String(muted)); muteButton.textContent = muted ? 'Unmute sound' : 'Mute sound'; mute(muted); }, { signal });
  function status(selector: string, message: string) { const el = root.querySelector<HTMLElement>(selector)!; el.textContent = message; el.hidden = !message; }
  return { controls,
    soundStatus(message: string) { status('.circuit-sound-status', message); },
    displayStatus(message: string) { status('.circuit-display-status', message); },
    fullscreen(available: boolean, active: boolean) { const button = root.querySelector<HTMLButtonElement>('[data-intent="fullscreen"]')!; button.hidden = !available; button.textContent = active ? 'Exit fullscreen' : 'Fullscreen'; },
    show(screen: Screen, focus = true) {
      current = screen; root.dataset.screen = screen; layer.hidden = screen === 'playing';
      surface.tabIndex = screen === 'playing' ? 0 : -1; surface.setAttribute('aria-hidden', String(screen !== 'playing'));
      heading.innerHTML = screen === 'title' ? 'MIDNIGHT<br><em>CIRCUIT</em>' : screen === 'paused' ? 'HOLD<br><em>THE LINE.</em>' : screen === 'interlude' ? 'END OF<br><em>THE STREETS.</em>' : screen === 'victory' ? 'LET THERE<br><em>BE LIGHT.</em>' : 'DOWN.<br><em>NOT OUT.</em>';
      description.textContent = screen === 'title' ? "The grid is dead. The streets aren't. Fight your way to the power station. Bring the city back to life." : screen === 'paused' ? 'Catch your breath. The city can wait. Escape / P pauses; Resume brings you back.' : screen === 'interlude' ? 'The backstreets are behind you. The Warden is waiting at the heart of the grid. Health restored for the final push.' : screen === 'victory' ? 'The Warden falls. A thousand windows wake. Somewhere, the last train starts moving again.' : 'Even the city takes a hit. A fresh run. A new rhythm. You know the way.';
      root.querySelector<HTMLElement>('.circuit-facts')!.hidden = screen !== 'title';
      results.hidden = !['interlude', 'victory', 'defeat'].includes(screen);
      for (const b of buttons) {
        const intent = b.dataset.intent;
        if (intent === 'fullscreen') continue;
        b.hidden = intent === 'pause' ? screen !== 'playing' : intent === 'start' ? screen !== 'title' : intent === 'resume' ? screen !== 'paused' : intent === 'continue' ? screen !== 'interlude' : intent === 'restart' ? screen === 'title' || screen === 'playing' : screen === 'playing';
      }
      for (const button of Object.values(controls)) button.disabled = screen !== 'playing';
      if (focus) { if (screen === 'playing') surface.focus({ preventScroll: true }); else buttons.find(b => !b.hidden)?.focus({ preventScroll: true }); }
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
