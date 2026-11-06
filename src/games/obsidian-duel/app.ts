import { defaultTheme } from '../../common/ui/theme-choices.ts';
import type { FullscreenControl } from '../../engine/browser/fullscreen.ts';
import { themes, appearanceNames, type Appearance } from './themes.ts';
import { createPreparationScope, createReadiness, trialReplacement } from '../../engine/browser/preparation.ts';
import type { PreparedImages } from '../../engine/browser/images.ts';
import { disposeAll } from '../../engine/disposal.ts';
import type { GameSession } from '../../engine/session.ts';
import { createHost } from '../../engine/browser/host.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import { createMatch, pauseMatch, stepMatch, takeEvents } from './game.ts';
import type { FighterId } from './content.ts';
import { bindInput } from './input.ts';
import { createUI, type Intent, type Screen } from './ui.ts';
import { createPresentation } from './presentation.ts';
import { createSound } from './sound.ts';
import type { SanctumDrawingFactory } from './deluxe-presentation.ts';
import './style.css';
export function mountDuel(container: HTMLElement, onExit: () => void, fullscreen: FullscreenControl): GameSession {
  let disposed = false,
    selected: FighterId = 'nera',
    match = createMatch(),
    screen: Screen = 'title';
  const clock = createClock();
  const preparation = createPreparationScope();
  let activeAppearance: Appearance = 'arcade',
    activeArt: PreparedImages | undefined;
  let ui: ReturnType<typeof createUI>;
  let input: ReturnType<typeof bindInput> | undefined, presentation: ReturnType<typeof createPresentation> | undefined, sound: ReturnType<typeof createSound> | undefined;
  const host = createHost(container, { fullscreen,
    className: 'duel-app',
    label: 'Obsidian Duel',
    surfaceLabel: 'Obsidian Duel playfield.',
    onDisplayChange: suspend,
    onFullscreenChange: () => ui.fullscreen(host.fullscreenAvailable, host.fullscreen)
  });
  const readiness = createReadiness(host.signal, (state, retry) => ui.readiness(state, retry));
  function dispose() {
    if (disposed) return;
    disposed = true;
    preparation.dispose();
    disposeAll(() => input?.clear(), () => presentation?.dispose(), () => activeArt?.dispose(), () => sound?.dispose(), () => host.dispose());
  }
  function transition(next: Screen, focus = true) {
    if (next === 'playing') {
      preparation.cancel();
      ui.appearanceStatus(activeAppearance, '');
    }
    input?.clear();
    clock.reset();
    screen = next;
    if (next === 'paused' || next === 'title') sound?.pause();
    ui.show(next, focus);
    ui.update(match);
  }
  function suspend() {
    if (disposed) return;
    input?.clear();
    clock.reset();
    sound?.pause();
    if (screen === 'playing') {
      pauseMatch(match, true);
      transition('paused', false);
    }
  }
  function recoverGraphics() {
    if (disposed) return;
    const failed = activeAppearance;
    suspend(); preparation.cancel();
    activeArt?.dispose(); activeArt = undefined;
    // Release corrupted Canvas state and mode-owned effects before preparing Arcade.
    presentation!.dispose(); presentation = createPresentation(host.surface);
    delete host.root.dataset.appearance;
    let reportFailure = failed === 'arcade';
    ui.displayStatus(`${appearanceNames[failed]} graphics interrupted. Your run is preserved. ${reportFailure ? 'Retry artwork to continue.' : 'Recovering Arcade; resume when ready.'}`);
    readiness.watch(() => {
      if (reportFailure) { reportFailure = false; return Promise.resolve(false); }
      return appearance('arcade');
    });
  }
  async function appearance(id: Appearance) {
    if (disposed || screen === 'playing' || !Object.hasOwn(themes, id)) return false;
    const request = preparation.begin();
    if (id === activeAppearance && activeArt) { ui.appearanceStatus(id, ''); return true; }
    ui.appearanceStatus(id, `Preparing ${appearanceNames[id]}…`, true);
    let candidate: PreparedImages | undefined;
    let candidateDrawing: SanctumDrawingFactory | undefined;
    try {
      if (id === 'arcade') {
        const {
          prepareFoundry
        } = await import('./assets.ts');
        if (!request.current()) return false;
        candidate = await prepareFoundry(request.signal);
        if (!request.current()) return false;
      }
      if (id === 'deluxe') {
        const {
          prepareSanctum,
          createSanctumDrawing
        } = await import('./deluxe-assets.ts');
        if (!request.current()) return false;
        candidate = await prepareSanctum(request.signal);
        if (!request.current()) return false;
        candidateDrawing = createSanctumDrawing;
      }
      const replacement = presentation!.replaceTheme(themes[id], candidate!.images, candidateDrawing);
      trialReplacement(replacement, () => presentation!.draw(match, host, screen, performance.now() / 1000));
      const previous = activeArt;
      activeArt = candidate;
      candidate = undefined;
      activeAppearance = id;
      host.root.dataset.appearance = id;
      readiness.watch(() => Promise.resolve());
      input?.clear();
      clock.reset();
      ui.appearanceStatus(id, '');
      previous?.dispose();
      return true;
    } catch {
      if (request.current()) ui.appearanceStatus(activeAppearance, `Could not load ${appearanceNames[id]}. ${activeArt ? `Keeping ${appearanceNames[activeAppearance]}.` : 'Retry artwork or return to game selection.'} Your match is preserved.`);
    } finally {
      candidate?.dispose();
    }
    return false;
  }
  function act(intent: Intent) {
    if (disposed) return;
    if (intent === 'quit') {
      onExit();
      return;
    }
    if (intent === 'pause') {
      suspend();
      return;
    }
    if (intent === 'fullscreen') {
      void host.toggleFullscreen().then(message => {
        if (!disposed) ui.displayStatus(message);
      });
      return;
    }
    if (document.hidden || !document.hasFocus()) return;
    if (!readiness.ready) return;
    if (intent === 'start' && screen === 'title' || intent === 'restart' && screen !== 'playing') {
      sound?.reset();
      sound?.activate();
      match = createMatch(selected);
      presentation?.reset();
      transition('playing');
    } else if (intent === 'resume' && screen === 'paused') {
      sound?.activate();
      pauseMatch(match, false);
      transition('playing');
    }
  }
  try {
    sound = createSound(message => {
      if (!disposed) ui.soundStatus(message);
    });
    ui = createUI(host.root, host.surface, host.signal, act, id => {
      if (screen === 'title') {
        selected = id;
        match = createMatch(id);
        presentation?.reset();
        ui.update(match);
      }
    }, value => sound?.setMuted(value), id => {
      if (readiness.ready) void appearance(id); else readiness.watch(() => appearance(id));
    }, layout => input?.setLayout(layout));
    presentation = createPresentation(host.surface);
    readiness.watch(() => appearance(defaultTheme(themes)));

    input = bindInput(host.surface, ui.controls, () => screen === 'playing' && match.phase === 'fight', host.signal);
    bindSessionFocus(host.root, {
      signal: host.signal,
      clearInput: () => input?.clear(),
      suspend,
      shouldSuspend: () => screen === 'playing' && document.activeElement !== host.surface && !Object.values(ui.controls).includes(document.activeElement as HTMLButtonElement)
    });
    bindPageLifetime({
      signal: host.signal,
      suspend,
      resetTiming: () => clock.reset(),
      dispose
    });
    ui.show('title');
    ui.update(match);
    ui.fullscreen(host.fullscreenAvailable, host.fullscreen);
    host.start(now => {
      if (!readiness.ready) return;
      if (screen === 'playing') {
        const steps = clock.advance(now);
        for (let i = 0; i < steps && match.status === 'active'; i++) {
          const phase = match.phase;
          stepMatch(match, input!.read(), FIXED_STEP);
          const events = takeEvents(match);
          presentation!.consume(events);
          sound!.consume(events);
          if (match.phase !== phase) {
            input!.clear();
            clock.reset();
            break;
          }
        }
        if (match.status === 'victory' || match.status === 'defeat') transition(match.status);
      }
      try {
        presentation!.draw(match, host, screen, now / 1000);
      } catch {
        recoverGraphics();
      }
      ui.update(match);
    });
    return {
      dispose
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
