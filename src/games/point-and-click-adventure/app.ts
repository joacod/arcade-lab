import type { FullscreenControl } from '../../engine/browser/fullscreen.ts';
import type { GameSession } from '../../engine/session.ts';
import { createHost } from '../../engine/browser/host.ts';
import { createPreparationScope, createReadiness } from '../../engine/browser/preparation.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { disposeAll } from '../../engine/disposal.ts';
import { createGameMenu, menuActions, type CommonMenuIntent } from '../../common/ui/menu.ts';
import { createThemeChoices } from '../../common/ui/theme-choices.ts';
import { contentErrors } from './content-validation.ts';
import { createRun, dispatch, introduce, stepRun, takeEvents, type Command } from './game.ts';
import { bindInput } from './input.ts';
import { createPresentation } from './presentation.ts';
import { arcadeArt, appearances, type Appearance } from './art.ts';
import { createSound } from './sound.ts';
import { createSaveStore } from './storage.ts';
import { rooms } from './content.ts';
import { createUI } from './ui.ts';
import './style.css';
type Screen = 'title' | 'playing' | 'paused' | 'victory';
export function mountAdventure(container: HTMLElement, onExit: () => void, fullscreen: FullscreenControl): GameSession {
  let disposed = false, screen: Screen = 'title', run = createRun(), savedRevision = -1, presentationTime = 0;
  let appearance: Appearance = 'arcade';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = createClock();
  const preparation = createPreparationScope();
  let host: ReturnType<typeof createHost>, ui: ReturnType<typeof createUI>, input: ReturnType<typeof bindInput>;
  let presentation: ReturnType<typeof createPresentation> | undefined, sound: ReturnType<typeof createSound>;
  let menu: ReturnType<typeof createGameMenu<CommonMenuIntent, Screen>>, saves: ReturnType<typeof createSaveStore>;
  function dispose() {
    if (disposed) return; disposed = true;
    preparation.dispose();
    disposeAll(() => input?.clear(), () => presentation?.dispose(), () => sound?.dispose(), () => host?.dispose());
  }
  try {
    const errors = contentErrors();
    if (errors.length) throw new Error(`Invalid adventure content: ${errors.join('; ')}`);
    const debug = import.meta.env.DEV && new URLSearchParams(window.location.search).has('adventureDebug');
    function suspend() {
      input?.clear(); clock.reset();
      if (screen === 'playing') { sound.pause(); show('paused', false); }
    }
    host = createHost(container, { fullscreen, className: 'adventure-game', label: 'The Thirteenth Guest',
      surfaceLabel: 'Blackthorn Castle. Click people to talk, objects to investigate and doorways to enter. Tab and Enter also activate scene targets. I opens inventory, B opens the casebook, X cancels, P pauses.',
      onDisplayChange: suspend, onFullscreenChange: () => menu?.fullscreen(host.fullscreenAvailable, host.fullscreen) });
    ui = createUI(host.root, host.surface, host.signal, send, id => presentation?.itemIcon(id));
    sound = createSound(message => { if (!disposed) menu?.soundStatus(message); });
    input = bindInput(host.surface, ui.controls, () => screen === 'playing' && !run.dialogue, send, host.signal);
    let storage: Pick<Storage, 'getItem' | 'setItem'>;
    try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error('Storage unavailable'); }, setItem() { throw new Error('Storage unavailable'); } }; }
    const saveInfo = document.createElement('p'); saveInfo.hidden = true;
    saves = createSaveStore(storage, message => { saveInfo.textContent = message; saveInfo.hidden = !message; });
    const savedButtons = document.createElement('div'); savedButtons.className = 'adventure-saves';
    const current = document.createElement('button'); current.type = 'button'; current.textContent = 'Continue saved adventure';
    const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Recover backup adventure';
    current.addEventListener('click', () => load(false), { signal: host.signal }); previous.addEventListener('click', () => load(true), { signal: host.signal });
    savedButtons.append(current, previous);
    const details = document.createElement('div');
    const newRunNotice = document.createElement('p'); newRunNotice.textContent = 'Play starts a new case.';
    const premise = document.createElement('p'); premise.textContent = 'Blackthorn Castle, 1889. A skeptical detective, a stubborn ghost household, and one client who has forgotten to mention something.';
    const artStatus = document.createElement('p'); artStatus.setAttribute('role', 'status'); artStatus.hidden = true;
    function artworkStatus(message: string) { artStatus.textContent = message; artStatus.hidden = !message; }
    details.append(premise, savedButtons, newRunNotice, saveInfo, artStatus);
    const themes = createThemeChoices<Appearance>({ modes: appearances, value: 'arcade', names: appearances, signal: host.signal, onChange(value) {
      if (disposed || screen === 'playing') return;
      if (!readiness.ready) readiness.watch(() => prepareArtwork(value));
      else void prepareArtwork(value);
    } });
    menu = createGameMenu<CommonMenuIntent, Screen>(host.root, host.surface, ui.scene, {
      id: 'guest', title: 'The Thirteenth Guest', signal: host.signal, pause: ui.pause,
      gameplayUI: [ui.header, ui.toolbar, ui.overlay, ui.feedback, ui.dialogue], theme: themes.element, game: details,
      controls: '<p>Click a person, object or doorway to interact. Wren walks there before acting. Click the floor to walk. Tab and Enter also reach scene targets.</p><p>The satchel in the upper-right corner opens <b>Inventory (I)</b>. Click an item to select it and return to the scene, then click its target. To combine, choose <b>Combine items</b> first, then two items. Combinations and their results stay inside Inventory. <b>Cancel (X)</b> puts away the item or stops an approach.</p><p>The book beside the satchel opens the <b>Casebook (B)</b>, with evidence and the conversation journal. Read your evidence or choose <b>Connect clues</b> to select a pair and make a deduction. Search the journal by person, place or words and expand an entry to reread it.</p><p>Use Close or the panel’s I / B shortcut to return to the scene. Escape belongs to browser fullscreen. Progress saves automatically after completed interactions.</p>',
      actions: [menuActions.start, menuActions.resume, { ...menuActions.restart, screens: ['paused', 'victory'] }, { ...menuActions.quit, screens: ['title', 'paused', 'victory'] }],
      onAction: act, onMute: value => sound.setMuted(value), onFullscreen: () => { void host.toggleFullscreen().then(message => { if (!disposed) menu.displayStatus(message); }); },
    });
    const readiness = createReadiness(host.signal, (state, retry) => {
      menu.readiness(state, retry); current.disabled = previous.disabled = state !== 'ready';
    });
    menu.fullscreen(host.fullscreenAvailable, host.fullscreen);
    async function prepareArtwork(value: Appearance) {
      if (disposed || screen === 'playing') return false;
      const request = preparation.begin();
      if (value === appearance && presentation) { themes.setValue(appearance); artworkStatus(''); return true; }
      themes.prepare(value); artworkStatus(`Preparing ${appearances[value]}…`);
      let candidate: ReturnType<typeof createPresentation> | undefined;
      try {
        const art = value === 'arcade' ? arcadeArt : (await import('./deluxe.ts')).deluxeArt;
        if (!request.current()) return false;
        candidate = createPresentation(document.createElement('div'), art);
        const display = candidate, cancel = () => display.dispose();
        request.signal.addEventListener('abort', cancel, { once: true });
        await candidate.prepare();
        if (!request.current()) return false;
        candidate.draw(run, host, debug, reduced, presentationTime);
        const previous = presentation;
        host.surface.append(candidate.canvas); presentation = candidate; candidate = undefined;
        request.signal.removeEventListener('abort', cancel);
        appearance = value; host.root.dataset.theme = value; themes.setValue(value); artworkStatus('');
        if (screen === 'title') menu.description.textContent = `Point & click adventure · ${appearances[value]}`;
        ui.artworkChanged(); ui.update(run, true); previous?.dispose();
        return true;
      } catch {
        if (request.current()) {
          themes.setValue(appearance);
          artworkStatus(`Could not load ${appearances[value]}. ${presentation ? `Keeping ${appearances[appearance]}.` : 'Retry artwork or choose another theme.'}`);
        }
        return false;
      } finally { candidate?.dispose(); }
    }
    function cancelArtwork() { preparation.cancel(); themes.setValue(appearance); artworkStatus(''); }
    readiness.watch(() => prepareArtwork('arcade'));
    function recoverArtwork() {
      const failed = appearance;
      suspend(); preparation.cancel(); presentation?.dispose(); presentation = undefined;
      delete host.root.dataset.theme;
      let reportFailure = failed === 'arcade';
      artworkStatus(`Graphics interrupted. Your case is preserved. ${reportFailure ? 'Retry artwork to continue.' : 'Recovering Arcade; resume when ready.'}`);
      readiness.watch(() => {
        if (reportFailure) { reportFailure = false; return Promise.resolve(false); }
        return prepareArtwork('arcade');
      });
    }
    ui.pause.addEventListener('click', () => act('pause'), { signal: host.signal });
    bindPageLifetime({ signal: host.signal, suspend, resetTiming: () => clock.reset(), dispose });
    bindSessionFocus(host.root, { signal: host.signal, surface: host.surface, playing: () => screen === 'playing', clearInput: input.clear,
      shouldSuspend: () => screen === 'playing' && !host.root.contains(document.activeElement), suspend });
    function refreshSaves() { newRunNotice.hidden = !saves.available() && !saves.available(true); current.hidden = !saves.available(); previous.hidden = saves.available() || !saves.available(true); }
    function show(next: Screen, focus = true) {
      screen = next; clock.reset(); input.clear(); refreshSaves();
      menu.description.textContent = next === 'title' ? `Point & click adventure · ${appearances[appearance]}` : next === 'victory' ? 'The castle was haunted. The ghosts were never the problem.' : rooms[run.room].name;
      savedButtons.hidden = next !== 'title'; premise.hidden = next !== 'title'; newRunNotice.hidden ||= next !== 'title';
      menu.show(next, focus);
      if (next === 'victory') menu.heading.textContent = 'Case closed';
      ui.update(run, true);
      if (next === 'playing' && focus) ui.focusPlay();
    }
    function load(backup: boolean) {
      if (!readiness.ready) return;
      const loaded = saves.load(backup); if (!loaded) return;
      cancelArtwork();
      run = loaded; savedRevision = run.saveRevision; presentationTime = 0; presentation?.reset(); ui.reset(); sound.reset(); sound.activate(); show(run.status === 'complete' ? 'victory' : 'playing');
    }
    function act(intent: CommonMenuIntent) {
      if (disposed) return;
      if (intent === 'quit') { dispose(); onExit(); return; }
      if (intent === 'pause') { suspend(); return; }
      if (!readiness.ready) return;
      cancelArtwork();
      if (intent === 'start' || intent === 'restart') {
        run = createRun(); savedRevision = -1; presentationTime = 0; presentation?.reset(); ui.reset(); sound.reset(); sound.activate(); introduce(run); show('playing'); ui.showLetter();
      } else if (intent === 'resume') { sound.activate(); show('playing'); }
    }
    function send(command: Command) {
      if (disposed || !readiness.ready || screen !== 'playing') return;
      dispatch(run, command);
      if (!run.pending) presentation?.react(command, presentationTime);
      ui.update(run);
    }
    show('title');
    host.start(now => {
      if (!readiness.ready) return;
      if (screen === 'playing') {
        for (const action of input.read().pressed) ui.action(action);
        for (let steps = clock.advance(now); steps > 0; steps--) { stepRun(run, FIXED_STEP); presentationTime += FIXED_STEP; }
        ui.update(run); sound.consume(takeEvents(run));
        if (!run.pending && !run.dialogue && run.saveRevision !== savedRevision) { savedRevision = run.saveRevision; saves.write(run); }
        if (run.status === 'complete') show('victory');
      }
      try { presentation?.draw(run, host, debug, reduced, screen === 'title' ? now / 1000 : presentationTime); }
      catch { recoverArtwork(); }
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
