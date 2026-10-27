import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import type { GameSession } from '../../engine/session.ts';
import { createHost } from '../../engine/browser/host.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { createRun, pauseRun, stepRun, takeEvents } from './game.ts';
import { bindInput } from './input.ts';
import { createPresentation } from './presentation.ts';
import { createSound } from './sound.ts';
import { createUI, type Intent, type Screen } from './ui.ts';
import './style.css';

/** Browser session and composition. Restart replaces the entire mutable run. */
export function mountSkybreak(container: HTMLElement, onExit: () => void): GameSession {
  let disposed = false, run = createRun(), screen: Screen = 'title';
  const clock = createClock();
  let host: ReturnType<typeof createHost>;
  let sound: ReturnType<typeof createSound>;
  let ui: ReturnType<typeof createUI>;
  let input: ReturnType<typeof bindInput>;
  let presentation: ReturnType<typeof createPresentation>;
  function dispose() {
    if (disposed) return;
    disposed = true;
    try { input?.clear(); presentation?.dispose(); sound?.dispose(); }
    finally { host?.dispose(); }
  }
  try {
    host = createHost(container, { className: 'skybreak-app', label: 'Skybreak',
      surfaceLabel: 'Skybreak playfield. WASD or arrows to move, Space or J to fire, Shift or K to roll. Drag to steer and fire.',
      onDisplayChange: suspend, onFullscreenChange() {} });
    sound = createSound(message => { if (!disposed) ui.soundStatus(message); });
    ui = createUI(host.root, host.surface, host.signal, act, value => sound.setMuted(value));
    input = bindInput(host.surface, ui.evade, () => screen === 'playing', host.signal);
    presentation = createPresentation(host.surface);
    function transition(next: Screen, focus = true) {
      input.clear(); clock.reset(); screen = next;
      if (next === 'paused' || next === 'title') sound.pause();
      ui.show(next, focus); ui.update(run);
    }
    function act(intent: Intent) {
      if (disposed) return;
      if (intent === 'quit') { onExit(); return; }
      if (intent === 'pause') { suspend(); return; }
      if (document.hidden || !document.hasFocus()) return;
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
    ui.show('title'); ui.update(run);
    host.start(now => {
      if (screen === 'playing') {
        const steps = clock.advance(now);
        for (let i = 0; i < steps && run.status === 'active'; i++) stepRun(run, input.read(), FIXED_STEP);
        const events = takeEvents(run); presentation.consume(events); sound.consume(events);
        if (run.status === 'victory' || run.status === 'defeat') transition(run.status);
      }
      presentation.draw(run, host, screen === 'title' ? now / 1000 : undefined);
      ui.update(run);
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
