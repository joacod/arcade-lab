import './menu.css';
import type { Readiness } from '../../engine/browser/preparation.ts';

export interface MenuAction<Action extends string, Screen extends string> {
  id: Action;
  label: string;
  screens: readonly Screen[];
  primary?: boolean;
  /** Navigation remains available when required artwork fails. */
  requiresReady?: boolean;
}
/** Shared vocabulary, availability and hierarchy for every game. */
export const menuActions = {
  start: { id: 'start', label: 'Play', screens: ['title'], primary: true },
  resume: { id: 'resume', label: 'Resume', screens: ['paused'], primary: true },
  restart: { id: 'restart', label: 'Restart', screens: ['paused', 'victory', 'defeat'], primary: true },
  title: { id: 'title', label: 'Main menu', screens: ['paused', 'victory', 'defeat'], requiresReady: false },
  quit: { id: 'quit', label: 'Game selection', screens: ['title', 'paused', 'victory', 'defeat'], requiresReady: false },
} as const;
export type CommonMenuIntent = keyof typeof menuActions | 'pause' | 'fullscreen';
const screenHeadings: Readonly<Record<string, string>> = { paused: 'Paused', victory: 'Victory', defeat: 'Defeat', interlude: 'Stage complete' };
interface MenuOptions<Action extends string, Screen extends string> {
  title: string;
  /** Stable, session-local ID for the menu heading. */
  id: string;
  actions: readonly MenuAction<Action, Screen>[];
  onAction(action: Action): void;
  onMute(muted: boolean): void;
  onFullscreen(): void;
  signal: AbortSignal;
  pause: HTMLButtonElement;
  /** HUD and touch-control containers retain their space behind menus. */
  gameplayUI: Iterable<HTMLElement>;
  /** Composed game content. Only supply sections the game actually needs. */
  game?: HTMLElement;
  /** New-run choices, shown on the title screen beside appearance when space allows. */
  setup?: HTMLElement;
  theme: HTMLElement;
  /** Secondary preferences, separate from game setup and retained-run results. */
  preferences?: HTMLElement;
  controls: string | HTMLElement;
}

