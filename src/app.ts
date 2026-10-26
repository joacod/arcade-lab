import { createRun, pauseRun, stepRun, takeEvents } from './game.ts';
import { validateContent } from './content-validation.ts';
import { releaseChoice, selectUpgrade } from './progression.ts';
import { createHost } from './browser/host.ts';
import { bindInput } from './browser/input.ts';
import { createClock, FIXED_STEP } from './browser/clock.ts';
import { createPresentation } from './presentation.ts';
import { createUI, type Screen, type MenuAction } from './ui.ts';
import { configurations, type ConfigurationId } from './content.ts';
import { themes, type ThemeId } from './themes.ts';
import { createAssets } from './assets.ts';
import { createSound } from './sound.ts';

/** One browser session owns input, timing and disposal. Restart replaces the run. */
export function mountClearing(container: HTMLElement): { dispose(): void } {
  const errors = validateContent();
  if (errors.length) {
    const message = document.createElement('pre'); message.setAttribute('role', 'alert');
    message.textContent = `Cannot start Last Light Clearing:\n${errors.join('\n')}`;
    container.append(message);
    return { dispose: () => message.remove() };
  }
  const host = createHost(container), clock = createClock();
  const presentation = createPresentation(host.ctx, themes.woodland);
  let configuration: ConfigurationId = 'clearing';
  const newRun = () => createRun(undefined, configurations[configuration].round);
  let run = newRun(), screen: Screen = 'title', disposed = false, suspendedChoice = false;
  const confirmations = new Set<string>(), pointers = new Set<number>();
  const input = bindInput(host.canvas, () => host.viewport, () => screen === 'playing', host.signal);
  const sound = createSound(message => { if (!disposed) ui.soundStatus(message); });
  const assets = createAssets((image, message) => {
    if (disposed) return;
    presentation.setImage(image); ui.assetStatus(message);
  });
  const ui = createUI(host.root, host.canvas, act, choose, host.signal, id => {
    if (screen !== 'title') return;
    configuration = id; run = newRun(); pauseRun(run, true); presentation.reset(); ui.update(run);
  }, selectTheme, value => sound.setMuted(value), value => sound.setVolume(value));
  function selectTheme(id: ThemeId) {
    if (screen !== 'title') return;
    host.root.dataset.theme = id;
    presentation.setTheme(themes[id]); assets.load(themes[id]);
  }
  selectTheme('woodland');

  function transition(next: Screen, focus = true) {
    input.clear(); clock.reset(); screen = next;
    if (next === 'paused' || next === 'title') sound.pause();
    ui.show(screen, focus);
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
    if (action === 'start' || action === 'restart') {
      if (document.hidden || !document.hasFocus()) return;
      sound.activate(); sound.reset();
      run = newRun(); suspendedChoice = false;
      presentation.reset(); transition('playing');
    } else if (action === 'pause' && screen === 'playing') {
      pauseRun(run, true); syncScreen();
    } else if (action === 'resume' && screen === 'paused') {
      if (!document.hidden && document.hasFocus()) { sound.activate(); pauseRun(run, false); syncScreen(); }
    } else if (action === 'title') {
      sound.reset(); run = newRun(); pauseRun(run, true); suspendedChoice = false;
      presentation.reset(); transition('title');
    }
  }
  function suspend() {
    sound.pause();
    input.clear(); clock.reset(); confirmations.clear(); pointers.clear();
    if (screen === 'choosing') suspendedChoice = true;
    else if (screen === 'playing') { pauseRun(run, true); syncScreen(false); }
  }
  window.addEventListener('blur', suspend, { signal: host.signal });
  window.addEventListener('pagehide', suspend, { signal: host.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend(); else clock.reset();
  }, { signal: host.signal });
  host.root.addEventListener('focusout', () => {
    input.clear();
    queueMicrotask(() => {
      if (!disposed && (screen === 'playing' ? document.activeElement !== host.canvas : !host.root.contains(document.activeElement))) suspend();
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
    event.preventDefault();
    if (screen !== 'choosing') act(screen === 'playing' ? 'pause' : 'resume');
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
      for (let i = 0; i < steps && run.status === 'active'; i++) stepRun(run, move, FIXED_STEP);
      syncScreen();
    }
    const events = takeEvents(run);
    presentation.consume(events); sound.consume(events);
    presentation.draw(run, host.viewport, host.width, host.height, host.ratio, input.stick);
    ui.update(run);
  });
  return {
    dispose() {
      if (disposed) return;
      disposed = true; input.clear(); assets.dispose(); sound.dispose(); host.dispose();
    },
  };
}
