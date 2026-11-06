import { defaultTheme } from '../../common/ui/theme-choices.ts';
import type { FullscreenControl } from '../../engine/browser/fullscreen.ts';
import { hollowSpriteImages } from './sprite-art.ts';
import { themes, appearanceNames, type Appearance } from './themes.ts';
import { createPreparationScope, createReadiness, trialReplacement } from '../../engine/browser/preparation.ts';
import { prepareImages } from '../../engine/browser/images.ts';
import { validateHollowSprites } from './asset-art.ts';
import type { PreparedImages } from '../../engine/browser/images.ts';
import { disposeAll } from '../../engine/disposal.ts';
import type { GameSession } from '../../engine/session.ts';
import { createHost } from '../../engine/browser/host.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import { createRun, pauseRun, stepRun, takeEvents, retryRun, nextLevel } from './game.ts';
import { bindInput } from './input.ts';
import { createPresentation } from './presentation.ts';
import type { LumenDrawingFactory } from './deluxe-presentation.ts';
import { createSound } from './sound.ts';
import { createUI, type Intent, type Screen } from './ui.ts';
import './style.css';

export function mountHollow(container: HTMLElement, onExit: () => void, fullscreen: FullscreenControl): GameSession {
  let disposed = false, run = createRun(), screen: Screen = 'title';
  const clock = createClock();
  const preparation = createPreparationScope();
  let activeAppearance: Appearance = 'arcade', activeArt: PreparedImages | undefined;
  const host = createHost(container, { fullscreen, className: 'hollow-app', label: 'Clockwork Hollow',
    surfaceLabel: 'Clockwork Hollow playfield. A D or arrows to move. Space, W, Up or Z to jump. Hold for height. P pauses or resumes.',
    onDisplayChange: suspend, onFullscreenChange: () => ui.fullscreen(host.fullscreenAvailable, host.fullscreen) });
  const readiness = createReadiness(host.signal, (state, retry) => ui.readiness(state, retry));
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
    let candidateDeluxe: LumenDrawingFactory | undefined;
    try {
      if (id === 'arcade') {
        const { prepareBellgarden } = await import('./assets.ts');
        if (!request.current()) return false;
        candidate = await prepareBellgarden(request.signal);
        if (!request.current()) return false;
      } else if (id === 'deluxe') {
        candidate = await prepareImages(hollowSpriteImages(), request.signal, dimensions => validateHollowSprites(dimensions));
        if (!request.current()) return false;
        const { createLumenDrawing } = await import('./deluxe-presentation.ts');
        if (!request.current()) return false;
        candidateDeluxe = createLumenDrawing;
      }
      // Validate the replacement against the current run before releasing active artwork.
      // The existing renderer keeps its camera, gait and bounded cosmetic effects.
      const replacement = presentation!.replaceTheme(themes[id], candidate!.images, candidateDeluxe);
      trialReplacement(replacement, () => presentation!.draw(run, host, screen, performance.now() / 1000));
      const previous = activeArt; activeArt = candidate; candidate = undefined;
      activeAppearance = id; host.root.dataset.appearance = id;
      readiness.watch(() => Promise.resolve());
      ui.appearanceStatus(id, ''); previous?.dispose();
      return true;
    } catch {
      if (request.current()) ui.appearanceStatus(activeAppearance,
        `Could not load ${appearanceNames[id]}. ${activeArt ? `Keeping ${appearanceNames[activeAppearance]}.` : 'Retry artwork or return to game selection.'} Your journey is preserved.`);
    } finally { candidate?.dispose(); }
    return false;
  }
  function act(intent: Intent) {
    if (disposed) return;
    if (intent === 'quit') { onExit(); return; }
    if (intent === 'pause') { suspend(); return; }
    if (intent === 'fullscreen') {
      void host.toggleFullscreen().then(message => { if (!disposed) ui.displayStatus(message); }); return;
    }
    if (document.hidden || !document.hasFocus() || !readiness.ready) return;
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
    ui = createUI(host.root, host.surface, host.signal, act, value => sound?.setMuted(value), id => {
      if (readiness.ready) void appearance(id); else readiness.watch(() => appearance(id));
    });
    presentation = createPresentation(host.surface);
    readiness.watch(() => appearance(defaultTheme(themes)));

    input = bindInput(host.surface, ui.controls, () => screen === 'playing', host.signal);
    bindSessionFocus(host.root, { signal: host.signal, clearInput: () => input?.clear(), suspend,
      shouldSuspend: () => screen === 'playing' && document.activeElement !== host.surface && !Object.values(ui.controls).includes(document.activeElement as HTMLButtonElement) });
    bindPageLifetime({ signal: host.signal, suspend, resetTiming: () => clock.reset(), dispose });
    ui.show('title'); ui.update(run); ui.fullscreen(host.fullscreenAvailable, host.fullscreen);
    host.start(now => {
      if (!readiness.ready) return;
      if (screen === 'playing') {
        const steps = clock.advance(now);
        for (let i = 0; i < steps && run.status === 'active'; i++) stepRun(run, input!.read(), FIXED_STEP);
        const events = takeEvents(run); presentation!.consume(events); sound!.consume(events, run.player);
        if (run.status === 'defeat' || run.status === 'victory' || run.status === 'interlude') transition(run.status);
      }
      try { presentation!.draw(run, host, screen, now / 1000); }
      catch { recoverGraphics(); }
      ui.update(run);
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
