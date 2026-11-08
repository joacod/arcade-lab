import { defaultTheme } from '../../common/ui/theme-choices.ts';
import type { FullscreenControl } from '../../engine/browser/fullscreen.ts';
import { createPreparationScope, createReadiness } from '../../engine/browser/preparation.ts';
import { disposeAll } from '../../engine/disposal.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import type { GameSession } from '../../engine/session.ts';
import { createHost } from '../../engine/browser/host.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { createRun, pauseRun, stepRun, takeEvents } from './game.ts';
import { bindInput } from './input.ts';
import { createPresentation } from './presentation.ts';
import { createSound } from './sound.ts';
import { createUI, type Intent, type Screen } from './ui.ts';
import { themes, type Appearance } from './themes.ts';
import { prepareFlightImages } from './assets.ts';
import type { PreparedImages } from '../../engine/browser/images.ts';
import type { FlightPresentation } from './flight-presentation.ts';
import './style.css';

/** Browser session and composition. Restart replaces the entire mutable run. */
export function mountSkybreak(container: HTMLElement, onExit: () => void, fullscreen: FullscreenControl): GameSession {
  let disposed = false, run = createRun(), screen: Screen = 'title';
  const clock = createClock();
  let host: ReturnType<typeof createHost>;
  let sound: ReturnType<typeof createSound>;
  let ui: ReturnType<typeof createUI>;
  let input: ReturnType<typeof bindInput>;
  let presentation: FlightPresentation;
  let appearance: Appearance = 'arcade';
  const preparation = createPreparationScope();
  let activeArt: PreparedImages | undefined;
  function dispose() {
    if (disposed) return;
    disposed = true;
    preparation.dispose();
    disposeAll(() => input?.clear(), () => presentation?.dispose(), () => activeArt?.dispose(), () => sound?.dispose(), () => host?.dispose());
  }
  try {
    host = createHost(container, { fullscreen, className: 'skybreak-app', label: 'Skybreak',
      surfaceLabel: 'Skybreak playfield. WASD or arrows to move, Space or J to fire, Shift or K to roll. P pauses or resumes. Drag to steer and fire.',
      onDisplayChange: suspend, onFullscreenChange: () => ui.fullscreen(host.fullscreenAvailable, host.fullscreen) });
    sound = createSound(message => { if (!disposed) ui.soundStatus(message); });
    ui = createUI(host.root, host.surface, host.signal, act, value => sound.setMuted(value), id => {
      if (readiness.ready) void selectTheme(id); else readiness.watch(() => selectTheme(id));
    });
    input = bindInput(host.surface, ui.controls, () => screen === 'playing', host.signal, ui.directions);
    presentation = createPresentation(host.surface, themes.arcade, { images: {} });
    const readiness = createReadiness(host.signal, (state, retry) => ui.readiness(state, retry));
    readiness.watch(() => selectTheme(defaultTheme(themes)));
    applyPalette();
    function applyPalette() {
      const theme = themes[appearance]!;
      host.root.dataset.theme = appearance;
      host.root.style.setProperty('--menu-accent', theme.palette.accent);
      host.root.style.setProperty('--sky-accent', theme.palette.accent);
      host.root.style.setProperty('--sky-background', theme.palette.background);
    }
    async function selectTheme(id: Appearance) {
      const theme = themes[id];
      if (disposed || screen === 'playing' || !theme) return false;
      const request = preparation.begin();
      ui.appearancePending(id); ui.appearanceStatus(`Preparing ${theme.name}…`);
      let candidate: PreparedImages | undefined;
      let candidateDisplay: FlightPresentation | undefined;
      try {
        const staging = document.createElement('div');
        candidate = await prepareFlightImages(theme, request.signal);
        if (!request.current()) return false;
        candidateDisplay = createPresentation(staging, theme, { images: candidate.images });
        if (!request.current()) return false;
        await candidateDisplay.prepare();
        if (!request.current()) return false;
        // A candidate must draw the current sortie successfully before replacing its working owner.
        candidateDisplay.draw(run, host, screen === 'title' ? performance.now() / 1000 : undefined);
        const previousDisplay = presentation;
        host.surface.append(candidateDisplay.element); presentation = candidateDisplay; candidateDisplay = undefined;
        const previous = activeArt; activeArt = candidate; candidate = undefined;
        appearance = id; applyPalette(); ui.appearance(id); ui.appearanceStatus('');
        readiness.watch(() => presentation.prepare());
        disposeAll(() => previousDisplay.dispose(), () => previous?.dispose());
        return true;
      } catch {
        if (request.current()) {
          ui.appearance(appearance);
          ui.appearanceStatus(`Could not load ${theme.name}. ${activeArt ? `Keeping ${themes[appearance]!.name}.` : 'Retry artwork or return to game selection.'} Your sortie is preserved.`);
        }
      } finally { disposeAll(() => candidateDisplay?.dispose(), () => candidate?.dispose()); }
      return false;
    }
    function recoverPresentation() {
      if (disposed) return;
      const failed = appearance;
      suspend(); preparation.cancel();
      presentation.dispose(); activeArt?.dispose(); activeArt = undefined;
      delete host.root.dataset.theme;
      let reportFailure = failed === 'arcade';
      ui.appearanceStatus(`Graphics interrupted. Your run is preserved. ${reportFailure ? 'Retry artwork to continue.' : 'Recovering Arcade; resume when ready.'}`);
      readiness.watch(() => {
        if (reportFailure) { reportFailure = false; return Promise.resolve(false); }
        return selectTheme('arcade');
      });
    }
    function transition(next: Screen, focus = true) {
      input.clear(); clock.reset(); screen = next;
      if (next === 'paused' || next === 'title') sound.pause();
      ui.show(next, focus); ui.update(run);
    }
    function act(intent: Intent) {
      if (disposed) return;
      if (intent === 'quit') { onExit(); return; }
      if (intent === 'pause') { suspend(); return; }
      if (intent === 'fullscreen') {
        void host.toggleFullscreen().then(message => { if (!disposed) ui.displayStatus(message); }); return;
      }
      if (document.hidden || !document.hasFocus()) return;
      if (!readiness.ready) return;
      if (intent === 'start' || intent === 'restart' || intent === 'resume') {
        preparation.cancel(); ui.appearance(appearance); ui.appearanceStatus('');
      }
      if ((intent === 'start' && screen === 'title') || (intent === 'restart' && screen !== 'playing')) {
        sound.reset(); sound.activate(); run = createRun(); presentation.reset(); transition('playing');
      } else if (intent === 'resume' && screen === 'paused') {
        sound.activate(); pauseRun(run, false); transition('playing');
      }
    }
    function suspend() {
      if (disposed) return;
      input.clear(); clock.reset(); sound.pause();
      if (screen === 'playing') { pauseRun(run, true); transition('paused', false); }
    }
    bindSessionFocus(host.root, { signal: host.signal, surface: host.surface, playing: () => screen === 'playing', clearInput: () => input.clear(), suspend,
      shouldSuspend: () => screen === 'playing' && document.activeElement !== host.surface && !Object.values(ui.controls).includes(document.activeElement as HTMLButtonElement) });
    bindPageLifetime({ signal: host.signal, suspend, resetTiming: () => clock.reset(), dispose });
    ui.show('title'); ui.update(run); ui.fullscreen(host.fullscreenAvailable, host.fullscreen);
    host.start(now => {
      if (!readiness.ready) return;
      if (screen === 'playing') {
        const steps = clock.advance(now);
        for (let i = 0; i < steps && run.status === 'active'; i++) stepRun(run, input.read(), FIXED_STEP);
        const events = takeEvents(run); presentation.consume(events); sound.consume(events);
        if (run.status === 'victory' || run.status === 'defeat') transition(run.status);
      }
      try { presentation.draw(run, host, screen === 'title' ? now / 1000 : undefined); }
      catch { recoverPresentation(); }
      ui.update(run);
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
