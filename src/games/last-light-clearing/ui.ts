import { defaultTheme, createThemeChoices } from '../../common/ui/theme-choices.ts';
import { createElementLookup, setText, setProperty, setAttribute } from '../../common/ui/dom.ts';
import { createMenuReadout } from '../../common/ui/menu-components.ts';
import { createGameMenu, menuActions, type CommonMenuIntent } from '../../common/ui/menu.ts';
import { clearing, configurations, evolution, upgrades, weapons, type ConfigurationId } from './content.ts';
import { choiceLevel, pickupRadius, xpThreshold } from './progression.ts';
import type { RunState } from './game.ts';
import type { GameEvent } from './game-state.ts';
import { themes, type ThemeId } from './themes.ts';
import type { Control } from './input.ts';

export type Screen = 'title' | 'playing' | 'paused' | 'choosing' | 'victory' | 'defeat';
export type MenuAction = Exclude<CommonMenuIntent, 'quit' | 'fullscreen'>;

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
const weaponCues = {
  spark: { icon: 'ϟ', purpose: 'Automatic shots at the nearest enemy' },
  halo: { icon: '◎', purpose: 'Orbiting lights protect your close range' },
  pulse: { icon: '◉', purpose: 'A burst hits enemies around you' },
  shard: { icon: '✣', purpose: 'Shots spread in several directions' },
} as const;
const supportCues = {
  lens: { icon: '◇', category: 'Evolution ingredient', purpose: 'Collect from farther away · pairs with Spark' },
  recovery: { icon: '+', category: 'Recovery', purpose: 'Restore health · excess becomes shield' },
  power: { icon: '↑', category: 'All weapons', purpose: 'Increase every equipped weapon’s damage' },
  reach: { icon: '⌖', category: 'Gem collection', purpose: 'Attract gems from farther away' },
} as const;

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
      <div class="stage"><div class="field-status"><output class="equipped-weapons" aria-label="Equipped weapons" aria-live="off"></output><output class="evolution-progress"></output></div><p class="field-message" role="status" hidden></p></div>
      <footer class="clearing-touch"><div class="clearing-pad" role="group" aria-label="Movement controls"><button data-control="up" aria-label="Move up">↑</button><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button><button data-control="down" aria-label="Move down">↓</button></div><span>MOVE<br><small>Weapons fire automatically</small></span></footer>
    </main>`;
  const $ = createElementLookup(root);
  const pause = $<HTMLButtonElement>('[data-action="pause"]');
  pause.addEventListener('click', () => onAction('pause'), { signal });
  let configuration: ConfigurationId = 'clearing';
  const roundDescription = () => `Survive ${configurations[configuration].round.duration} seconds. Collect gems and upgrade automatic weapons.`;
  const gameContent = document.createElement('div');
  gameContent.innerHTML = `<div class="upgrade-panel" hidden><output class="choice-context" aria-live="off"></output><div class="upgrade-choices" role="group" aria-label="Choose one upgrade"></div><p class="choice-hint">Choose one · click / tap or arrows + Enter</p></div>`;
  const results = createMenuReadout('Run results');
  gameContent.append(results.element);
  const rounds = document.createElement('fieldset'); rounds.className = 'menu-choice-group';
  rounds.innerHTML = '<legend>Choose your round</legend><div class="menu-choice-grid"></div>';
  for (const [id, config] of Object.entries(configurations)) {
    const card = document.createElement('label'); card.className = 'menu-choice';
    const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'clearing-round';
    radio.value = id; radio.checked = id === configuration; radio.setAttribute('aria-label', config.name);
    const title = document.createElement('strong'); title.textContent = config.name;
    const detail = document.createElement('small'); detail.textContent = config.description;
    detail.id = `clearing-round-${id}-description`; radio.setAttribute('aria-describedby', detail.id);
    card.append(radio, title, detail); rounds.querySelector('.menu-choice-grid')!.append(card);
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      configuration = id as ConfigurationId;
      menu.description.textContent = roundDescription(); onConfiguration(configuration);
    }, { signal });
  }
  const appearance = createThemeChoices({ names: Object.fromEntries(Object.entries(themes).map(([id, theme]) => [id, theme.name])), signal, modes: themes, value: defaultTheme(themes), onChange: onTheme });
  const menu = createGameMenu<MenuAction | 'quit', Screen>(root, surface, $('.stage'), {
    id: 'clearing', title: 'Last Light Clearing', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>('.hud, .xp-track, .clearing-touch'),
    onAction: action => action === 'quit' ? options.onExit() : onAction(action),
    onMute, onFullscreen: options.onFullscreen,
    game: gameContent, setup: rounds,
    theme: appearance.element,
    controls: `<p><b>WASD / arrows</b> move. Touch: use the on-screen arrows, or press and drag in the arena.</p><p>Weapons fire automatically. Collect gems and choose upgrades.</p><p>Resume after changing display settings or leaving the game window.</p>`,
    actions: [
      menuActions.start,
      menuActions.resume,
      menuActions.restart,
      { ...menuActions.quit, screens: [...menuActions.quit.screens, 'choosing'] },
    ],
  });
  const assetStatus = document.createElement('p'); assetStatus.className = 'asset-status'; assetStatus.hidden = true;
  menu.layer.querySelector('.game-menu-notices')!.prepend(assetStatus);
  const xpBar = $<HTMLElement>('.xp-track span');
  const choices = $<HTMLElement>('.upgrade-choices');
  let choiceSignature = '', chosenId = '';
  function choose(button: HTMLButtonElement) {
    if (button.getAttribute('aria-disabled') === 'true') return;
    chosenId = button.dataset.choice!;
    onChoose(chosenId);
  }
  choices.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-choice]');
    if (button && !button.disabled) choose(button);
  }, { signal });
  choices.addEventListener('keydown', event => {
    const buttons = [...choices.querySelectorAll<HTMLButtonElement>('button')];
    const selected = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat && selected >= 0 && !buttons[selected]!.disabled) choose(buttons[selected]!);
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
      const direction = event.code === 'ArrowUp' || event.code === 'ArrowLeft' ? -1 : 1;
      buttons[(selected + direction + buttons.length) % buttons.length]?.focus();
    }
  }, { signal });
  const progress = $<HTMLOutputElement>('.progress');
  const stage = $<HTMLElement>('.stage');
  stage.prepend(surface);
  const heading = menu.heading;
  const description = menu.description;
  const timer = $<HTMLOutputElement>('.timer');
  const health = $<HTMLMeterElement>('.health-meter');
  health.max = clearing.keeper.maxHealth;
  const healthValue = $<HTMLOutputElement>('.health-value');
  const shieldValue = $<HTMLOutputElement>('.shield-value');
  const evolutionProgress = $<HTMLOutputElement>('.evolution-progress');
  const fieldMessage = $<HTMLElement>('.field-message');
  let evolutionAt = -Infinity;
  const controls = Object.fromEntries((['left', 'right', 'up', 'down'] as const).map(action => [action, $<HTMLButtonElement>(`[data-control="${action}"]`)])) as Record<Control, HTMLButtonElement>;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  return {
    controls,
    reset() { evolutionAt = -Infinity; },
    consume(events: readonly GameEvent[]) {
      for (const event of events) if (event.type === 'evolution') evolutionAt = event.at;
    },
    appearance(id: ThemeId) { appearance.setValue(id); },
    appearancePending(id: ThemeId) { appearance.prepare(id); },
    readiness: menu.readiness,
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
      const loadout = run.loadout.map(slot => `${slot.id === evolution.replacement ? evolution.name : weapons[slot.base].name} ${slot.rank}`).join(' · ');
      setText($('.equipped-weapons'), run.loadout.map(slot => `${weaponCues[slot.base].icon} ${slot.id === evolution.replacement ? evolution.name : weapons[slot.base].name} ${slot.rank}`).join(' · '));
      setProperty(progress, 'value', `Level ${run.progression.level} · XP ${run.progression.xp} / ${xpThreshold(run)}`);
      results.update(`${loadout}\nShield ${run.player.shield} · Power +${Math.round(run.modifiers.power * 100)}% · Pickup ${pickupRadius(run)}\n${run.stats.kills} defeated`);
      if (run.status === 'choosing') {
        setText(heading, `Level ${choiceLevel(run) - Number(run.progression.confirming)} · Choose an upgrade`);
        setText(description, run.progression.confirming ? 'Upgrade applied. Release to continue.'
          : `${run.progression.pending} earned ${run.progression.pending === 1 ? 'choice' : 'choices'} remaining. Action is paused.`);
        const signature = `${choiceLevel(run)}:${run.progression.confirming}:${run.progression.choices.map(choice => choice.id).join(',')}`;
        setText($('.choice-context'), `Equipped: ${loadout} · ${evolutionProgress.value}`);
        for (const button of choices.querySelectorAll('button')) {
          setAttribute(button, 'aria-disabled', String(run.progression.confirming));
          const confirmed = run.progression.confirming && button.dataset.choice === chosenId;
          setProperty(button.dataset, 'confirmed', String(confirmed));
          if (confirmed) setText(button.querySelector('.choice-category')!, '✓ Applied');
        }
        if (!run.progression.confirming && signature !== choiceSignature) {
          choiceSignature = signature;
          chosenId = '';
          const focused = choices.contains(document.activeElement);
          choices.replaceChildren(...run.progression.choices.map(choice => {
            const button = document.createElement('button'); button.dataset.choice = choice.id;
            const upgrade = upgrades.find(upgrade => upgrade.id === choice.id)!;
            const currentRank = upgrade.kind === 'weapon' ? run.loadout.find(slot => slot.base === upgrade.weapon)?.rank ?? 0 : 0;
            const cue = upgrade.kind === 'weapon' ? weaponCues[upgrade.weapon] : supportCues[upgrade.kind];
            const category = upgrade.kind === 'weapon' ? currentRank ? `Weapon · rank ${currentRank} → ${currentRank + 1}` : 'New weapon' : supportCues[upgrade.kind].category;
            const icon = document.createElement('span'); icon.className = 'choice-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = cue.icon;
            const label = document.createElement('small'); label.className = 'choice-category'; label.textContent = category;
            const title = document.createElement('strong'); setText(title, upgrade.name);
            const purpose = document.createElement('span'); purpose.className = 'choice-purpose'; purpose.textContent = cue.purpose;
            const detail = document.createElement('span'); detail.className = 'choice-detail'; setText(detail, choice.description);
            button.append(icon, label, title, purpose, detail); return button;
          }));
          if (focused || root.dataset.screen === 'choosing') choices.querySelector('button')?.focus({ preventScroll: true });
        }
      } else choiceSignature = '';
      root.classList.toggle('in-danger', run.player.health <= clearing.keeper.maxHealth * 0.3);
      if (run.outcome) {
        setText(description, `${run.outcome === 'victory' ? 'The clearing welcomes the first light. ' : ''}${formatTime(Math.floor(run.elapsed))} survived · ${run.stats.kills} enemies defeated · ${run.stats.eliteKills} elite defeated · Level ${run.progression.level} · ${run.player.health} HP remaining.`);
      }
    },
    show(screen: Screen, focus = true) {
      for (const control of Object.values(controls)) control.disabled = screen !== 'playing';
      results.element.hidden = !['paused', 'victory', 'defeat'].includes(screen);
      $<HTMLElement>('.upgrade-panel').hidden = screen !== 'choosing';
      if (screen === 'choosing') heading.textContent = 'Choose an upgrade';
      description.textContent = screen === 'paused' ? '' : roundDescription();
      menu.show(screen, focus);
    },
  };
}
