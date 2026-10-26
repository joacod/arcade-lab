import { clearing, evolution, weapons } from './content.ts';
import { choiceLevel, pickupRadius, xpThreshold } from './progression.ts';
import type { RunState } from './game.ts';

export type Screen = 'title' | 'playing' | 'paused' | 'choosing' | 'victory' | 'defeat';
export type MenuAction = 'start' | 'pause' | 'resume' | 'restart' | 'title';

export function createUI(root: HTMLElement, canvas: HTMLCanvasElement,
  onAction: (action: MenuAction) => void, onChoose: (id: string) => void, signal: AbortSignal) {
  root.innerHTML = `
    <header class="masthead"><a class="brand" href="./"><span class="brand-mark" aria-hidden="true">a</span> arcade lab<span class="brand-divider">/</span><span class="brand-note">Experiments in play</span></a><span class="edition">FIELD STUDY 001</span></header>
    <main>
      <div class="introduction"><div><p class="eyebrow">01 / A LIGHT IN THE WOODS</p><h1>Last Light Clearing<span>.</span></h1></div><p class="intro-note">Find your footing.<br>Keep a little light alive.</p></div>
      <div class="game-shell">
        <div class="hud"><div class="hud-identity"><span class="live-dot"></span><strong>THE CLEARING</strong><span class="status">Ready to survive</span></div><div class="hud-actions"><output class="timer" aria-label="Active time">00:00</output><button data-action="pause" class="pause-button" hidden>Pause <kbd>Esc</kbd></button></div></div>
        <div class="combat-hud"><label>KEEPER <meter class="health-meter" min="0" max="100" value="100" aria-label="Keeper health"></meter><output class="health-value">100 / 100 HP</output></label><output class="loadout">Spark · Rank 1</output><output class="kills">0 defeated</output></div><div class="progress-hud"><output class="progress">Level 1 · XP 0 / 10</output><output class="modifiers">Pickup 48</output></div><div class="stage"><div class="menu-layer"><section class="menu" aria-labelledby="menu-heading"><p class="eyebrow menu-kicker">LAST LIGHT CLEARING</p><div class="lantern" aria-hidden="true">✦</div><h2 id="menu-heading">Keep the light alive.</h2><p class="menu-description">Survive three minutes as the Keeper.<br>Collect gems. Choose upgrades. Survive until dawn.</p><div class="upgrade-choices" hidden></div><div class="menu-actions"><button class="primary" data-action="start">Enter the clearing <span aria-hidden="true">↗</span></button><button class="primary" data-action="resume" hidden>Resume surviving <span aria-hidden="true">↗</span></button><button data-action="restart" hidden>Restart</button><button data-action="title" hidden>Return to title</button></div><p class="menu-footnote">Survival study · Movement is your only weapon control.</p></section></div></div>
        <div class="controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span class="control-copy">or arrow keys to move</span></span><span class="touch-hint"><span aria-hidden="true">◎</span> Drag in the clearing to move</span></div>
      </div>
      <footer><p><span class="footer-dot"></span> STEP 03 <span class="footer-divider">/</span> The complete clearing</p><p>Built for the browser. Room to grow.</p></footer>
    </main>`;
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
  const heading = root.querySelector<HTMLElement>('h2')!;
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
  return {
    update(run: Readonly<RunState>) {
      timer.value = `${formatTime(Math.floor(run.elapsed))} / ${formatTime(clearing.round.duration)}`;
      health.value = run.player.health;
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
      layer.hidden = screen === 'playing';
      choices.hidden = screen !== 'choosing';
      canvas.tabIndex = screen === 'playing' ? 0 : -1;
      canvas.setAttribute('aria-hidden', String(screen !== 'playing'));
      heading.textContent = screen === 'victory' ? 'Dawn finds you standing.'
        : screen === 'defeat' ? 'Your light fades.' : screen === 'choosing' ? 'Choose an upgrade' : screen === 'paused' ? 'Take a breath.' : 'Keep the light alive.';
      description.innerHTML = screen === 'paused'
        ? 'Your light is safe here.<br>Return when you’re ready.'
        : 'Survive three minutes as the Keeper.<br>Collect gems. Choose upgrades. Survive until dawn.';
      footnote.textContent = screen === 'paused' ? 'Active time and combat are paused.'
        : 'Survival study · Movement is your only weapon control.';
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
