import { themes, type Appearance } from './themes.ts';
import { disposeAll } from '../../engine/disposal.ts';
import type { GameSession } from '../../engine/session.ts';
import { createHost } from '../../engine/browser/host.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import { createRun, nextMission, pauseRun, stepRun, takeEvents } from './game.ts';
import { bindInput } from './input.ts';
import { createPresentation } from './presentation.ts';
import { createSound } from './sound.ts';
import { createUI, type Intent, type Screen } from './ui.ts';
import './style.css';
export function mountBlastline(container: HTMLElement, onExit: () => void): GameSession {
  let disposed = false, run = createRun(), screen: Screen = 'title';
  const clock = createClock();
  const host = createHost(container, { className: 'blast-app', label: 'Blastline',
    surfaceLabel: 'Blastline playfield. A D move, Space jump, J fire, W S aim, K grenade, Q switch operator. P pauses or resumes.',
    onDisplayChange: suspend, onFullscreenChange: () => ui.fullscreen(host.fullscreenAvailable, host.fullscreen) });
  let sound: ReturnType<typeof createSound> | undefined;
  let input: ReturnType<typeof bindInput> | undefined;
  let presentation: ReturnType<typeof createPresentation> | undefined;
  let ui: ReturnType<typeof createUI>;
  function dispose() {
    if (disposed) return;
    disposed = true; disposeAll(() => input?.clear(), () => presentation?.dispose(), () => sound?.dispose(), () => host.dispose());
  }
  function transition(next: Screen, focus = true) {
    input?.clear(); clock.reset(); screen = next;
    if (next === 'paused' || next === 'title') sound?.pause();
    ui.show(next, focus); ui.update(run);
  }
  function suspend() {
    if (disposed) return;
    input?.clear(); clock.reset(); sound?.pause();
    if (screen === 'playing') { pauseRun(run, true); transition('paused', false); }
  }
  function appearance(id: Appearance) {
    if (disposed || screen === 'playing') return;
    presentation?.applyTheme(themes[id]);
    host.root.dataset.appearance = id;
  }
  function act(intent: Intent) {
    if (disposed) return;
    if (intent === 'quit') { onExit(); return; }
    if (intent === 'pause') { suspend(); return; }
    if (intent === 'fullscreen') { void host.toggleFullscreen().then(message => { if (!disposed) ui.displayStatus(message); }); return; }
    if (document.hidden || !document.hasFocus()) return;
    if (intent === 'start' && screen === 'title' || intent === 'restart' && screen !== 'playing') {
      sound?.reset(); sound?.activate(); run = createRun(); presentation?.reset(); ui.reset(); transition('playing');
    } else if (intent === 'continue' && screen === 'interlude') {
      sound?.reset(); sound?.activate(); nextMission(run); presentation?.reset(); ui.reset(); transition('playing');
    } else if (intent === 'resume' && screen === 'paused') { sound?.activate(); pauseRun(run, false); transition('playing'); }
  }
  try {
    sound = createSound(message => { if (!disposed) ui.soundStatus(message); });
    ui = createUI(host.root, host.surface, host.signal, act, value => sound?.setMuted(value), appearance);
    presentation = createPresentation(host.surface);
    appearance('normal');
    input = bindInput(host.surface, ui.controls, () => screen === 'playing', host.signal);
    bindSessionFocus(host.root, { signal: host.signal, clearInput: () => input?.clear(), suspend,
      shouldSuspend: () => screen === 'playing' && document.activeElement !== host.surface && !Object.values(ui.controls).includes(document.activeElement as HTMLButtonElement) });
    bindPageLifetime({ signal: host.signal, suspend, resetTiming: () => clock.reset(), dispose });
    ui.show('title'); ui.update(run); ui.fullscreen(host.fullscreenAvailable, host.fullscreen);
    host.start(now => {
      if (screen === 'playing') {
        const steps = clock.advance(now);
        for (let i = 0; i < steps && run.status === 'active'; i++) stepRun(run, input!.read(), FIXED_STEP);
        const events = takeEvents(run); presentation!.consume(events); sound!.consume(events, run.player); ui.consume(events, run);
        if (run.status === 'defeat' || run.status === 'victory' || run.status === 'interlude') transition(run.status);
      }
      presentation!.draw(run, host, screen === 'playing', now / 1000); ui.update(run);
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
