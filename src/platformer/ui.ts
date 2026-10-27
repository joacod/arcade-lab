import type { Run } from './game.ts';
import type { Control } from './input.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'quit' | 'fullscreen';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void) {
  root.innerHTML = `<header class="hollow-hud"><div class="hollow-brand"><span class="hollow-mark">◷</span><div>CLOCKWORK HOLLOW<small>THE WAKING AQUEDUCT</small></div></div>
    <div class="hollow-instruments"><output aria-label="Motes collected">◇ 0 / 12</output><button data-intent="pause">Pause <kbd>Ⅱ</kbd></button></div></header>
    <main class="hollow-stage"><div class="hollow-location" aria-hidden="true"><span>01</span><div>THE WAKING AQUEDUCT<small>Follow the light. Wake the bell.</small></div></div>
    <div class="hollow-menu-layer"><section class="hollow-menu" aria-labelledby="hollow-heading"><p class="hollow-eyebrow">A SMALL ADVENTURE IN FORGOTTEN MACHINERY</p><h1 id="hollow-heading">Something<br>still ticks.</h1><p class="hollow-description">A little brass keeper. A sleeping ruin.<br>Find your footing and wake the bell beyond the aqueduct.</p>
    <div class="hollow-facts"><span>ONE HANDCRAFTED PATH</span><span>TAKE YOUR TIME</span></div><output class="hollow-results" aria-label="Adventure results" hidden></output>
    <div class="hollow-actions"><button class="hollow-primary" data-intent="start">Enter the hollow <span>→</span></button><button class="hollow-primary" data-intent="resume" hidden>Resume journey →</button><button data-intent="restart" hidden>Try again</button><button data-intent="quit">Game selection</button></div>
    <p class="hollow-controls"><b>A D / ← →</b> move <span>·</span> <b>Space / W / ↑ / Z</b> jump<br>Hold for a higher jump. Release for a little hop.<br><b>Escape / P</b> pause <span>·</span> Touch: arrows + jump</p>
    <div class="hollow-settings"><button class="hollow-mute" aria-pressed="false">Mute sound</button><button data-intent="fullscreen">Fullscreen</button></div><p class="hollow-status" role="status" hidden></p><p class="hollow-audio-status" role="status" hidden></p></section></div></main>
    <footer class="hollow-footer"><span class="hollow-hint">A D / ← → MOVE <span>·</span> SPACE TO JUMP</span><div class="hollow-touch"><div><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button></div><button data-control="jump" aria-label="Jump">↑ <small>JUMP</small></button></div><span class="hollow-footer-note">MOTES ARE OPTIONAL. THE BELL IS WAITING.</span></footer>`;
  root.querySelector('.hollow-stage')!.prepend(surface);
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-intent]')];
  for (const button of buttons) button.addEventListener('click', () => act(button.dataset.intent as Intent), { signal });
  const controls = Object.fromEntries((['left', 'right', 'jump'] as const).map(action => [action, root.querySelector<HTMLButtonElement>(`[data-control="${action}"]`)!])) as Record<Control, HTMLButtonElement>;
  const layer = root.querySelector<HTMLElement>('.hollow-menu-layer')!, heading = root.querySelector('h1')!;
  const description = root.querySelector('.hollow-description')!, results = root.querySelector<HTMLOutputElement>('.hollow-results')!;
  const motes = root.querySelector('[aria-label="Motes collected"]')!, hint = root.querySelector('.hollow-hint')!;
  const muteButton = root.querySelector<HTMLButtonElement>('.hollow-mute')!;
  let muted = false;
  muteButton.addEventListener('click', () => {
    muted = !muted; muteButton.setAttribute('aria-pressed', String(muted)); muteButton.textContent = muted ? 'Unmute sound' : 'Mute sound'; mute(muted);
  }, { signal });
  function status(selector: string, message: string) {
    const element = root.querySelector<HTMLElement>(selector)!; element.textContent = message; element.hidden = !message;
  }
  return { controls,
    soundStatus(message: string) { status('.hollow-audio-status', message); },
    displayStatus(message: string) { status('.hollow-status', message); },
    fullscreen(available: boolean, active: boolean) {
      const button = root.querySelector<HTMLButtonElement>('[data-intent="fullscreen"]')!;
      button.hidden = !available; button.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
    },
    show(screen: Screen, focus = true) {
      root.dataset.screen = screen; layer.hidden = screen === 'playing';
      surface.tabIndex = screen === 'playing' ? 0 : -1; surface.setAttribute('aria-hidden', String(screen !== 'playing'));
      heading.innerHTML = screen === 'paused' ? 'A moment<br>of stillness.' : screen === 'victory' ? 'The hollow<br>is awake.' : screen === 'defeat' ? 'A spring<br>out of step.' : 'Something<br>still ticks.';
      description.textContent = screen === 'paused' ? 'Your journey is paused. The ruin can wait.' : screen === 'victory' ? 'The old bell rings again. Even forgotten things can find their rhythm.' : screen === 'defeat' ? 'Mind the gaps and copper thorns. Wind up and try the path again.' : 'A little brass keeper. A sleeping ruin. Find your footing and wake the bell beyond the aqueduct.';
      root.querySelector<HTMLElement>('.hollow-facts')!.hidden = screen !== 'title';
      results.hidden = !['victory', 'defeat'].includes(screen);
      for (const button of buttons) {
        const intent = button.dataset.intent;
        if (intent === 'fullscreen') continue;
        button.hidden = intent === 'pause' ? screen !== 'playing' : intent === 'start' ? screen !== 'title' : intent === 'resume' ? screen !== 'paused' : intent === 'restart' ? !['paused', 'defeat', 'victory'].includes(screen) : screen === 'playing';
        if (intent === 'restart') button.textContent = screen === 'paused' ? 'Restart journey' : screen === 'victory' ? 'Walk it again' : 'Try again';
      }
      for (const control of Object.values(controls)) control.disabled = screen !== 'playing';
      if (focus) { if (screen === 'playing') surface.focus({ preventScroll: true }); else buttons.find(b => !b.hidden)?.focus({ preventScroll: true }); }
    },
    update(run: Run) {
      const collected = run.collected.filter(Boolean).length;
      motes.textContent = `◇ ${collected} / ${run.level.motes.length}`;
      results.textContent = `${collected} / ${run.level.motes.length} wind-up motes · ${Math.floor(run.elapsed / 60)}:${String(Math.floor(run.elapsed % 60)).padStart(2, '0')} on the path`;
      hint.textContent = run.player.x < 380 ? 'A D / ← → MOVE · HOLD SPACE TO JUMP' : run.player.x < 810 ? 'HOLD FOR HEIGHT · RELEASE FOR A LITTLE HOP' : run.player.x < 2000 ? 'FOLLOW THE LIGHT · MIND THE COPPER THORNS' : run.player.x < 3600 ? 'FIND YOUR RHYTHM · THE BELL IS AHEAD' : 'ALMOST HOME · WAKE THE BELL';
    },
  };
}
