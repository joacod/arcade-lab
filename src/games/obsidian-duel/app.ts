import { initialTheme } from '../../common/ui/theme-choices.ts';
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
import type { SanctumDrawingFactory } from './quality-presentation.ts';
import './style.css';
export function mountDuel(container: HTMLElement, onExit: () => void, fullscreen: FullscreenControl): GameSession {
  let disposed = false,
    selected: FighterId = 'nera',
    match = createMatch(),
    screen: Screen = 'title';
  const clock = createClock();
  const preparation = createPreparationScope();
  let activeAppearance: Appearance = 'normal',
    activeArt: PreparedImages | undefined;
  let ui: ReturnType<typeof createUI>;
  let input: ReturnType<typeof bindInput> | undefined, presentation: ReturnType<typeof createPresentation> | undefined, sound: ReturnType<typeof createSound> | undefined;
  const host = createHost(container, { fullscreen,
    className: 'duel-app',
    label: 'Obsidian Duel',
    surfaceLabel: 'Obsidian Duel playfield. A D move, W jump, S crouch, J light, K heavy, L special, Shift guard. P pauses or resumes.',
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
    if (disposed || activeAppearance === 'normal') return;
    const failed = appearanceNames[activeAppearance];
    preparation.cancel();
    suspend();
    const previous = activeArt;
    activeArt = undefined;
    presentation!.replaceTheme(themes.normal);
    activeAppearance = 'normal';
    host.root.dataset.appearance = 'normal';
    ui.appearanceStatus('normal', '');
    ui.displayStatus(`${failed} graphics interrupted. Restored Tempest citadel. Your match is preserved. Resume when ready.`);
    previous?.dispose();
    readiness.watch(() => presentation!.prepare());
    presentation!.draw(match, host, screen, performance.now() / 1000);
  }
  async function appearance(id: Appearance) {
    if (disposed || screen === 'playing') return false;
    const request = preparation.begin();
    if (id === activeAppearance) {
      if (id === 'normal' && !readiness.ready) {
        try { await presentation!.prepare(); } catch { return false; }
        if (!request.current()) return false;
      }
      ui.appearanceStatus(id, ''); return true;
    }
    ui.appearanceStatus(id, `Preparing ${appearanceNames[id]}…`, true);
    let candidate: PreparedImages | undefined;
    let candidateDrawing: SanctumDrawingFactory | undefined;
    try {
      if (id === 'assets') {
        const {
          prepareFoundry
        } = await import('./assets.ts');
        if (!request.current()) return false;
        candidate = await prepareFoundry(request.signal);
        if (!request.current()) return false;
      }
      if (id === 'quality') {
        const {
          prepareSanctum,
          createSanctumDrawing
        } = await import('./quality-assets.ts');
        if (!request.current()) return false;
        candidate = await prepareSanctum(request.signal);
        if (!request.current()) return false;
        candidateDrawing = createSanctumDrawing;
      }
      if (id === 'normal') {
        await presentation!.prepare();
        if (!request.current()) return false;
      }
      const replacement = presentation!.replaceTheme(themes[id], candidate?.images, candidateDrawing);
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
      if (request.current()) ui.appearanceStatus(activeAppearance, `Could not load ${appearanceNames[id]}. Keeping ${appearanceNames[activeAppearance]}. Your match is preserved.`);
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
    if (!readiness.ready && intent !== 'title') return;
    if (intent === 'title' && screen !== 'playing') {
      sound?.reset();
      match = createMatch(selected);
      presentation?.reset();
      transition('title');
      return;
    }
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
    });
    presentation = createPresentation(host.surface);
    readiness.watch(() => initialTheme === 'normal' ? presentation!.prepare() : appearance(initialTheme));
    host.root.dataset.appearance = 'normal';
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
      } catch (error) {
        if (activeAppearance !== 'normal') recoverGraphics();else throw error;
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