/** Presentation only: games retain their transition rules, configuration and run state. */
export function createGameMenu<Action extends string, Screen extends string>(root: HTMLElement, surface: HTMLElement, stage: HTMLElement, config: MenuOptions<Action, Screen>) {
  root.dataset.menuOwner = '';
  stage.dataset.menuStage = '';
  for (const element of config.gameplayUI) {
    element.dataset.menuGameplay = '';
    // Routine HUD values are readouts, not a stream of screen-reader announcements.
    for (const output of element.querySelectorAll('output:not([aria-live]):not([role])')) output.setAttribute('aria-live', 'off');
  }
  const layer = document.createElement('div'); layer.className = 'game-menu-layer';
  layer.innerHTML = `<section class="game-menu" aria-labelledby="${config.id}-heading">
    <header class="game-menu-header"><p class="game-menu-eyebrow">ARCADE LAB <span aria-hidden="true">/</span> <span class="game-menu-name">${config.title}</span></p><h1 id="${config.id}-heading">${config.title}</h1></header>
    <div class="game-menu-body" tabindex="0" role="region" aria-label="Game details">
      <div class="game-menu-main">
        <p class="game-menu-description"></p>
        <div class="game-menu-settings"><div class="game-menu-theme"></div></div>
        <div class="game-menu-setup" hidden></div>
        <div class="game-menu-content"></div>
        <div class="game-menu-utilities"><button type="button" class="game-menu-mute" aria-label="Mute sound" aria-keyshortcuts="S" aria-pressed="false">Mute sound (S)</button><button type="button" class="game-menu-fullscreen" hidden aria-keyshortcuts="F">Fullscreen (F)</button></div>
      </div>
      <div class="game-menu-preferences" hidden><div class="game-menu-preference-fields"></div><section class="game-menu-controls" aria-labelledby="${config.id}-help"><h2 id="${config.id}-help">How to play</h2><div class="game-menu-instructions"></div><p class="game-menu-key-guide"><b>P</b> Pause / Resume · <b>F</b> Fullscreen<br>In menus: <b>S</b> Sound<br>Escape goes back, pauses play, or exits fullscreen.</p></section></div>
    </div>
    <div class="game-menu-notices" aria-live="polite"><p class="game-menu-art-status" hidden></p><button type="button" class="game-menu-retry-art" hidden>Retry artwork</button><p class="game-menu-sound-status" hidden></p><p class="game-menu-display-status" hidden></p></div>
    <footer class="game-menu-actions">${config.actions.map(action => `<button type="button" data-menu-action="${action.id}" class="${action.primary ? 'game-menu-primary' : ''}" hidden>${action.label}</button>`).join('')}<button type="button" class="game-menu-open-settings" hidden>Settings</button><button type="button" class="game-menu-back" hidden><span aria-hidden="true">← </span><span class="game-menu-back-label"></span></button></footer>
  </section>`;
  // HUD/footer wrapping must not constrain menu space or move its actions.
  // The stage retains its geometry while the menu uses the whole game viewport.
  root.append(layer);
  config.pause.classList.add('game-pause');
  config.pause.textContent = 'Pause (P)';
  config.pause.setAttribute('aria-label', 'Pause');
  config.pause.setAttribute('aria-keyshortcuts', 'P Escape');
  config.pause.title = 'Pause (P)';
  const name = layer.querySelector<HTMLElement>('.game-menu-name')!;
  const notices = layer.querySelector<HTMLElement>('.game-menu-notices')!;
  const actionBar = layer.querySelector<HTMLElement>('.game-menu-actions')!;
  const heading = layer.querySelector('h1')!;
  heading.tabIndex = -1;
  const description = layer.querySelector<HTMLElement>('.game-menu-description')!;
  const body = layer.querySelector<HTMLElement>('.game-menu-body')!;
  const content = layer.querySelector<HTMLElement>('.game-menu-content')!;
  const settings = layer.querySelector<HTMLElement>('.game-menu-settings')!;
  const setup = layer.querySelector<HTMLElement>('.game-menu-setup')!;
  if (config.setup) setup.append(config.setup);
  const utilities = layer.querySelector<HTMLElement>('.game-menu-utilities')!;
  const main = layer.querySelector<HTMLElement>('.game-menu-main')!;
  const preferences = layer.querySelector<HTMLElement>('.game-menu-preferences')!;
  if (config.preferences) layer.querySelector('.game-menu-preference-fields')!.append(config.preferences);
  const instructions = layer.querySelector<HTMLElement>('.game-menu-instructions')!;
  if (typeof config.controls === 'string') instructions.innerHTML = config.controls;
  else instructions.append(config.controls);
  if (config.game) content.append(config.game);
  layer.querySelector('.game-menu-theme')!.append(config.theme);
  const actions = [...layer.querySelectorAll<HTMLButtonElement>('[data-menu-action]')];
  const openSettings = layer.querySelector<HTMLButtonElement>('.game-menu-open-settings')!;
  const back = layer.querySelector<HTMLButtonElement>('.game-menu-back')!;
  const backLabel = layer.querySelector<HTMLElement>('.game-menu-back-label')!;
  // Pause menus wrap run actions and navigation as coherent groups.
  const isNavigation = (button: HTMLButtonElement) => button.dataset.menuAction === 'title' || button.dataset.menuAction === 'quit';
  const runActions = document.createElement('div'); runActions.className = 'game-menu-run-actions';
  const navigation = document.createElement('div'); navigation.className = 'game-menu-navigation';
  runActions.append(...actions.filter(button => !isNavigation(button)));
  navigation.append(openSettings, ...actions.filter(isNavigation));
  actionBar.prepend(runActions, navigation);
  let settingsOpen = false, screenHeading = '', mainScroll = 0;
  function showSettings(open: boolean) {
    if (open) { screenHeading = heading.textContent!; mainScroll = body.scrollTop; }
    settingsOpen = open;
    heading.textContent = open ? 'Settings' : screenHeading;
    name.hidden = !open && screen === 'title';
    main.hidden = open; preferences.hidden = !open;
    openSettings.hidden = open || screen !== 'title' && screen !== 'paused';
    back.hidden = !open;
    backLabel.textContent = screen === 'paused' ? 'Back to pause menu' : 'Back to main menu';
    actions.forEach((button, i) => { button.hidden = open || !config.actions[i]!.screens.includes(screen as Screen); });
    body.scrollTop = open ? 0 : mainScroll;
    (open ? heading : openSettings).focus({ preventScroll: true });
  }
  openSettings.addEventListener('click', () => showSettings(true), { signal: config.signal });
  back.addEventListener('click', () => showSettings(false), { signal: config.signal });
  const retryArt = layer.querySelector<HTMLButtonElement>('.game-menu-retry-art')!;
  let retryArtwork: (() => void) | undefined;
  let returnFromRetry = false;
  retryArt.addEventListener('click', () => {
    returnFromRetry = document.activeElement === retryArt;
    if (returnFromRetry) body.focus({ preventScroll: true });
    retryArtwork?.();
  }, { signal: config.signal });
  for (const button of actions) {
    if (button.dataset.menuAction === 'resume') {
      button.textContent += ' (P)'; button.setAttribute('aria-label', 'Resume'); button.setAttribute('aria-keyshortcuts', 'P');
    }
  }
  const fullscreen = layer.querySelector<HTMLButtonElement>('.game-menu-fullscreen')!;
  const mute = layer.querySelector<HTMLButtonElement>('.game-menu-mute')!;
  let muted = false, screen = '';
  root.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey
      || !['KeyP', 'KeyF', 'KeyS', 'Escape'].includes(event.code)) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable
      || target.closest('input:not([type="radio"]):not([type="checkbox"]), textarea, select, [role="textbox"], [role="combobox"], [role="listbox"]'))) return;
    if (event.code === 'KeyF') {
      if (!fullscreen.hidden && !fullscreen.disabled) { event.preventDefault(); fullscreen.click(); }
      return;
    }
    if (event.code === 'Escape' && settingsOpen && !document.fullscreenElement) {
      event.preventDefault(); showSettings(false); return;
    }
    if (event.code === 'KeyS') {
      if (screen !== 'title' && screen !== 'paused') return;
      event.preventDefault(); mute.click();
      return;
    }
    const button = screen === 'playing' ? config.pause : screen === 'paused' && event.code === 'KeyP'
      ? actions.find(button => button.dataset.menuAction === 'resume') : undefined;
    if (!button || button.disabled || button.hidden && !settingsOpen) return;
    // Fullscreen Escape belongs to the browser, even when it also reaches us.
    if (event.code !== 'Escape' || !document.fullscreenElement) event.preventDefault();
    button.click();
  }, { signal: config.signal });
  actions.forEach((button, i) => button.addEventListener('click', () => config.onAction(config.actions[i]!.id), { signal: config.signal }));
  mute.addEventListener('click', () => {
    muted = !muted; mute.setAttribute('aria-pressed', String(muted));
    mute.textContent = muted ? 'Unmute sound (S)' : 'Mute sound (S)';
    mute.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound'); config.onMute(muted);
  }, { signal: config.signal });
  fullscreen.addEventListener('click', config.onFullscreen, { signal: config.signal });
  function status(selector: string, message: string) {
    const element = notices.querySelector<HTMLElement>(selector)!; element.textContent = message; element.hidden = !message;
  }
  return {
    layer, heading, description, actions,
    readiness(state: Readiness, retry: () => void) {
      retryArtwork = retry;
      retryArt.hidden = state !== 'failed';
      status('.game-menu-art-status', state === 'loading' ? 'Preparing artwork…' : state === 'failed' ? 'Artwork could not load. Retry or choose another theme.' : '');
      actions.forEach((button, i) => { if (config.actions[i]!.requiresReady !== false) button.disabled = state !== 'ready'; });
      if (state !== 'loading' && returnFromRetry) {
        if (document.activeElement === body && !document.hidden && document.hasFocus()) {
          (state === 'failed' ? retryArt : settingsOpen ? back : actions.find(button => !button.hidden && !button.disabled))?.focus({ preventScroll: true });
        }
        returnFromRetry = false;
      }
    },
    fullscreen(available: boolean, active: boolean) { fullscreen.hidden = !available; fullscreen.textContent = active ? 'Exit fullscreen (F)' : 'Fullscreen (F)'; fullscreen.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Fullscreen'); fullscreen.setAttribute('aria-pressed', String(active)); },
    soundStatus(message: string) { status('.game-menu-sound-status', message); },
    displayStatus(message: string) { status('.game-menu-display-status', message); },
    show(next: Screen, focus = true) {
      // A local pause must not strand focus on the now-hidden playfield or Pause button.
      // Browser blur and focus leaving the game must never pull focus back into it.
      const moveFocus = focus || (next !== 'playing' && screen === 'playing'
        && !document.hidden && document.hasFocus() && root.contains(document.activeElement));
      const nextHeading = next === 'title' ? config.title : screenHeadings[next] ?? heading.textContent!;
      if (settingsOpen && next === screen) screenHeading = nextHeading;
      if (next !== screen) {
        settingsOpen = false; body.scrollTop = 0;
      }
      screen = next; root.dataset.screen = next; layer.hidden = next === 'playing';
      main.hidden = settingsOpen; preferences.hidden = !settingsOpen; back.hidden = !settingsOpen;
      openSettings.hidden = settingsOpen || next !== 'title' && next !== 'paused';
      heading.textContent = settingsOpen ? 'Settings' : nextHeading;
      name.hidden = !settingsOpen && next === 'title';
      description.hidden = !description.textContent;
      const setupScreen = next === 'title' || next === 'paused';
      setup.hidden = next !== 'title' || !config.setup;
      settings.hidden = !setupScreen || config.theme.hidden;
      utilities.hidden = !setupScreen;
      if (next === 'playing') stage.append(notices);
      else actionBar.before(notices);
      config.pause.hidden = next !== 'playing';
      surface.tabIndex = next === 'playing' ? 0 : -1; surface.setAttribute('aria-hidden', String(next !== 'playing'));
      const visible = config.actions.filter(action => action.screens.includes(next));
      const primary = visible.find(action => action.primary) ?? visible.find(action => action.requiresReady !== false);
      actions.forEach((button, i) => {
        const action = config.actions[i]!;
        button.hidden = settingsOpen || !action.screens.includes(next);
        button.classList.toggle('game-menu-primary', action === primary);
      });
      if (moveFocus) {
        if (next === 'playing') surface.focus({ preventScroll: true });
        else if (settingsOpen) heading.focus({ preventScroll: true });
        else if (next === 'choosing') content.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
        else (actions.find(button => !button.hidden && !button.disabled) ?? layer.querySelector<HTMLElement>('.game-menu-body'))?.focus({ preventScroll: true });
      }
    },
  };
}
