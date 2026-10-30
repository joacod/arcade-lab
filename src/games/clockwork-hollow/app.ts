import { themes, appearanceNames, type Appearance } from './themes.ts';
import { createPreparationScope } from '../../engine/browser/preparation.ts';
import type { PreparedImages } from '../../engine/browser/images.ts';
import { disposeAll } from '../../engine/disposal.ts';
import type { GameSession } from '../../engine/session.ts';
import { createHost } from '../../engine/browser/host.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import { createRun, pauseRun, stepRun, takeEvents, retryRun, nextLevel } from './game.ts';
import { bindInput } from './input.ts';
import { createPresentation } from './presentation.ts';
import type { LumenDrawingFactory } from './quality-presentation.ts';
import { createSound } from './sound.ts';
import { createUI, type Intent, type Screen } from './ui.ts';
import './style.css';

export function mountHollow(container: HTMLElement, onExit: () => void): GameSession {
  let disposed = false, run = createRun(), screen: Screen = 'title';
  const clock = createClock();
  const preparation = createPreparationScope();
  let activeAppearance: Appearance = 'normal', activeArt: PreparedImages | undefined;
  const host = createHost(container, { className: 'hollow-app', label: 'Clockwork Hollow',
    surfaceLabel: 'Clockwork Hollow playfield. A D or arrows to move. Space, W, Up or Z to jump. Hold for height. P pauses or resumes.',
    onDisplayChange: suspend, onFullscreenChange: () => ui.fullscreen(host.fullscreenAvailable, host.fullscreen) });
  let sound: ReturnType<typeof createSound> | undefined;
  let input: ReturnType<typeof bindInput> | undefined;
  let presentation: ReturnType<typeof createPresentation> | undefined;
  let ui: ReturnType<typeof createUI>;
  function dispose() {
    if (disposed) return;
    disposed = true; preparation.dispose();
    disposeAll(() => input?.clear(), () => presentation?.dispose(), () => activeArt?.dispose(), () => sound?.dispose(), () => host.dispose());
  }
  function transition(next: Screen, focus = true) {
    if (next === 'playing') { preparation.cancel(); ui.appearanceStatus(activeAppearance, ''); }
    input?.clear(); clock.reset(); screen = next;
    if (next === 'paused' || next === 'title') sound?.pause();
    ui.show(next, focus); ui.update(run);
  }
  function suspend() {
    if (disposed) return;
    input?.clear(); clock.reset(); sound?.pause();
    if (screen === 'playing') { pauseRun(run, true); transition('paused', false); }
  }
  async function appearance(id: Appearance) {
    if (disposed || screen === 'playing') return;
    const request = preparation.begin();
    if (id === activeAppearance) { ui.appearanceStatus(id, ''); return; }
    ui.appearanceStatus(id, id === 'normal' ? '' : `Preparing ${appearanceNames[id]}…`);
    let candidate: PreparedImages | undefined;
    let candidateQuality: LumenDrawingFactory | undefined;
    try {
      if (id === 'assets') {
        const { prepareBellgarden } = await import('./assets.ts');
        if (!request.current()) return;
        candidate = await prepareBellgarden(request.signal);
        if (!request.current()) return;
      } else if (id === 'quality') {
        const { createLumenDrawing } = await import('./quality-presentation.ts');
        if (!request.current()) return;
        candidateQuality = createLumenDrawing;
      }
      // Validate the replacement against the current run before releasing active artwork.
      // The existing renderer keeps its camera, gait and bounded cosmetic effects.
      const replacement = presentation!.replaceTheme(themes[id], candidate?.images, candidateQuality);
      try { presentation!.draw(run, host, screen, performance.now() / 1000); }
      catch (error) { replacement.rollback(); throw error; }
      replacement.commit();
      const previous = activeArt; activeArt = candidate; candidate = undefined;
      activeAppearance = id; host.root.dataset.appearance = id;
      ui.appearanceStatus(id, ''); previous?.dispose();
    } catch {
      if (request.current()) ui.appearanceStatus(activeAppearance,
        `Could not load ${appearanceNames[id]}. Keeping ${appearanceNames[activeAppearance]}. Your journey is preserved.`);
    } finally { candidate?.dispose(); }
  }
  function act(intent: Intent) {
    if (disposed) return;
    if (intent === 'quit') { onExit(); return; }
    if (intent === 'pause') { suspend(); return; }
    if (intent === 'fullscreen') {
      void host.toggleFullscreen().then(message => { if (!disposed) ui.displayStatus(message); }); return;
    }
    if (document.hidden || !document.hasFocus()) return;
    if ((intent === 'start' && screen === 'title') || (intent === 'restart' && screen !== 'playing')) {
      sound?.reset(); sound?.activate(); run = createRun(); presentation?.reset(); transition('playing');
    } else if ((intent === 'retry' && screen === 'defeat') || (intent === 'continue' && screen === 'interlude')) {
      sound?.reset(); sound?.activate();
      if (intent === 'retry') retryRun(run); else nextLevel(run);
      presentation?.reset(); transition('playing');
    } else if (intent === 'resume' && screen === 'paused') {
      sound?.activate(); pauseRun(run, false); transition('playing');
    }
  }
  try {
    sound = createSound(message => { if (!disposed) ui.soundStatus(message); });
    ui = createUI(host.root, host.surface, host.signal, act, value => sound?.setMuted(value), appearance);
    presentation = createPresentation(host.surface);
    host.root.dataset.appearance = 'normal';
    input = bindInput(host.surface, ui.controls, () => screen === 'playing', host.signal);
    bindSessionFocus(host.root, { signal: host.signal, clearInput: () => input?.clear(), suspend,
      shouldSuspend: () => screen === 'playing' && document.activeElement !== host.surface && !Object.values(ui.controls).includes(document.activeElement as HTMLButtonElement) });
    bindPageLifetime({ signal: host.signal, suspend, resetTiming: () => clock.reset(), dispose });
    ui.show('title'); ui.update(run); ui.fullscreen(host.fullscreenAvailable, host.fullscreen);
    host.start(now => {
      if (screen === 'playing') {
        const steps = clock.advance(now);
        for (let i = 0; i < steps && run.status === 'active'; i++) stepRun(run, input!.read(), FIXED_STEP);
        const events = takeEvents(run); presentation!.consume(events); sound!.consume(events, run.player);
        if (run.status === 'defeat' || run.status === 'victory' || run.status === 'interlude') transition(run.status);
      }
      try { presentation!.draw(run, host, screen, now / 1000); }
      catch (error) {
        if (activeAppearance !== 'quality') throw error;
        suspend(); preparation.cancel();
        presentation!.replaceTheme(themes.normal).commit(); activeAppearance = 'normal';
        host.root.dataset.appearance = 'normal';
        ui.appearanceStatus('normal', 'Lumen Conservatory could not draw. Restored Verdant clockwork. Your journey is preserved.');
        presentation!.draw(run, host, screen, now / 1000);
      }
      ui.update(run);
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
