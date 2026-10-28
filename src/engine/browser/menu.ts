import './menu.css';

export interface MenuAction<Action extends string, Screen extends string> {
  id: Action;
  label: string;
  screens: readonly Screen[];
  primary?: boolean;
}
interface MenuOptions<Action extends string, Screen extends string> {
  title: string;
  /** Stable, session-local ID for accessible tab/panel relationships. */
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
  options?: HTMLElement;
  controls: string;
}

/** Presentation only: games retain their transition rules, configuration and run state. */
export function createGameMenu<Action extends string, Screen extends string>(root: HTMLElement, surface: HTMLElement, stage: HTMLElement, config: MenuOptions<Action, Screen>) {
  root.dataset.menuOwner = '';
  stage.dataset.menuStage = '';
  for (const element of config.gameplayUI) element.dataset.menuGameplay = '';
  const layer = document.createElement('div'); layer.className = 'game-menu-layer';
  layer.innerHTML = `<section class="game-menu" aria-labelledby="${config.id}-heading">
    <header class="game-menu-header"><p class="game-menu-name" hidden>${config.title}</p><h1 id="${config.id}-heading">${config.title}</h1></header>
    <div class="game-menu-tabs" role="tablist" aria-label="Game menu">
      ${['Game', 'Options', 'Controls'].map((name, i) => `<button type="button" role="tab" id="${config.id}-tab-${i}" aria-controls="${config.id}-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${name}</button>`).join('')}
    </div>
    <div class="game-menu-body">
      <div role="tabpanel" id="${config.id}-panel-0" aria-labelledby="${config.id}-tab-0"><p class="game-menu-description"></p></div>
      <div role="tabpanel" id="${config.id}-panel-1" aria-labelledby="${config.id}-tab-1" hidden><div class="game-menu-utilities"><button type="button" class="game-menu-mute" aria-pressed="false">Mute sound</button><button type="button" class="game-menu-fullscreen" hidden>Fullscreen</button></div></div>
      <div role="tabpanel" id="${config.id}-panel-2" aria-labelledby="${config.id}-tab-2" hidden><div class="game-menu-controls">${config.controls}</div></div>
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
  const tabs = [...layer.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...layer.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  if (config.game) panels[0]!.append(config.game);
  if (config.options) panels[1]!.prepend(config.options);
  const actions = [...layer.querySelectorAll<HTMLButtonElement>('[data-menu-action]')];
  const tablist = layer.querySelector<HTMLElement>('[role="tablist"]')!;
  const fullscreen = layer.querySelector<HTMLButtonElement>('.game-menu-fullscreen')!;
  const mute = layer.querySelector<HTMLButtonElement>('.game-menu-mute')!;
  let muted = false, screen = '', selected = 0;
  function select(index: number, focus = false) {
    selected = index;
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; panels[i]!.hidden = i !== index; });
    if (focus) tabs[index]!.focus({ preventScroll: true });
    layer.querySelector('.game-menu-body')!.scrollTop = 0;
  }
  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i), { signal: config.signal }));
  tablist.addEventListener('keydown', event => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      select(event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (selected + offset + tabs.length) % tabs.length, true);
    }
  }, { signal: config.signal });
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
      if (next !== screen) select(0);
      screen = next; root.dataset.screen = next; layer.hidden = next === 'playing';
      name.hidden = next === 'title';
      description.hidden = !description.textContent;
      tablist.hidden = next === 'choosing';
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
      if (focus) {
        if (next === 'playing') surface.focus({ preventScroll: true });
        else if (next === 'choosing') panels[0]!.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
        else actions.find(button => !button.hidden)?.focus({ preventScroll: true });
      }
    },
  };
}
