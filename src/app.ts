import { bindPageLifetime } from './browser/session.ts';
import { createRun, pauseRun, stepRun, takeEvents } from './game.ts';
import { validateContent } from './content-validation.ts';
import { releaseChoice, selectUpgrade } from './progression.ts';
import { createHost } from './browser/host.ts';
import { bindInput } from './browser/input.ts';
import { createClock, FIXED_STEP } from './browser/clock.ts';
import { createPresentation } from './presentation.ts';
import { createUI, type Screen, type MenuAction } from './ui.ts';
import { clearing, configurations, type ConfigurationId } from './content.ts';
import { themes, type ThemeId } from './themes.ts';
import { resolvedSkin, type InterfaceChoice, type Accent } from './interface.ts';
import { prepareAssets, type PreparedAssets } from './assets.ts';
import type { WorldPresentation } from './world-presentation.ts';
import { createScreenOverlay } from './screen-overlay.ts';
import { createSound } from './sound.ts';
import { createViewport, type ViewMode } from './view.ts';
import type { GameSession } from './application.ts';
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
  const host = createHost(container, { className: 'clearing-app', label: 'Last Light Clearing',
    surfaceLabel: 'Clearing arena. Move with WASD or arrow keys. Press Escape to pause. Drag to move with touch or mouse.',
    onDisplayChange: suspend,
    onFullscreenChange: () => ui.fullscreen(host.fullscreenAvailable, host.fullscreen) }), clock = createClock();
  let viewMode: ViewMode = 'close';
  let presentation: WorldPresentation;
  try { presentation = createPresentation(themes.woodland!); }
  catch (error) { host.dispose(); throw error; }
  let activeAssets: PreparedAssets | undefined;
  let preparation: AbortController | undefined;
  let generation = 0, preparing = false;
  let appearance: ThemeId = 'woodland', interfaceChoice: InterfaceChoice = 'match', accent: Accent = 'default';
  let configuration: ConfigurationId = 'clearing';
  const newRun = () => createRun(undefined, configurations[configuration].round);
  let run = newRun(), screen: Screen = 'title', disposed = false, suspendedChoice = false;
  const confirmations = new Set<string>(), pointers = new Set<number>();
  const input = bindInput(host.surface, () => screen === 'playing', host.signal);
  const sound = createSound(message => { if (!disposed) ui.soundStatus(message); });
  const ui = createUI(host.root, host.surface, {
    signal: host.signal, onAction: act, onChoose: choose, onExit,
    onConfiguration(id) {
      if (screen !== 'title') return;
      configuration = id; run = newRun(); pauseRun(run, true); presentation.reset(run); ui.update(run);
    },
    onTheme: selectTheme,
    onInterface(choice) { interfaceChoice = choice; applyInterface(); },
    onAccent(choice) { accent = choice; applyInterface(); },
    onMute: value => sound.setMuted(value), onVolume: value => sound.setVolume(value),
    onView(mode) { suspend(); viewMode = mode; },
    onFullscreen() {
      void host.toggleFullscreen().then(message => { if (!disposed) ui.displayStatus(message); });
    },
  });
  host.surface.prepend(presentation.canvas);
  const overlay = createScreenOverlay(host.surface);
  ui.fullscreen(host.fullscreenAvailable, host.fullscreen);
  async function selectTheme(id: ThemeId) {
    if (screen !== 'title' && screen !== 'paused') return;
    const theme = themes[id];
    if (!theme) return;
    preparation?.abort();
    const request = ++generation, controller = new AbortController();
    preparation = controller; preparing = true; ui.preparing(true);
    ui.assetStatus(`Preparing ${theme.name}…`);
    let next: WorldPresentation | undefined, bundle: PreparedAssets | undefined;
    try {
      if (theme.art) bundle = await prepareAssets(theme.art, controller.signal);
      if (controller.signal.aborted) return;
      if (theme.presentation === 'abyss') {
        const { createBloom } = await import('./vgpu/bloom.ts');
        if (controller.signal.aborted) return;
        next = await createBloom(theme, controller.signal, () => {
          if (presentation === next) graphicsFailure();
        });
      } else if (theme.presentation) {
        const { createGarden } = await import('./three/garden.ts');
        if (controller.signal.aborted) return;
        next = createGarden(theme, bundle?.images ?? {}, () => {
          if (presentation === next) graphicsFailure();
        });
      } else next = createPresentation(theme, bundle!.images);
      if (disposed || request !== generation || controller.signal.aborted) return;
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
      if (!disposed && request === generation) {
        ui.assetStatus(`Appearance unavailable (${error instanceof Error ? error.message : 'graphics initialization failed'}). Keeping current appearance and run.`);
        ui.appearance(appearance);
      }
    } finally {
      if (next !== presentation) next?.dispose();
      if (bundle !== activeAssets) bundle?.dispose();
      if (!disposed && request === generation) { preparing = false; ui.preparing(false); }
    }
  }
  function graphicsFailure() {
    if (disposed) return;
    suspend(); preparation?.abort(); generation++; preparing = false; ui.preparing(false);
    // A fresh 2D canvas is immediately usable, without requiring a lost GPU context.
    const fallback = createPresentation(themes.woodland!);
    fallback.reset(run); fallback.resize(host);
    fallback.draw(run, createViewport(clearing.arena, host, run.player, viewMode));
    const old = presentation;
    old.canvas.replaceWith(fallback.canvas); presentation = fallback;
    old.dispose(); activeAssets?.dispose(); activeAssets = undefined;
    appearance = 'woodland'; host.root.dataset.theme = appearance; applyInterface(); ui.appearance(appearance);
    ui.assetStatus('Graphics unavailable. Restored Lanternwood silhouettes. Your run is safe; use Resume when ready.');
  }
  function applyInterface() {
    host.root.dataset.skin = resolvedSkin(interfaceChoice, themes[appearance]!.interface);
    host.root.dataset.accent = accent;
  }
  host.root.dataset.theme = appearance;
  applyInterface();
  presentation.reset(run);
  selectTheme('woodland');

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
  host.root.addEventListener('focusout', () => {
    input.clear();
    queueMicrotask(() => {
      if (!disposed && (screen === 'playing' ? document.activeElement !== host.surface : !host.root.contains(document.activeElement))) suspend();
    });
  }, { signal: host.signal });
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
  function dispose() {
    if (disposed) return;
    disposed = true; preparation?.abort(); generation++; input.clear(); presentation.dispose(); activeAssets?.dispose(); overlay.dispose(); sound.dispose(); host.dispose();
  }
  return { dispose };
}
