import './menu.css';

export interface MenuAction<Action extends string, Screen extends string> {
  id: Action;
  label: string;
  screens: readonly Screen[];
  primary?: boolean;
}
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
  theme: HTMLElement;
  controls: string;
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
    <header class="game-menu-header"><p class="game-menu-name" hidden>${config.title}</p><h1 id="${config.id}-heading">${config.title}</h1></header>
    <div class="game-menu-body" tabindex="0" role="region" aria-label="Game details">
      <p class="game-menu-description"></p><div class="game-menu-content"></div>
      <div class="game-menu-settings"><div class="game-menu-theme"></div><div class="game-menu-utilities"><button type="button" class="game-menu-mute" aria-pressed="false">Mute sound</button><button type="button" class="game-menu-fullscreen" hidden>Fullscreen</button></div>
      <details class="game-menu-controls"><summary>Controls</summary><div>${config.controls}</div></details></div>
    </div>
    <div class="game-menu-notices" aria-live="polite"><p class="game-menu-sound-status" hidden></p><p class="game-menu-display-status" hidden></p></div>
    <footer class="game-menu-actions">${config.actions.map(action => `<button type="button" data-menu-action="${action.id}" class="${action.primary ? 'game-menu-primary' : ''}" hidden>${action.label}</button>`).join('')}</footer>
  </section>`;
  stage.append(layer);
  const name = layer.querySelector<HTMLElement>('.game-menu-name')!;
  const notices = layer.querySelector<HTMLElement>('.game-menu-notices')!;
  const actionBar = layer.querySelector<HTMLElement>('.game-menu-actions')!;
  const heading = layer.querySelector('h1')!;
  const description = layer.querySelector<HTMLElement>('.game-menu-description')!;
  const content = layer.querySelector<HTMLElement>('.game-menu-content')!;
  const settings = layer.querySelector<HTMLElement>('.game-menu-settings')!;
  const controls = layer.querySelector<HTMLDetailsElement>('details')!;
  if (config.game) content.append(config.game);
  layer.querySelector('.game-menu-theme')!.append(config.theme);
  const actions = [...layer.querySelectorAll<HTMLButtonElement>('[data-menu-action]')];
  const fullscreen = layer.querySelector<HTMLButtonElement>('.game-menu-fullscreen')!;
  const mute = layer.querySelector<HTMLButtonElement>('.game-menu-mute')!;
  let muted = false, screen = '';
  actions.forEach((button, i) => button.addEventListener('click', () => config.onAction(config.actions[i]!.id), { signal: config.signal }));
  mute.addEventListener('click', () => {
    muted = !muted; mute.setAttribute('aria-pressed', String(muted)); mute.textContent = muted ? 'Unmute sound' : 'Mute sound'; config.onMute(muted);
  }, { signal: config.signal });
  fullscreen.addEventListener('click', config.onFullscreen, { signal: config.signal });
  function status(selector: string, message: string) {
    const element = notices.querySelector<HTMLElement>(selector)!; element.textContent = message; element.hidden = !message;
  }
  return {
    layer, heading, description, actions,
    fullscreen(available: boolean, active: boolean) { fullscreen.hidden = !available; fullscreen.textContent = active ? 'Exit fullscreen' : 'Fullscreen'; fullscreen.setAttribute('aria-pressed', String(active)); },
    soundStatus(message: string) { status('.game-menu-sound-status', message); },
    displayStatus(message: string) { status('.game-menu-display-status', message); },
    show(next: Screen, focus = true) {
      // A local pause must not strand focus on the now-hidden playfield or Pause button.
      // Browser blur and focus leaving the game must never pull focus back into it.
      const moveFocus = focus || (next !== 'playing' && screen === 'playing'
        && !document.hidden && document.hasFocus() && root.contains(document.activeElement));
      if (next !== screen) { controls.open = false; layer.querySelector('.game-menu-body')!.scrollTop = 0; }
      screen = next; root.dataset.screen = next; layer.hidden = next === 'playing';
      name.hidden = next === 'title';
      description.hidden = !description.textContent;
      settings.hidden = next === 'choosing';
      if (next === 'playing') stage.append(notices);
      else actionBar.before(notices);
      config.pause.hidden = next !== 'playing';
      surface.tabIndex = next === 'playing' ? 0 : -1; surface.setAttribute('aria-hidden', String(next !== 'playing'));
      let primary = false;
      actions.forEach((button, i) => {
        const action = config.actions[i]!;
        button.hidden = !action.screens.includes(next);
        const highlighted = !button.hidden && !!action.primary && !primary;
        button.classList.toggle('game-menu-primary', highlighted);
        primary ||= highlighted;
      });
      if (moveFocus) {
        if (next === 'playing') surface.focus({ preventScroll: true });
        else if (next === 'choosing') content.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
        else (actions.find(button => !button.hidden && !button.disabled) ?? layer.querySelector<HTMLElement>('.game-menu-body'))?.focus({ preventScroll: true });
      }
    },
  };
}
