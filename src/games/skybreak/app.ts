import { createPreparationScope } from '../../engine/browser/preparation.ts';
import type { ThemeMode } from '../../common/ui/theme-select.ts';
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
import { themes } from './themes.ts';
import { prepareFlightArt } from './assets.ts';
import type { PreparedImages } from '../../engine/browser/images.ts';
import { prepareImages } from '../../engine/browser/images.ts';
import type { FlightPresentation } from './flight-presentation.ts';
import './style.css';

/** Browser session and composition. Restart replaces the entire mutable run. */
export function mountSkybreak(container: HTMLElement, onExit: () => void): GameSession {
  let disposed = false, run = createRun(), screen: Screen = 'title';
  const clock = createClock();
  let host: ReturnType<typeof createHost>;
  let sound: ReturnType<typeof createSound>;
  let ui: ReturnType<typeof createUI>;
  let input: ReturnType<typeof bindInput>;
  let presentation: FlightPresentation;
  let appearance: ThemeMode = 'normal';
  const preparation = createPreparationScope();
  let activeArt: PreparedImages | undefined;
  function dispose() {
    if (disposed) return;
    disposed = true;
    preparation.dispose();
    disposeAll(() => input?.clear(), () => presentation?.dispose(), () => activeArt?.dispose(), () => sound?.dispose(), () => host?.dispose());
  }
  try {
    host = createHost(container, { className: 'skybreak-app', label: 'Skybreak',
      surfaceLabel: 'Skybreak playfield. WASD or arrows to move, Space or J to fire, Shift or K to roll. Drag to steer and fire.',
      onDisplayChange: suspend, onFullscreenChange: () => ui.fullscreen(host.fullscreenAvailable, host.fullscreen) });
    sound = createSound(message => { if (!disposed) ui.soundStatus(message); });
    ui = createUI(host.root, host.surface, host.signal, act, value => sound.setMuted(value), selectTheme);
    input = bindInput(host.surface, ui.evade, () => screen === 'playing', host.signal);
    presentation = createPresentation(host.surface, themes.normal!);
    applyPalette();
    function applyPalette() {
      const theme = themes[appearance]!;
      host.root.dataset.theme = appearance; host.root.dataset.scene = theme.scene;
      host.root.style.setProperty('--menu-accent', theme.palette.accent);
      host.root.style.setProperty('--sky-accent', theme.palette.accent);
      host.root.style.setProperty('--sky-background', theme.palette.background);
    }
    async function selectTheme(id: ThemeMode) {
      const theme = themes[id];
      if (disposed || screen === 'playing' || !theme) return;
      const request = preparation.begin();
      ui.appearanceStatus(`Preparing ${theme.name}…`);
      let candidate: PreparedImages | undefined;
      let candidateDisplay: FlightPresentation | undefined;
      try {
        const staging = document.createElement('div');
        if (theme.quality) {
          const { createFoundry } = await import('./quality/foundry.ts');
          if (!request.current()) return;
          candidate = await prepareImages({ backdrop: theme.quality.backdrop }, request.signal, dimensions =>
            dimensions.backdrop?.width === 1024 && dimensions.backdrop.height === 1536 ? [] : ['Invalid foundry backdrop dimensions.']);
          if (!request.current()) return;
          const owner = createFoundry(theme, candidate.images, () => queueMicrotask(() => {
            if (!disposed && presentation === owner) recoverQuality();
          }));
          candidateDisplay = owner;
        } else {
          if (theme.art) candidate = await prepareFlightArt(theme.art, request.signal);
          if (!request.current()) return;
          candidateDisplay = createPresentation(staging, theme, { images: candidate?.images ?? {} });
        }
        if (!request.current()) return;
        // A candidate must draw the current sortie successfully before replacing its working owner.
        candidateDisplay.draw(run, host, screen === 'title' ? performance.now() / 1000 : undefined);
        const previousDisplay = presentation;
        host.surface.append(candidateDisplay.element); presentation = candidateDisplay; candidateDisplay = undefined;
        const previous = activeArt; activeArt = candidate; candidate = undefined;
        appearance = id; applyPalette(); ui.appearance(id); ui.appearanceStatus('');
        disposeAll(() => previousDisplay.dispose(), () => previous?.dispose());
      } catch {
        if (request.current()) {
          ui.appearance(appearance);
          ui.appearanceStatus(`Could not load ${theme.name}. Keeping ${themes[appearance]!.name}. Your sortie is preserved.`);
        }
      } finally { disposeAll(() => candidateDisplay?.dispose(), () => candidate?.dispose()); }
    }
    function recoverQuality() {
      if (disposed || appearance !== 'quality') return;
      suspend(); preparation.begin();
      const next = createPresentation(document.createElement('div'), themes.normal!);
      next.draw(run, host);
      const previous = presentation, previousArt = activeArt;
      host.surface.append(next.element); presentation = next; activeArt = undefined;
      appearance = 'normal'; applyPalette(); ui.appearance('normal');
      ui.appearanceStatus('Orbital Foundry graphics stopped. Pacific Run is ready. Your sortie is preserved.');
      disposeAll(() => previous.dispose(), () => previousArt?.dispose());
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
      if (intent === 'start' || intent === 'restart' || intent === 'resume') {
        preparation.begin(); ui.appearance(appearance); ui.appearanceStatus('');
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
    host.root.addEventListener('keydown', event => {
      if (event.code === 'Escape' && screen === 'playing') { event.preventDefault(); suspend(); }
    }, { signal: host.signal });
    bindSessionFocus(host.root, { signal: host.signal, clearInput: () => input.clear(), suspend,
      shouldSuspend: () => screen === 'playing' && document.activeElement !== host.surface && document.activeElement !== ui.evade });
    bindPageLifetime({ signal: host.signal, suspend, resetTiming: () => clock.reset(), dispose });
    ui.show('title'); ui.update(run); ui.fullscreen(host.fullscreenAvailable, host.fullscreen);
    host.start(now => {
      if (screen === 'playing') {
        const steps = clock.advance(now);
        for (let i = 0; i < steps && run.status === 'active'; i++) stepRun(run, input.read(), FIXED_STEP);
        const events = takeEvents(run); presentation.consume(events); sound.consume(events);
        if (run.status === 'victory' || run.status === 'defeat') transition(run.status);
      }
      try { presentation.draw(run, host, screen === 'title' ? now / 1000 : undefined); }
      catch (error) { if (appearance === 'quality') recoverQuality(); else throw error; }
      ui.update(run);
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
