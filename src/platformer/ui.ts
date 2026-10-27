import { results as summarize, type Run } from './game.ts';
import type { Control } from './input.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'victory' | 'defeat' | 'interlude';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'quit' | 'fullscreen' | 'retry' | 'continue';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void) {
  root.innerHTML = `<header class="hollow-hud"><div class="hollow-brand"><span class="hollow-mark">◷</span><div>CLOCKWORK HOLLOW<small>THE WAKING AQUEDUCT</small></div></div>
    <div class="hollow-instruments"><output aria-label="Motes collected">◇ 0 / 12</output><output class="hollow-progress" aria-label="Journey progress"></output><button data-intent="pause">Pause <kbd>Ⅱ</kbd></button></div></header>
    <main class="hollow-stage"><div class="hollow-location" aria-hidden="true"><span>01</span><div>THE WAKING AQUEDUCT<small>Follow the light. Wake the bell.</small></div></div>
    <output class="hollow-announcement" role="status" aria-label="Checkpoint"></output><div class="hollow-menu-layer"><section class="hollow-menu" aria-labelledby="hollow-heading"><p class="hollow-eyebrow">A SMALL ADVENTURE IN FORGOTTEN MACHINERY</p><h1 id="hollow-heading">Something<br>still ticks.</h1><p class="hollow-description">A little brass keeper. A sleeping ruin.<br>Cross three forgotten districts and wake the bell above the clouds.</p>
    <div class="hollow-facts"><span>THREE HANDCRAFTED LEVELS</span><span>3–6 MINUTES</span></div><output class="hollow-results" aria-label="Adventure results" hidden></output>
    <div class="hollow-actions"><button class="hollow-primary" data-intent="start">Enter the hollow <span>→</span></button><button class="hollow-primary" data-intent="resume" hidden>Resume journey →</button><button class="hollow-primary" data-intent="continue" hidden>Continue journey →</button><button class="hollow-primary" data-intent="retry" hidden>Try again</button><button data-intent="restart" hidden>Restart journey</button><button data-intent="quit">Game selection</button></div>
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
  const announcement = root.querySelector('.hollow-announcement')!;
  let saved = '';
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
      heading.innerHTML = screen === 'paused' ? 'A moment<br>of stillness.' : screen === 'victory' ? 'The hollow<br>is awake.' : screen === 'interlude' ? 'Another bell.<br>Another dawn.' : screen === 'defeat' ? 'A spring<br>out of step.' : 'Something<br>still ticks.';
      description.textContent = screen === 'paused' ? 'Your journey is paused. The ruin can wait.' : screen === 'victory' ? 'The old bell rings again. Even forgotten things can find their rhythm.' : screen === 'interlude' ? 'A sleeping district finds its voice. Take a breath before the next crossing.' : screen === 'defeat' ? 'A missed step is only a moment. Your motes are safe. Return to your last lantern and try again.' : 'A little brass keeper. A sleeping ruin. Cross three forgotten districts and wake the bell above the clouds.';
      root.querySelector<HTMLElement>('.hollow-facts')!.hidden = screen !== 'title';
      results.hidden = !['victory', 'defeat', 'interlude'].includes(screen);
      for (const button of buttons) {
        const intent = button.dataset.intent;
        if (intent === 'fullscreen') continue;
        button.hidden = intent === 'pause' ? screen !== 'playing' : intent === 'start' ? screen !== 'title'
          : intent === 'resume' ? screen !== 'paused' : intent === 'continue' ? screen !== 'interlude'
          : intent === 'retry' ? screen !== 'defeat' : intent === 'restart' ? !['paused', 'defeat', 'victory', 'interlude'].includes(screen) : screen === 'playing';
        if (intent === 'restart') button.textContent = screen === 'victory' ? 'Walk it again' : 'Restart journey';
      }
      for (const control of Object.values(controls)) control.disabled = screen !== 'playing';
      if (focus) { if (screen === 'playing') surface.focus({ preventScroll: true }); else buttons.find(b => !b.hidden)?.focus({ preventScroll: true }); }
    },
    update(run: Run) {
      const collected = run.collected.filter(Boolean).length, tally = summarize(run);
      const time = `${Math.floor(run.elapsed / 60)}:${String(Math.floor(run.elapsed % 60)).padStart(2, '0')}`;
      motes.textContent = `◇ ${collected} / ${run.level.motes.length}`;
      root.querySelector('.hollow-progress')!.textContent = `${run.levelIndex + 1} / ${run.levels.length} · ${time}`;
      root.querySelector('.hollow-brand small')!.textContent = run.level.name.toUpperCase();
      root.querySelector('.hollow-location > span')!.textContent = `0${run.levelIndex + 1}`;
      const location = root.querySelector('.hollow-location > div')!;
      const checkpoint = run.level.checkpoints[run.checkpoint];
      const savedPoint = checkpoint ? `${run.level.name}: ${checkpoint.name} saved.` : '';
      if (savedPoint !== saved) { saved = savedPoint; announcement.textContent = saved; }
      const caption = `${run.level.name} · ${checkpoint ? `Saved: ${checkpoint.name}` : run.level.subtitle}`;
      if (location.textContent !== caption) location.textContent = caption;
      root.querySelector('[data-intent="retry"]')!.textContent = checkpoint ? 'Return to lantern →' : 'Try again';
      const next = run.levels[run.levelIndex + 1];
      root.querySelector('[data-intent="continue"]')!.textContent = next ? `Enter ${next.name} →` : 'Continue journey →';
      results.textContent = `${run.completed} / ${run.levels.length} bells awakened · ${tally.motes} / ${tally.total} wind-up motes\n${time} on the path · ${run.deaths} missed steps · ${tally.score.toLocaleString()} points${run.status === 'victory' ? `\n${tally.title}` : ''}`;
      if (run.status === 'interlude') description.textContent = `${run.level.name} is awake. Next: ${next?.name}. ${next?.subtitle}`;
      hint.textContent = run.levelIndex === 0 && run.player.x < 810 ? 'HOLD JUMP FOR HEIGHT · RELEASE FOR A LITTLE HOP'
        : checkpoint && Math.abs(run.player.x - checkpoint.x) < 220 ? 'LANTERN LIT · YOUR RETURN POINT IS SAVED'
        : run.levelIndex > 0 ? 'BLUE: SAFE · AMBER: WARNING · CORAL: PRESSURE · LAND ON BEETLES'
        : 'LAND ON BEETLES · TOUCH LANTERNS · FOLLOW THE MOTES';
    },
  };
}
