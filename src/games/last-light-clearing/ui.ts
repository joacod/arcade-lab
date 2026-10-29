import { createThemeSelect } from '../../common/ui/theme-select.ts';
import { createElementLookup, setText, setProperty, setAttribute } from '../../common/ui/dom.ts';
import { createSelectField } from '../../common/ui/menu-components.ts';
import { createGameMenu } from '../../common/ui/menu.ts';
import { clearing, configurations, evolution, weapons, type ConfigurationId } from './content.ts';
import { choiceLevel, pickupRadius, xpThreshold } from './progression.ts';
import type { RunState } from './game.ts';
import type { GameEvent } from './game-state.ts';
import { themes, type ThemeId } from './themes.ts';

export type Screen = 'title' | 'playing' | 'paused' | 'choosing' | 'victory' | 'defeat';
export type MenuAction = 'start' | 'pause' | 'resume' | 'restart' | 'title';

interface UIOptions {
  signal: AbortSignal;
  onAction(action: MenuAction): void;
  onChoose(id: string): void;
  onConfiguration(id: ConfigurationId): void;
  onTheme(id: ThemeId): void;
  onMute(value: boolean): void;
  onFullscreen(): void;
  onExit(): void;
}
export function createUI(root: HTMLElement, surface: HTMLElement, options: UIOptions) {
  const { signal, onAction, onChoose, onConfiguration, onTheme, onMute } = options;
  root.innerHTML = `
    <main class="game-shell">
      <header class="hud">
        <span class="brand">Last Light Clearing</span>
        <div class="vitals"><meter class="health-meter" min="0" max="100" value="100" aria-label="Keeper health"></meter><output class="health-value">100 / 100 HP</output><output class="shield-value"></output></div>
        <output class="timer" aria-label="Active time">00:00</output>
        <output class="progress">Level 1 · XP 0 / 10</output>
        <div class="hud-actions"><button data-action="pause" hidden>Pause</button></div>
      </header>
      <div class="xp-track" aria-hidden="true"><span></span></div>
      <div class="stage"><output class="evolution-progress"></output><p class="field-message" role="status" hidden></p></div>
    </main>`;
  const $ = createElementLookup(root);
  const pause = $<HTMLButtonElement>('[data-action="pause"]');
  pause.addEventListener('click', () => onAction('pause'), { signal });
  let configuration: ConfigurationId = 'clearing';
  const roundDescription = () => `Survive ${configurations[configuration].round.duration} seconds. Collect gems and upgrade automatic weapons.`;
  const gameContent = document.createElement('div');
  gameContent.innerHTML = `<div class="menu-setup"><p class="menu-note">${configurations.clearing.description}</p></div><div class="upgrade-choices" hidden></div><div class="run-details" hidden><output class="loadout"></output><output class="modifiers"></output><output class="kills"></output></div>`;
  const round = createSelectField({
    label: 'Round', accessibleLabel: 'Round configuration', signal,
    choices: Object.fromEntries(Object.entries(configurations).map(([id, config]) => [id, config.name])) as Record<ConfigurationId, string>,
    value: configuration,
    onChange(id) {
      configuration = id;
      gameContent.querySelector('.menu-note')!.textContent = configurations[id].description;
      menu.description.textContent = roundDescription();
      onConfiguration(id);
    },
  });
  gameContent.querySelector('.menu-setup')!.prepend(round.element);
  const appearance = createThemeSelect({ signal, modes: themes, value: 'normal', onChange: onTheme });
  const menu = createGameMenu<MenuAction | 'exit', Screen>(root, surface, $('.stage'), {
    id: 'clearing', title: 'Last Light Clearing', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>('.hud, .xp-track'),
    onAction: action => action === 'exit' ? options.onExit() : onAction(action),
    onMute, onFullscreen: options.onFullscreen,
    game: gameContent,
    theme: appearance.element,
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
  const xpBar = $<HTMLElement>('.xp-track span');
  const choices = $<HTMLElement>('.upgrade-choices');
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
  const loadout = $<HTMLOutputElement>('.loadout');
  const progress = $<HTMLOutputElement>('.progress');
  const modifiers = $<HTMLOutputElement>('.modifiers');
  const stage = $<HTMLElement>('.stage');
  stage.prepend(surface);
  const heading = menu.heading;
  const description = menu.description;
  const timer = $<HTMLOutputElement>('.timer');
  const buttons = menu.actions;
  const health = $<HTMLMeterElement>('.health-meter');
  health.max = clearing.keeper.maxHealth;
  const healthValue = $<HTMLOutputElement>('.health-value');
  const kills = $<HTMLOutputElement>('.kills');
  const shieldValue = $<HTMLOutputElement>('.shield-value');
  const evolutionProgress = $<HTMLOutputElement>('.evolution-progress');
  const fieldMessage = $<HTMLElement>('.field-message');
  let evolutionAt = -Infinity;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  return {
    reset() { evolutionAt = -Infinity; },
    consume(events: readonly GameEvent[]) {
      for (const event of events) if (event.type === 'evolution') evolutionAt = event.at;
    },
    preparing(value: boolean) {
      for (const button of buttons) if (['start', 'resume', 'restart'].includes(button.dataset.menuAction!)) button.disabled = value;
    },
    appearance(id: ThemeId) { appearance.input.value = id; },
    fullscreen: menu.fullscreen,
    displayStatus: menu.displayStatus,
    soundStatus: menu.soundStatus,
    assetStatus(message: string) { assetStatus.hidden = !message; assetStatus.textContent = message; },
    update(run: Readonly<RunState>) {
      setProperty(timer, 'value', `${formatTime(Math.floor(run.elapsed))} / ${formatTime(run.round.duration)}`);
      setProperty(health, 'value', run.player.health);
      setProperty(xpBar.style, 'width', `${Math.round(10000 * run.progression.xp / xpThreshold(run)) / 100}%`);
      setProperty(healthValue, 'value', `${run.player.health} / ${clearing.keeper.maxHealth} HP`);
      setProperty(shieldValue, 'value', `+${run.player.shield} shield`);
      setProperty(shieldValue.style, 'visibility', run.player.shield === 0 ? 'hidden' : 'visible');
      const spark = run.loadout.find(slot => slot.base === 'spark');
      const evolved = spark?.id === evolution.replacement;
      setProperty(evolutionProgress, 'value', evolved ? 'Arc Spark · chain lightning'
        : `Arc Spark: Spark ${spark?.rank ?? 0}/3 · Lens ${run.modifiers.lens ? 'ready' : 'needed'}`);
      const message = run.elapsed - evolutionAt < 3 ? 'Arc Spark awakened · shots chain through three enemies'
        : run.progression.level === 1 ? 'Follow the green gems · collect XP to grow stronger'
        : run.round.duration - run.elapsed <= 30 && !run.outcome ? 'Dawn approaches · keep moving'
        : '';
      setText(fieldMessage, message); setProperty(fieldMessage, 'hidden', !message);
      setProperty(loadout, 'value', run.loadout.map(slot => `${slot.id === evolution.replacement ? evolution.name : weapons[slot.base].name} ${slot.rank}`).join(' · '));
      setProperty(progress, 'value', `Level ${run.progression.level} · XP ${run.progression.xp} / ${xpThreshold(run)}`);
      setProperty(modifiers, 'value', `Shield ${run.player.shield} · Power +${Math.round(run.modifiers.power * 100)}% · Pickup ${pickupRadius(run)}`);
      if (run.status === 'choosing') {
        setText(heading, `Level ${choiceLevel(run) - Number(run.progression.confirming)} · Choose an upgrade`);
        setText(description, run.progression.confirming ? 'Release confirmation to continue.'
          : `${run.progression.pending} earned ${run.progression.pending === 1 ? 'choice' : 'choices'} remaining. Action is paused.`);
        const signature = `${choiceLevel(run)}:${run.progression.confirming}:${run.progression.choices.map(choice => choice.id).join(',')}`;
        for (const button of choices.querySelectorAll('button')) setAttribute(button, 'aria-disabled', String(run.progression.confirming));
        if (!run.progression.confirming && signature !== choiceSignature) {
          choiceSignature = signature;
          const focused = choices.contains(document.activeElement);
          choices.replaceChildren(...run.progression.choices.map(choice => {
            const button = document.createElement('button'); button.dataset.choice = choice.id;
            const title = document.createElement('strong'); setText(title, choice.name);
            const detail = document.createElement('span'); setText(detail, choice.description);
            button.append(title, detail); return button;
          }));
          if (focused || root.dataset.screen === 'choosing') choices.querySelector('button')?.focus({ preventScroll: true });
        }
      } else choiceSignature = '';
      setProperty(kills, 'value', `${run.stats.kills} defeated`);
      root.classList.toggle('in-danger', run.player.health <= clearing.keeper.maxHealth * 0.3);
      if (run.outcome) {
        setText(description, `${run.outcome === 'victory' ? 'The clearing welcomes the first light. ' : ''}${formatTime(Math.floor(run.elapsed))} survived · ${run.stats.kills} enemies defeated · ${run.stats.eliteKills} elite defeated · Level ${run.progression.level} · ${run.player.health} HP remaining.`);
      }
    },
    show(screen: Screen, focus = true) {
      $<HTMLElement>('.menu-setup').hidden = screen !== 'title';
      $<HTMLElement>('.run-details').hidden = screen === 'title';
      choices.hidden = screen !== 'choosing';
      heading.textContent = screen === 'victory' ? 'Victory' : screen === 'defeat' ? 'Defeat'
        : screen === 'choosing' ? 'Choose an upgrade' : screen === 'paused' ? 'Paused' : 'Last Light Clearing';
      description.textContent = screen === 'paused' ? '' : roundDescription();
      menu.show(screen, focus);
    },
  };
}
