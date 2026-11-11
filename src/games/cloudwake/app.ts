import type { FullscreenControl } from '../../engine/browser/fullscreen.ts';
import { createHost } from '../../engine/browser/host.ts';
import { createReadiness } from '../../engine/browser/preparation.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { disposeAll } from '../../engine/disposal.ts';
import type { GameSession } from '../../engine/session.ts';
import { continueRun, createRun, pauseRun, stepRun, takeEvents } from './game.ts';
import { bindInput } from './input.ts';
import { createPresentation } from './presentation.ts';
import { createSound } from './sound.ts';
import { createUI, type Intent, type Screen } from './ui.ts';
import './style.css';

export function mountCloudwake(container: HTMLElement, onExit: () => void, fullscreen: FullscreenControl): GameSession {
  let disposed = false, screen: Screen = 'title', run = createRun();
  const clock = createClock();
  let outcomeAt = 0;
  let host: ReturnType<typeof createHost>, ui: ReturnType<typeof createUI>, input: ReturnType<typeof bindInput>;
  let presentation: ReturnType<typeof createPresentation>, sound: ReturnType<typeof createSound>;
  function dispose() {
    if (disposed) return;
    disposed = true;
    disposeAll(() => input?.clear(), () => presentation?.dispose(), () => sound?.dispose(), () => host?.dispose());
  }
  try {
    host = createHost(container, { fullscreen, className: 'cloudwake-app', label: 'Cloudwake',
      surfaceLabel: 'Cloudwake playfield. Hold Space, mouse or touch to rise. Release to fall. P pauses.',
      onDisplayChange: suspend, onFullscreenChange: () => ui.fullscreen(host.fullscreenAvailable, host.fullscreen) });
    sound = createSound(message => { if (!disposed) ui.soundStatus(message); });
    ui = createUI(host.root, host.surface, host.signal, act, value => sound.setMuted(value));
    input = bindInput(host.surface, ui.thrust, () => screen === 'playing', host.signal);
    presentation = createPresentation(host.surface);
    const readiness = createReadiness(host.signal, (state, retry) => {
      ui.readiness(state, retry);
      if (state === 'ready' && screen === 'title' && document.hasFocus()
        && document.activeElement === host.root.querySelector('[data-menu-action="quit"]')) ui.launchButtons[0]!.focus({ preventScroll: true });
    });
    readiness.watch(() => presentation.prepare().then(() => { if (!disposed) presentation.draw(run, host); }));
    host.root.dataset.theme = 'arcade';

    function transition(next: Screen, focus = true) {
      input.clear(); clock.reset(); screen = next;
      if (next === 'paused' || next === 'title') sound.pause();
      ui.update(run); ui.show(next, focus);
    }
    function act(intent: Intent) {
      if (disposed) return;
      if (intent === 'quit') { onExit(); return; }
      if (intent === 'pause') { suspend(); return; }
      if (intent === 'fullscreen') { void host.toggleFullscreen().then(message => { if (!disposed) ui.displayStatus(message); }); return; }
      if (!readiness.ready || document.hidden || !document.hasFocus()) return;
      if ((intent === 'start' && screen === 'title') || (intent === 'restart' && screen !== 'playing')) {
        sound.reset(); sound.activate();
        run = createRun(crypto.getRandomValues(new Uint32Array(1))[0]);
        presentation.reset(); transition('playing');
      } else if (intent === 'continue' && screen === 'crashed' && continueRun(run)) {
        sound.reset(); sound.activate(); presentation.reset(); transition('playing');
      } else if (intent === 'resume' && screen === 'paused') {
        sound.activate(); pauseRun(run, false); transition('playing');
      }
    }
    function suspend() {
      if (disposed) return;
      input?.clear(); clock.reset(); sound?.pause();
      if (screen === 'playing') { pauseRun(run, true); transition('paused', false); }
    }
    // Start on press, preserving that same hold in the fresh run. Native clicks
    // remain available for keyboard/assistive activation through the shared menu.
    for (const button of ui.launchButtons) button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || button.hidden || button.disabled) return;
      event.preventDefault(); act(button.dataset.menuAction as Intent);
      if (screen === 'playing') input.holdPointer(event);
    }, { signal: host.signal });
    host.root.addEventListener('keydown', event => {
      if (event.code !== 'Space' || event.repeat || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      if (!ui.launchButtons.includes(event.target as HTMLButtonElement)) return;
      event.preventDefault(); act((event.target as HTMLButtonElement).dataset.menuAction as Intent);
      if (screen === 'playing') input.holdKey(event.code);
    }, { signal: host.signal, capture: true });
    bindSessionFocus(host.root, { signal: host.signal, surface: host.surface, playing: () => screen === 'playing', clearInput: () => input.clear(), suspend,
      shouldSuspend: () => screen === 'playing' && document.activeElement !== host.surface && document.activeElement !== ui.thrust });
    bindPageLifetime({ signal: host.signal, suspend, resetTiming: () => clock.reset(), dispose });
    ui.update(run); ui.show('title'); ui.fullscreen(host.fullscreenAvailable, host.fullscreen);
    host.start(now => {
      if (!readiness.ready) return;
      if (screen === 'playing') {
        const steps = clock.advance(now);
        for (let i = 0; i < steps && run.status === 'active'; i++) stepRun(run, input.read(), FIXED_STEP);
        const events = takeEvents(run); presentation.consume(events); sound.consume(events, run.thrust);
        if (run.status === 'crashed' || run.status === 'defeat') {
          outcomeAt = now;
          transition(run.status);
        }
      }
      try { presentation.draw(run, host, screen === 'title' ? now / 1000 : undefined, screen === 'crashed' || screen === 'defeat' ? (now - outcomeAt) / 1000 : 0); }
      catch {
        suspend(); presentation.dispose();
        let report = true;
        readiness.watch(() => {
          if (report) { report = false; return Promise.resolve(false); }
          presentation.dispose();
          presentation = createPresentation(host.surface);
          return presentation.prepare().then(() => { if (!disposed) presentation.draw(run, host); });
        });
      }
      ui.update(run);
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
