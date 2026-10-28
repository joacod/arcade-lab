import { createGameMenu } from '../../engine/browser/menu.ts';
import { clearing, configurations, evolution, weapons, type ConfigurationId } from './content.ts';
import { choiceLevel, pickupRadius, xpThreshold } from './progression.ts';
import type { RunState } from './game.ts';
import { themes, type ThemeId } from './themes.ts';
import { interfaceSkins, accents, type InterfaceChoice, type Accent } from './interface.ts';
import type { ViewMode } from './view.ts';

export type Screen = 'title' | 'playing' | 'paused' | 'choosing' | 'victory' | 'defeat';
export type MenuAction = 'start' | 'pause' | 'resume' | 'restart' | 'title';

interface UIOptions {
  signal: AbortSignal;
  onAction(action: MenuAction): void;
  onChoose(id: string): void;
  onConfiguration(id: ConfigurationId): void;
  onTheme(id: ThemeId): void;
  onInterface(choice: InterfaceChoice): void;
  onAccent(choice: Accent): void;
  onMute(value: boolean): void;
  onVolume(value: number): void;
  onView(mode: ViewMode): void;
  onFullscreen(): void;
  onExit(): void;
}
export function createUI(root: HTMLElement, surface: HTMLElement, options: UIOptions) {
  const { signal, onAction, onChoose, onConfiguration, onTheme, onMute, onVolume } = options;
  root.innerHTML = `
    <main class="game-shell">
      <header class="hud">
        <span class="brand">Last Light Clearing</span>
        <div class="vitals"><meter class="health-meter" min="0" max="100" value="100" aria-label="Keeper health"></meter><output class="health-value">100 / 100 HP</output></div>
        <output class="timer" aria-label="Active time">00:00</output>
        <output class="progress">Level 1 · XP 0 / 10</output>
        <div class="hud-actions"><button data-action="pause" hidden>Pause</button></div>
      </header>
      <div class="xp-track" aria-hidden="true"><span></span></div>
      <div class="stage"></div>
    </main>`;
  const pause = root.querySelector<HTMLButtonElement>('[data-action="pause"]')!;
  pause.addEventListener('click', () => onAction('pause'), { signal });
  const menu = createGameMenu<MenuAction | 'exit', Screen>(root, surface, root.querySelector('.stage')!, {
    id: 'clearing', title: 'Last Light Clearing', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>('.hud, .xp-track'),
    onAction: action => action === 'exit' ? options.onExit() : onAction(action),
    onMute, onFullscreen: options.onFullscreen,
    game: `<div class="menu-setup"><label>Round <select aria-label="Round configuration">${Object.entries(configurations).map(([id, config]) => `<option value="${id}">${config.name}</option>`).join('')}</select></label><p class="menu-note">${configurations.clearing.description}</p></div><div class="upgrade-choices" hidden></div><div class="run-details" hidden><output class="loadout"></output><output class="modifiers"></output><output class="kills"></output></div>`,
    options: `<div class="menu-fields"><label>Appearance <select aria-label="Appearance">${Object.entries(themes).map(([id, theme]) => `<option value="${id}">${theme.name}</option>`).join('')}</select></label><label>Interface <select aria-label="Interface"><option value="match">Match appearance</option>${Object.entries(interfaceSkins).map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select></label><label>Interface accent <select aria-label="Interface accent">${Object.entries(accents).map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select></label><label>View <select aria-label="View"><option value="close">Close view</option><option value="arena">Whole arena</option></select></label></div><label class="menu-volume">Volume <input aria-label="Sound volume" type="range" min="0" max="100" value="45"></label>`,
    controls: `<p><b>WASD / arrows</b> move, or press and drag.</p><p>Weapons fire automatically. Collect gems and choose upgrades.</p><p><b>Escape / P</b> pause. Resume after changing display settings or leaving the game window.</p>`,
    actions: [
      { id: 'start', label: 'Play', screens: ['title'], primary: true },
      { id: 'resume', label: 'Resume', screens: ['paused'], primary: true },
      { id: 'restart', label: 'Restart', screens: ['paused', 'victory', 'defeat'], primary: true },
      { id: 'title', label: 'Game setup', screens: ['paused', 'victory', 'defeat'] },
      { id: 'exit', label: 'Game selection', screens: ['title', 'paused', 'victory', 'defeat', 'choosing'] },
    ],
  });
  const assetStatus = document.createElement('p'); assetStatus.className = 'asset-status'; assetStatus.hidden = true;
  menu.layer.querySelector('.game-menu-notices')!.prepend(assetStatus);
  let configuration: ConfigurationId = 'clearing';
  const configurationSelect = root.querySelector<HTMLSelectElement>('[aria-label="Round configuration"]')!;
  const themeSelect = root.querySelector<HTMLSelectElement>('[aria-label="Appearance"]')!;
  configurationSelect.addEventListener('change', () => {
    const id = configurationSelect.value;
    if (id in configurations) {
      configuration = id as ConfigurationId;
      root.querySelector('.menu-note')!.textContent = configurations[configuration].description;
      description.textContent = roundDescription();
      onConfiguration(configuration);
    }
  }, { signal });
  themeSelect.addEventListener('change', () => {
    if (themeSelect.value in themes) onTheme(themeSelect.value as ThemeId);
  }, { signal });
  root.querySelector<HTMLSelectElement>('[aria-label="View"]')!.addEventListener('change', event => {
    options.onView((event.target as HTMLSelectElement).value as ViewMode);
  }, { signal });
  root.querySelector<HTMLSelectElement>('[aria-label="Interface"]')!.addEventListener('change', event => {
    options.onInterface((event.target as HTMLSelectElement).value as InterfaceChoice);
  }, { signal });
  root.querySelector<HTMLSelectElement>('[aria-label="Interface accent"]')!.addEventListener('change', event => {
    options.onAccent((event.target as HTMLSelectElement).value as Accent);
  }, { signal });
  root.querySelector('input')!.addEventListener('input', event => onVolume(Number((event.target as HTMLInputElement).value) / 100), { signal });
  const xpBar = root.querySelector<HTMLElement>('.xp-track span')!;
  const choices = root.querySelector<HTMLElement>('.upgrade-choices')!;
  let choiceSignature = '';
  choices.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-choice]');
    if (button && !button.disabled) onChoose(button.dataset.choice!);
  }, { signal });
  choices.addEventListener('keydown', event => {
    const buttons = [...choices.querySelectorAll<HTMLButtonElement>('button')];
    const selected = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat && selected >= 0 && !buttons[selected]!.disabled) onChoose(buttons[selected]!.dataset.choice!);
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
      const direction = event.code === 'ArrowUp' || event.code === 'ArrowLeft' ? -1 : 1;
      buttons[(selected + direction + buttons.length) % buttons.length]?.focus();
    }
  }, { signal });
  const loadout = root.querySelector<HTMLOutputElement>('.loadout')!;
  const progress = root.querySelector<HTMLOutputElement>('.progress')!;
  const modifiers = root.querySelector<HTMLOutputElement>('.modifiers')!;
  const stage = root.querySelector<HTMLElement>('.stage')!;
  stage.prepend(surface);
  const heading = menu.heading;
  const description = menu.description;
  const timer = root.querySelector<HTMLOutputElement>('.timer')!;
  const buttons = menu.actions;
  const health = root.querySelector<HTMLMeterElement>('.health-meter')!;
  health.max = clearing.keeper.maxHealth;
  const healthValue = root.querySelector<HTMLOutputElement>('.health-value')!;
  const kills = root.querySelector<HTMLOutputElement>('.kills')!;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const roundDescription = () => `Survive ${configurations[configuration].round.duration} seconds. Collect gems and upgrade automatic weapons.`;
  return {
    preparing(value: boolean) {
      for (const button of buttons) if (['start', 'resume', 'restart'].includes(button.dataset.menuAction!)) button.disabled = value;
    },
    appearance(id: ThemeId) { themeSelect.value = id; },
    fullscreen: menu.fullscreen,
    displayStatus: menu.displayStatus,
    soundStatus: menu.soundStatus,
    assetStatus(message: string) { assetStatus.hidden = !message; assetStatus.textContent = message; },
    update(run: Readonly<RunState>) {
      timer.value = `${formatTime(Math.floor(run.elapsed))} / ${formatTime(run.round.duration)}`;
      health.value = run.player.health;
      xpBar.style.width = `${100 * run.progression.xp / xpThreshold(run)}%`;
      healthValue.value = `${run.player.health} / ${clearing.keeper.maxHealth} HP`;
      loadout.value = run.loadout.map(slot => `${slot.id === evolution.replacement ? evolution.name : weapons[slot.base].name} ${slot.rank}`).join(' · ');
      progress.value = `Level ${run.progression.level} · XP ${run.progression.xp} / ${xpThreshold(run)}`;
      modifiers.value = `Shield ${run.player.shield} · Power +${Math.round(run.modifiers.power * 100)}% · Pickup ${pickupRadius(run)}`;
      if (run.status === 'choosing') {
        heading.textContent = `Level ${choiceLevel(run) - Number(run.progression.confirming)} · Choose an upgrade`;
        description.textContent = run.progression.confirming ? 'Release confirmation to continue.'
          : `${run.progression.pending} earned ${run.progression.pending === 1 ? 'choice' : 'choices'} remaining. Action is paused.`;
        const signature = `${choiceLevel(run)}:${run.progression.confirming}:${run.progression.choices.map(choice => choice.id).join(',')}`;
        for (const button of choices.querySelectorAll('button')) button.setAttribute('aria-disabled', String(run.progression.confirming));
        if (!run.progression.confirming && signature !== choiceSignature) {
          choiceSignature = signature;
          const focused = choices.contains(document.activeElement);
          choices.replaceChildren(...run.progression.choices.map(choice => {
            const button = document.createElement('button'); button.dataset.choice = choice.id;
            const title = document.createElement('strong'); title.textContent = choice.name;
            const detail = document.createElement('span'); detail.textContent = choice.description;
            button.append(title, detail); return button;
          }));
          if (focused || root.dataset.screen === 'choosing') choices.querySelector('button')?.focus({ preventScroll: true });
        }
      } else choiceSignature = '';
      kills.value = `${run.stats.kills} defeated`;
      root.classList.toggle('in-danger', run.player.health <= clearing.keeper.maxHealth * 0.3);
      if (run.outcome) {
        description.textContent = `${formatTime(Math.floor(run.elapsed))} survived · ${run.stats.kills} enemies defeated · ${run.stats.eliteKills} elite defeated · Level ${run.progression.level} · ${run.player.health} HP remaining.`;
      }
    },
    show(screen: Screen, focus = true) {
      root.querySelector<HTMLElement>('.menu-setup')!.hidden = screen !== 'title';
      root.querySelector<HTMLElement>('.run-details')!.hidden = screen === 'title';
      choices.hidden = screen !== 'choosing';
      heading.textContent = screen === 'victory' ? 'Victory' : screen === 'defeat' ? 'Defeat'
        : screen === 'choosing' ? 'Choose an upgrade' : screen === 'paused' ? 'Paused' : 'Last Light Clearing';
      description.textContent = screen === 'paused' ? '' : roundDescription();
      menu.show(screen, focus);
    },
  };
}
