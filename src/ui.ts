import { clearing, configurations, evolution, weapons, type ConfigurationId } from './content.ts';
import { choiceLevel, pickupRadius, xpThreshold } from './progression.ts';
import type { RunState } from './game.ts';
import { themes, type ThemeId } from './themes.ts';
import type { ViewMode } from './view.ts';

export type Screen = 'title' | 'playing' | 'paused' | 'choosing' | 'victory' | 'defeat';
export type MenuAction = 'start' | 'pause' | 'resume' | 'restart' | 'title';

interface UIOptions {
  signal: AbortSignal;
  onAction(action: MenuAction): void;
  onChoose(id: string): void;
  onConfiguration(id: ConfigurationId): void;
  onTheme(id: ThemeId): void;
  onMute(value: boolean): void;
  onVolume(value: number): void;
  onView(mode: ViewMode): void;
  onFullscreen(): void;
}
export function createUI(root: HTMLElement, canvas: HTMLCanvasElement, options: UIOptions) {
  const { signal, onAction, onChoose, onConfiguration, onTheme, onMute, onVolume } = options;
  root.innerHTML = `
    <main class="game-shell">
      <header class="hud">
        <a class="brand" href="./" aria-label="Arcade Lab home">Last Light Clearing<span>arcade lab</span></a>
        <div class="vitals"><meter class="health-meter" min="0" max="100" value="100" aria-label="Keeper health"></meter><output class="health-value">100 / 100 HP</output></div>
        <output class="timer" aria-label="Active time">00:00</output>
        <output class="progress">Level 1 · XP 0 / 10</output>
        <div class="hud-actions"><button data-action="pause" hidden>Pause</button><button class="fullscreen" hidden>Fullscreen</button></div>
      </header>
      <div class="xp-track" aria-hidden="true"><span></span></div>
      <div class="stage"><div class="menu-layer"><section class="menu" aria-labelledby="menu-heading">
        <p class="eyebrow">LAST LIGHT CLEARING <span class="status">Ready to survive</span></p>
        <h1 id="menu-heading">Keep the light alive.</h1>
        <p class="menu-description">Collect gems. Choose upgrades. Survive until dawn.</p>
        <div class="upgrade-choices" hidden></div>
        <div class="menu-actions"><button class="primary" data-action="start">Enter the clearing <span aria-hidden="true">↗</span></button><button class="primary" data-action="resume" hidden>Resume surviving <span aria-hidden="true">↗</span></button><button data-action="restart" hidden>Restart</button><button data-action="title" hidden>Return to title</button></div>
        <div class="settings">
          <div class="setup"><label>Round <select aria-label="Round configuration">${Object.entries(configurations).map(([id, config]) => `<option value="${id}">${config.name}</option>`).join('')}</select></label><p class="configuration-note">${configurations.clearing.description}</p></div>
          <div class="display-settings"><label>Artwork <select aria-label="Visual theme">${Object.entries(themes).map(([id, theme]) => `<option value="${id}">${theme.name}</option>`).join('')}</select></label><label>View <select aria-label="View"><option value="close">Close view</option><option value="arena">Whole arena</option></select></label></div>
          <div class="sound-controls"><button class="mute" aria-pressed="false">Mute</button><label>Volume <input aria-label="Sound volume" type="range" min="0" max="100" value="45"></label></div>
          <p class="controls">Move with WASD / arrows, or press and drag.<br>Weapons fire automatically. Escape / P pauses.<br>Focus loss and display changes pause. Use Resume to return.</p>
        </div>
        <div class="run-details" hidden><output class="loadout">Spark 1</output><output class="modifiers">Pickup 48</output><output class="kills">0 defeated</output></div>
        <p class="menu-footnote">Movement is your only weapon control.</p>
      </section></div></div>
      <aside class="notices" aria-label="Game notices"><p class="asset-status" role="status" hidden></p><p class="sound-status" role="status" hidden></p><p class="display-status" role="status" hidden></p></aside>
    </main>`;
  let configuration: ConfigurationId = 'clearing', muted = false;
  const configurationSelect = root.querySelector<HTMLSelectElement>('[aria-label="Round configuration"]')!;
  const themeSelect = root.querySelector<HTMLSelectElement>('[aria-label="Visual theme"]')!;
  configurationSelect.addEventListener('change', () => {
    const id = configurationSelect.value;
    if (id in configurations) {
      configuration = id as ConfigurationId;
      root.querySelector('.configuration-note')!.textContent = configurations[configuration].description;
      description.innerHTML = roundDescription();
      onConfiguration(configuration);
    }
  }, { signal });
  themeSelect.addEventListener('change', () => {
    if (themeSelect.value in themes) onTheme(themeSelect.value as ThemeId);
  }, { signal });
  root.querySelector<HTMLSelectElement>('[aria-label="View"]')!.addEventListener('change', event => {
    options.onView((event.target as HTMLSelectElement).value as ViewMode);
  }, { signal });
  const fullscreen = root.querySelector<HTMLButtonElement>('.fullscreen')!;
  fullscreen.addEventListener('click', options.onFullscreen, { signal });
  const mute = root.querySelector<HTMLButtonElement>('.mute')!;
  mute.addEventListener('click', () => {
    muted = !muted; mute.setAttribute('aria-pressed', String(muted)); mute.textContent = muted ? 'Unmute' : 'Mute'; onMute(muted);
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
  stage.prepend(canvas);
  const layer = root.querySelector<HTMLElement>('.menu-layer')!;
  const heading = root.querySelector<HTMLElement>('h1')!;
  const description = root.querySelector<HTMLElement>('.menu-description')!;
  const status = root.querySelector<HTMLElement>('.status')!;
  const timer = root.querySelector<HTMLOutputElement>('.timer')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button[data-action]')];
  for (const button of buttons) {
    button.addEventListener('click', () => onAction(button.dataset.action as MenuAction), { signal });
  }
  const health = root.querySelector<HTMLMeterElement>('.health-meter')!;
  health.max = clearing.keeper.maxHealth;
  const healthValue = root.querySelector<HTMLOutputElement>('.health-value')!;
  const kills = root.querySelector<HTMLOutputElement>('.kills')!;
  const footnote = root.querySelector<HTMLElement>('.menu-footnote')!;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const roundDescription = () => `Survive ${configurations[configuration].round.duration} seconds as the Keeper.<br>Collect gems. Choose upgrades. Survive until dawn.`;
  return {
    fullscreen(available: boolean, active: boolean) {
      fullscreen.hidden = !available;
      fullscreen.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
      fullscreen.setAttribute('aria-pressed', String(active));
    },
    displayStatus(message: string) { const element = root.querySelector<HTMLElement>('.display-status')!; element.hidden = !message; element.textContent = message; },
    assetStatus(message: string) { const element = root.querySelector<HTMLElement>('.asset-status')!; element.hidden = !message; element.textContent = message; },
    soundStatus(message: string) { const element = root.querySelector<HTMLElement>('.sound-status')!; element.hidden = !message; element.textContent = message; },
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
        footnote.textContent = `${run.stats.shots} projectiles fired · ${run.stats.damageDealt} damage dealt · ${run.stats.damageTaken} damage taken`;
      }
    },
    show(screen: Screen, focus = true) {
      root.dataset.screen = screen;
      root.querySelector<HTMLElement>('.setup')!.hidden = screen !== 'title';
      root.querySelector<HTMLElement>('.settings')!.hidden = screen !== 'title' && screen !== 'paused';
      root.querySelector<HTMLElement>('.run-details')!.hidden = screen === 'title';
      layer.hidden = screen === 'playing';
      choices.hidden = screen !== 'choosing';
      canvas.tabIndex = screen === 'playing' ? 0 : -1;
      canvas.setAttribute('aria-hidden', String(screen !== 'playing'));
      heading.textContent = screen === 'victory' ? 'Dawn finds you standing.'
        : screen === 'defeat' ? 'Your light fades.' : screen === 'choosing' ? 'Choose an upgrade' : screen === 'paused' ? 'Take a breath.' : 'Keep the light alive.';
      description.innerHTML = screen === 'paused'
        ? 'Your light is safe here.<br>Return when you’re ready.'
        : roundDescription();
      footnote.textContent = screen === 'paused' ? 'Active time and combat are paused.'
        : 'Movement is your only weapon control.';
      status.textContent = screen === 'choosing' ? 'Choosing an upgrade' : screen === 'playing' ? 'Keeper · Surviving' : screen === 'paused' ? 'Paused'
        : screen === 'victory' ? 'Victory' : screen === 'defeat' ? 'Defeat' : 'Ready to survive';
      for (const button of buttons) {
        const action = button.dataset.action;
        button.hidden = !(screen === 'title' ? action === 'start'
          : screen === 'playing' ? action === 'pause'
          : screen === 'choosing' ? false
          : (action === 'resume' && screen === 'paused') || action === 'restart' || action === 'title');
        if (action === 'restart') button.textContent = screen === 'paused' ? 'Restart' : 'Retry';
      }
      if (focus) {
        if (screen === 'playing') canvas.focus({ preventScroll: true });
        else if (screen === 'choosing') choices.querySelector('button')?.focus({ preventScroll: true });
        else buttons.find(button => !button.hidden)?.focus({ preventScroll: true });
      }
    },
  };
}
