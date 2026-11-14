import type { FullscreenControl } from '../../engine/browser/fullscreen.ts';
import type { GameSession } from '../../engine/session.ts';
import { createHost } from '../../engine/browser/host.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { disposeAll } from '../../engine/disposal.ts';
import { createGameMenu, menuActions, type CommonMenuIntent } from '../../common/ui/menu.ts';
import { createThemeChoices } from '../../common/ui/theme-choices.ts';
import { contentErrors } from './content-validation.ts';
import { createRun, dispatch, startScene, stepRun, takeEvents, type Command } from './game.ts';
import { bindInput } from './input.ts';
import { createPresentation } from './presentation.ts';
import { createSound } from './sound.ts';
import { createSaveStore } from './storage.ts';
import { createUI } from './ui.ts';
import './style.css';
type Screen = 'title' | 'playing' | 'paused' | 'victory';
export function mountAdventure(container: HTMLElement, onExit: () => void, fullscreen: FullscreenControl): GameSession {
  let disposed = false, screen: Screen = 'title', run = createRun(), savedRevision = -1, presentationTime = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = createClock();
  let host: ReturnType<typeof createHost>, ui: ReturnType<typeof createUI>, input: ReturnType<typeof bindInput>;
  let presentation: ReturnType<typeof createPresentation>, sound: ReturnType<typeof createSound>;
  let menu: ReturnType<typeof createGameMenu<CommonMenuIntent, Screen>>, saves: ReturnType<typeof createSaveStore>;
  function dispose() {
    if (disposed) return; disposed = true;
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
    ui = createUI(host.root, host.surface, host.signal, send);
    sound = createSound(message => { if (!disposed) menu?.soundStatus(message); });
    presentation = createPresentation(host.surface);
    input = bindInput(host.surface, ui.controls, () => screen === 'playing' && !run.dialogue, send, host.signal);
    let storage: Pick<Storage, 'getItem' | 'setItem'>;
    try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error('Storage unavailable'); }, setItem() { throw new Error('Storage unavailable'); } }; }
    const saveInfo = document.createElement('p');
    saves = createSaveStore(storage, message => { saveInfo.textContent = message; });
    const savedButtons = document.createElement('div'); savedButtons.className = 'adventure-saves';
    const current = document.createElement('button'); current.type = 'button'; current.textContent = 'Continue saved adventure';
    const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Restore previous save';
    current.addEventListener('click', () => load(false), { signal: host.signal }); previous.addEventListener('click', () => load(true), { signal: host.signal });
    savedButtons.append(current, previous);
    const details = document.createElement('div');
    const newRunNotice = document.createElement('p'); newRunNotice.textContent = 'Play and Restart begin a new case. Autosave keeps the latest state and one previous state, replacing them as you progress.';
    const premise = document.createElement('p'); premise.textContent = 'Blackthorn Castle, 1889. A skeptical detective, a stubborn ghost household, and one client who has forgotten to mention something. No deaths, no unwinnable choices. Local autosave after completed interactions.';
    details.append(premise, savedButtons, newRunNotice, saveInfo);
    const themes = createThemeChoices({ modes: { prototype: {} }, value: 'prototype', signal: host.signal, onChange() {} }); themes.setValue('prototype');
    menu = createGameMenu<CommonMenuIntent, Screen>(host.root, host.surface, ui.scene, {
      id: 'guest', title: 'The Thirteenth Guest', signal: host.signal, pause: ui.pause,
      gameplayUI: [ui.header, ui.toolbar, ui.overlay, ui.feedback, ui.dialogue], theme: themes.element, game: details,
      controls: '<p>Click a person, object or doorway to interact. Wren walks there before acting. Click the floor to walk. Tab and Enter also reach scene targets.</p><p>Choose an item from <b>Inventory (I)</b>, then click its destination. <b>Combine…</b> lets you choose a second inventory item. <b>Cancel (X)</b> puts away the item or stops an approach.</p><p>The <b>Casebook (B)</b> holds evidence and the conversation journal. Select two clues, then propose a conclusion.</p><p>Escape closes a panel or cancels a selected item or approach before pausing. Progress saves automatically after completed interactions.</p>',
      actions: [menuActions.start, menuActions.resume, { ...menuActions.restart, screens: ['paused', 'victory'] }, { ...menuActions.quit, screens: ['title', 'paused', 'victory'] }],
      onAction: act, onMute: value => sound.setMuted(value), onFullscreen: () => { void host.toggleFullscreen().then(message => { if (!disposed) menu.displayStatus(message); }); },
    });
    menu.readiness('ready', () => {}); menu.fullscreen(host.fullscreenAvailable, host.fullscreen);
    host.root.dataset.theme = 'prototype';
    ui.pause.addEventListener('click', () => act('pause'), { signal: host.signal });
    bindPageLifetime({ signal: host.signal, suspend, resetTiming: () => clock.reset(), dispose });
    bindSessionFocus(host.root, { signal: host.signal, surface: host.surface, playing: () => screen === 'playing', clearInput: input.clear,
      shouldSuspend: () => screen === 'playing' && !host.root.contains(document.activeElement), suspend });
    function refreshSaves() { newRunNotice.hidden = !saves.available() && !saves.available(true); current.hidden = !saves.available(); previous.hidden = !saves.available(true); }
    function show(next: Screen, focus = true) {
      screen = next; clock.reset(); input.clear(); refreshSaves();
      menu.description.textContent = next === 'title' ? 'A comic ghost mystery · playable Prototype' : next === 'victory' ? 'The castle was haunted. The ghosts were never the problem.' : 'Your investigation is waiting.';
      savedButtons.hidden = next !== 'title'; premise.hidden = next === 'victory';
      menu.show(next, focus);
      if (next === 'victory') menu.heading.textContent = 'Case closed';
      ui.update(run, true);
      if (next === 'playing' && focus) ui.focusPlay();
    }
    function load(backup: boolean) {
      const loaded = saves.load(backup); if (!loaded) return;
      run = loaded; savedRevision = run.saveRevision; ui.reset(); sound.reset(); sound.activate(); show(run.status === 'complete' ? 'victory' : 'playing');
    }
    function act(intent: CommonMenuIntent) {
      if (disposed) return;
      if (intent === 'quit') { dispose(); onExit(); return; }
      if (intent === 'pause') { suspend(); return; }
      if (intent === 'start' || intent === 'restart') {
        run = createRun(); savedRevision = -1; presentationTime = 0; ui.reset(); sound.reset(); sound.activate(); startScene(run, 'intro'); show('playing');
      } else if (intent === 'resume') { sound.activate(); show('playing'); }
    }
    function send(command: Command) {
      if (disposed || screen !== 'playing') return;
      dispatch(run, command); ui.update(run);
    }
    show('title');
    host.start(now => {
      if (screen === 'playing') {
        for (const action of input.read().pressed) ui.action(action);
        for (let steps = clock.advance(now); steps > 0; steps--) { stepRun(run, FIXED_STEP); presentationTime += FIXED_STEP; }
        ui.update(run); sound.consume(takeEvents(run));
        if (!run.pending && !run.dialogue && run.saveRevision !== savedRevision) { savedRevision = run.saveRevision; saves.write(run); }
        if (run.status === 'complete') show('victory');
      }
      presentation.draw(run, host, debug, reduced, presentationTime);
    });
    return { dispose };
  } catch (error) { dispose(); throw error; }
}
