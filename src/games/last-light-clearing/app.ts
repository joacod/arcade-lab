import { createPreparationScope } from '../../engine/browser/preparation.ts';
import { disposeAll } from '../../engine/disposal.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import { createRun, pauseRun, stepRun, takeEvents } from './game.ts';
import { validateContent } from './content-validation.ts';
import { releaseChoice, selectUpgrade } from './progression.ts';
import { createHost } from '../../engine/browser/host.ts';
import { bindInput } from './input.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { createPresentation } from './presentation.ts';
import { createUI, type Screen, type MenuAction } from './ui.ts';
import { clearing, configurations, type ConfigurationId } from './content.ts';
import { themes, type ThemeId } from './themes.ts';
import { prepareAssets } from './assets.ts';
import type { PreparedImages } from '../../engine/browser/images.ts';
import type { WorldPresentation } from './world-presentation.ts';
import { createScreenOverlay } from './screen-overlay.ts';
import { createSound } from './sound.ts';
import { createViewport } from './view.ts';
import type { GameSession } from '../../engine/session.ts';
import './style.css';

/** One browser session owns input, timing and disposal. Restart replaces the run. */
export function mountClearing(container: HTMLElement, onExit: () => void): GameSession {
  const errors = validateContent();
  if (errors.length) {
    const message = document.createElement('pre'); message.setAttribute('role', 'alert');
    message.textContent = `Cannot start Last Light Clearing:\n${errors.join('\n')}`;
    container.append(message);
    return { dispose: () => message.remove() };
  }
  let disposed = false;
  let host: ReturnType<typeof createHost>;
  let input: ReturnType<typeof bindInput>;
  let sound: ReturnType<typeof createSound>;
  let ui: ReturnType<typeof createUI>;
  let overlay: ReturnType<typeof createScreenOverlay>;
  let presentation: WorldPresentation;
  let activeAssets: PreparedImages | undefined;
  const preparation = createPreparationScope();
  function dispose() {
    if (disposed) return;
    disposed = true; preparation.dispose();
    disposeAll(() => input?.clear(), () => presentation?.dispose(), () => activeAssets?.dispose(),
      () => overlay?.dispose(), () => sound?.dispose(), () => host?.dispose());
  }
  try {
    host = createHost(container, { className: 'clearing-app', label: 'Last Light Clearing',
      surfaceLabel: 'Clearing arena. Move with WASD or arrow keys. Press Escape to pause. Drag to move with touch or mouse.',
      onDisplayChange: suspend,
      onFullscreenChange: () => ui.fullscreen(host.fullscreenAvailable, host.fullscreen) });
    const clock = createClock();
    const viewMode = 'close';
    presentation = createPresentation(themes.normal);
    let preparing = false;
    let appearance: ThemeId = 'normal';
    let configuration: ConfigurationId = 'clearing';
    const newRun = () => createRun(undefined, configurations[configuration].round);
    let run = newRun(), screen: Screen = 'title', suspendedChoice = false;
    const confirmations = new Set<string>(), pointers = new Set<number>();
    input = bindInput(host.surface, () => screen === 'playing', host.signal);
    sound = createSound(message => { if (!disposed) ui.soundStatus(message); });
    ui = createUI(host.root, host.surface, {
      signal: host.signal, onAction: act, onChoose: choose, onExit,
      onConfiguration(id) {
        if (screen !== 'title') return;
        configuration = id; run = newRun(); pauseRun(run, true); presentation.reset(run); ui.update(run);
      },
      onTheme: selectTheme,
      onMute: value => sound.setMuted(value),
      onFullscreen() {
        void host.toggleFullscreen().then(message => { if (!disposed) ui.displayStatus(message); });
      },
    });
    host.surface.prepend(presentation.canvas);
    overlay = createScreenOverlay(host.surface);
    ui.fullscreen(host.fullscreenAvailable, host.fullscreen);
    async function selectTheme(id: ThemeId) {
      if (disposed || screen === 'playing' || screen === 'choosing') return;
      const theme = themes[id];
      if (!theme) return;
      const request = preparation.begin(); preparing = true; ui.preparing(true);
      ui.assetStatus(`Preparing ${theme.name}…`);
      let next: WorldPresentation | undefined, bundle: PreparedImages | undefined;
      try {
        if (theme.art) bundle = await prepareAssets(theme.art, request.signal);
        if (!request.current()) return;
        if (theme.presentation === 'prism') {
          const { createGarden } = await import('./three/garden.ts');
          if (!request.current()) return;
          next = createGarden(theme, () => {
            if (presentation === next) graphicsFailure();
          });
        } else next = createPresentation(theme, bundle?.images);
        if (!request.current()) return;
        // Prepare and paint against the CURRENT run, including a retry made during loading.
        next.reset(run); next.resize(host);
        next.draw(run, createViewport(clearing.arena, host, run.player, viewMode));
        const old = presentation, oldAssets = activeAssets;
        presentation = next; activeAssets = bundle;
        old.canvas.replaceWith(next.canvas);
        appearance = id; host.root.dataset.theme = id; applyInterface();
        ui.appearance(id); ui.assetStatus('');
        old.dispose(); oldAssets?.dispose();
      } catch (error) {
        if (request.current()) {
          ui.assetStatus(`Appearance unavailable (${error instanceof Error ? error.message : 'graphics initialization failed'}). Keeping current appearance and run.`);
          ui.appearance(appearance);
        }
      } finally {
        if (next !== presentation) next?.dispose();
        if (bundle !== activeAssets) bundle?.dispose();
        if (request.current()) { preparing = false; ui.preparing(false); }
      }
    }
    function graphicsFailure() {
      if (disposed) return;
      suspend(); preparation.cancel(); preparing = false; ui.preparing(false);
      // A fresh 2D canvas is immediately usable, without requiring a lost GPU context.
      const fallback = createPresentation(themes.normal);
      fallback.reset(run); fallback.resize(host);
      fallback.draw(run, createViewport(clearing.arena, host, run.player, viewMode));
      const old = presentation;
      old.canvas.replaceWith(fallback.canvas); presentation = fallback;
      old.dispose(); activeAssets?.dispose(); activeAssets = undefined;
      appearance = 'normal'; host.root.dataset.theme = appearance; applyInterface(); ui.appearance(appearance);
      ui.assetStatus('Graphics unavailable. Restored Normal. Your run is safe; use Resume when ready.');
    }
    function applyInterface() {
      host.root.dataset.skin = themes[appearance].interface;
    }
    host.root.dataset.theme = appearance;
    applyInterface();
    presentation.reset(run);

    function transition(next: Screen, focus = true) {
      input.clear(); clock.reset(); screen = next;
      if (next === 'paused' || next === 'title') sound.pause();
      ui.show(screen, focus); ui.update(run);
    }
    function syncScreen(focus = true) {
      const next = run.outcome ?? (run.status === 'choosing' ? 'choosing' : run.status === 'paused' ? 'paused' : 'playing');
      if (next !== screen) transition(next, focus);
    }
    function choose(id: string) {
      if (disposed || screen !== 'choosing' || document.hidden || !document.hasFocus()) return;
      if (selectUpgrade(run, id)) { sound.activate(); input.clear(); clock.reset(); ui.update(run); }
    }
    function act(action: MenuAction) {
      if (disposed) return;
      if (preparing && ['start', 'restart', 'resume'].includes(action)) return;
      if (action === 'start' || action === 'restart') {
        if (document.hidden || !document.hasFocus()) return;
        sound.reset(); sound.activate();
        run = newRun(); suspendedChoice = false;
        presentation.reset(run); transition('playing');
      } else if (action === 'pause' && screen === 'playing') {
        pauseRun(run, true); syncScreen();
      } else if (action === 'resume' && screen === 'paused') {
        if (!document.hidden && document.hasFocus()) { sound.activate(); pauseRun(run, false); syncScreen(); }
      } else if (action === 'title') {
        sound.reset(); run = newRun(); pauseRun(run, true); suspendedChoice = false;
        presentation.reset(run); transition('title');
      }
    }
    function suspend() {
      if (disposed) return;
      sound.pause();
      input.clear(); clock.reset(); confirmations.clear(); pointers.clear();
      if (screen === 'choosing') suspendedChoice = true;
      else if (screen === 'playing') { pauseRun(run, true); syncScreen(false); }
    }
    bindPageLifetime({ signal: host.signal, suspend, resetTiming: () => clock.reset(), dispose });
    bindSessionFocus(host.root, { signal: host.signal, clearInput: () => input.clear(), suspend,
      shouldSuspend: () => screen === 'playing' ? document.activeElement !== host.surface : !host.root.contains(document.activeElement) });
    host.root.addEventListener('keydown', event => {
      if (event.code === 'Enter' || event.code === 'Space') confirmations.add(event.code);
    }, { signal: host.signal, capture: true });
    window.addEventListener('keyup', event => confirmations.delete(event.code), { signal: host.signal });
    host.root.addEventListener('pointerdown', event => pointers.add(event.pointerId), { signal: host.signal, capture: true });
    for (const name of ['pointerup', 'pointercancel'] as const) window.addEventListener(name, event => pointers.delete(event.pointerId), { signal: host.signal });
    host.root.addEventListener('keydown', event => {
      if (event.repeat || (event.code !== 'Escape' && event.code !== 'KeyP')) return;
      if (screen !== 'playing' && screen !== 'paused' && screen !== 'choosing') return;
      // Native fullscreen owns Escape; it may exit without dispatching a key event.
      if (event.code !== 'Escape' || !host.fullscreen) event.preventDefault();
      if (screen === 'playing') act('pause');
    }, { signal: host.signal });
    pauseRun(run, true); transition('title', false);
    host.start(now => {
      if (screen === 'choosing' && run.progression.confirming && !confirmations.size && !pointers.size
        && !document.hidden && document.hasFocus() && host.root.contains(document.activeElement)) {
        releaseChoice(run);
        if (run.status === 'active' && suspendedChoice) { pauseRun(run, true); suspendedChoice = false; }
        input.clear(); clock.reset(); syncScreen();
      }
      if (screen === 'playing') {
        const steps = clock.advance(now), move = input.read();
        for (let i = 0; i < steps && run.status === 'active'; i++) {
          stepRun(run, move, FIXED_STEP); presentation.observe(run);
        }
        syncScreen();
      }
      const events = takeEvents(run);
      presentation.consume(events); sound.consume(events);
      const view = createViewport(clearing.arena, host, run.player, viewMode);
      try { presentation.resize(host); presentation.draw(run, view, screen === 'title' ? { titleTime: now / 1000 } : undefined); } catch { graphicsFailure(); }
      overlay.draw(run, view, host, input.stick);
      ui.update(run);
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
