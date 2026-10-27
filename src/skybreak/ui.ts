import { flight, fortress, waves } from './content.ts';
import type { Run } from './game.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'quit';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void) {
  root.innerHTML = `<header class="skybreak-hud">
    <div class="skybreak-brand">SKYBREAK <span>ARCADE LAB / 02</span></div>
    <div class="skybreak-score"><span>SCORE</span><output aria-label="Score">000000</output></div>
    <div class="skybreak-condition"><output aria-label="Aircraft lives">3 lives</output><output aria-label="Aircraft hull">Hull ●●●</output></div>
    <button data-intent="pause">Pause</button></header>
    <main class="skybreak-stage"><div class="skybreak-boss" hidden><div><strong>IRON TEMPEST</strong><output aria-label="Fortress phase"></output></div><progress aria-label="Iron Tempest hull" max="${fortress.health}" value="${fortress.health}"></progress><span class="skybreak-boss-pattern"></span></div><div class="skybreak-menu-layer"><section class="skybreak-menu" aria-labelledby="skybreak-heading">
      <p class="skybreak-eyebrow">OPERATION / IRON TEMPEST</p><h1 id="skybreak-heading">Own the<br>open sky.</h1>
      <p class="skybreak-description">Break the escort. Collect supplies. Destroy Iron Tempest before 2:48.</p>
      <div class="skybreak-brief"><span>2–3 MINUTES</span><span>FINAL BOSS</span><span>3 LIVES</span></div>
      <div class="skybreak-results" hidden><output aria-label="Flight results"></output></div><div class="skybreak-menu-actions"><button data-intent="start" class="skybreak-primary">Take flight ↗</button><button data-intent="resume" class="skybreak-primary" hidden>Resume flight ↗</button><button data-intent="restart" hidden>Fly again</button><button data-intent="quit">Game selection</button></div>
      <p class="skybreak-controls">WASD / arrows to steer · Space / J to fire<br>Shift / K to roll · Escape to pause<br>Touch: hold & drag to steer and fire. Tap Roll to evade.</p>
      <p class="skybreak-pickup-guide"><b>↑ POWER</b> forward guns · <b>⋔ SPREAD</b> 24s<br><b>+ REPAIR</b> one hull · Glow marks boss weak points.</p><button class="skybreak-mute" aria-pressed="false">Mute sound</button><p class="skybreak-audio-status" role="status" hidden></p>
    </section></div></main>
    <footer class="skybreak-footer"><div><output aria-label="Sortie progress">00 / 168 s</output><output class="skybreak-loadout" aria-label="Aircraft weapons">GUN I</output><span class="skybreak-wave">AWAITING TAKEOFF</span></div><button class="skybreak-evade" aria-label="Evasive roll">ROLL <span>READY</span></button></footer>`;
  root.querySelector('.skybreak-stage')!.prepend(surface);
  const layer = root.querySelector<HTMLElement>('.skybreak-menu-layer')!;
  const heading = root.querySelector('h1')!, description = root.querySelector('.skybreak-description')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-intent]')];
  for (const button of buttons) button.addEventListener('click', () => act(button.dataset.intent as Intent), { signal });
  const muteButton = root.querySelector<HTMLButtonElement>('.skybreak-mute')!;
  let muted = false;
  muteButton.addEventListener('click', () => {
    muted = !muted; muteButton.setAttribute('aria-pressed', String(muted)); muteButton.textContent = muted ? 'Unmute sound' : 'Mute sound'; mute(muted);
  }, { signal });
  const evade = root.querySelector<HTMLButtonElement>('.skybreak-evade')!;
  const score = root.querySelector('[aria-label="Score"]')!, lives = root.querySelector('[aria-label="Aircraft lives"]')!;
  const hull = root.querySelector('[aria-label="Aircraft hull"]')!, progress = root.querySelector('[aria-label="Sortie progress"]')!;
  const wave = root.querySelector('.skybreak-wave')!, roll = evade.querySelector('span')!;
  return { evade,
    soundStatus(message: string) {
      const status = root.querySelector<HTMLElement>('.skybreak-audio-status')!; status.textContent = message; status.hidden = !message;
    },
    show(screen: Screen, focus = true) {
      root.dataset.screen = screen; layer.hidden = screen === 'playing';
      surface.tabIndex = screen === 'playing' ? 0 : -1;
      surface.setAttribute('aria-hidden', String(screen !== 'playing'));
      heading.innerHTML = screen === 'paused' ? 'Holding<br>pattern.' : screen === 'victory' ? 'Clear skies.<br>Welcome home.' : screen === 'defeat' ? 'Lost over<br>the blue.' : 'Own the<br>open sky.';
      description.textContent = screen === 'paused' ? 'Flight is paused. Your next move can wait.' : screen === 'victory' ? 'Iron Tempest is down. The horizon is yours.' : screen === 'defeat' ? 'The fortress held the passage. Refit and try again.' : 'Break the escort. Collect supplies. Destroy Iron Tempest before 2:48.';
      root.querySelector<HTMLElement>('.skybreak-brief')!.hidden = screen !== 'title';
      for (const button of buttons) {
        const intent = button.dataset.intent;
        button.hidden = intent === 'pause' ? screen !== 'playing' : intent === 'start' ? screen !== 'title' : intent === 'resume' ? screen !== 'paused' : intent === 'restart' ? !['paused', 'victory', 'defeat'].includes(screen) : screen === 'playing';
        if (intent === 'restart') button.textContent = screen === 'paused' ? 'Restart sortie' : 'Fly again';
      }
      root.querySelector<HTMLElement>('.skybreak-results')!.hidden = !['victory', 'defeat'].includes(screen);
      evade.disabled = screen !== 'playing';
      if (focus) {
        if (screen === 'playing') surface.focus({ preventScroll: true });
        else buttons.find(b => !b.hidden)?.focus({ preventScroll: true });
      }
    },
    update(run: Run) {
      score.textContent = String(run.score).padStart(6, '0'); lives.textContent = `${run.player.lives} lives`;
      hull.textContent = `Hull ${'●'.repeat(run.player.health)}${'○'.repeat(flight.player.health - run.player.health)}`;
      progress.textContent = `${String(Math.min(flight.duration, Math.floor(run.elapsed))).padStart(2, '0')} / ${flight.duration} s`;
      wave.textContent = run.boss ? run.boss.health <= 0 ? 'IRON TEMPEST · DESTROYED' : 'FINAL CONTACT · IRON TEMPEST' : run.nextWave ? `${String(run.nextWave).padStart(2, '0')} / ${waves.length} · ${waves[run.nextWave - 1]!.label.toUpperCase()}` : 'AWAITING TAKEOFF';
      root.querySelector('[aria-label="Aircraft weapons"]')!.textContent = `GUN ${['I', 'II', 'III'][run.player.power]}${run.player.spread > 0 ? ` + SPREAD ${Math.ceil(run.player.spread)}s` : ''}`;
      const bossPanel = root.querySelector<HTMLElement>('.skybreak-boss')!;
      bossPanel.hidden = !run.boss || run.boss.health <= 0;
      if (run.boss) {
        root.querySelector<HTMLProgressElement>('[aria-label="Iron Tempest hull"]')!.value = Math.max(0, run.boss.health);
        root.querySelector('[aria-label="Fortress phase"]')!.textContent = `PHASE ${run.boss.phase} / 2`;
        root.querySelector('.skybreak-boss-pattern')!.textContent = run.boss.age < fortress.entrance ? 'APPROACHING · AIM FOR THE LIGHTS' : run.boss.charge > 0 ? ({ fan: 'FAN VOLLEY · FIND A GAP', aim: 'TARGET LOCK · KEEP MOVING', lanes: 'BARRAGE · LEAVE THE MARKED LANES' } as const)[run.boss.attack] : 'REACTORS EXPOSED';
      }
      const minutes = Math.floor(run.elapsed / 60), seconds = String(Math.floor(run.elapsed % 60)).padStart(2, '0');
      root.querySelector('[aria-label="Flight results"]')!.textContent = `${String(run.score).padStart(6, '0')} POINTS · ${minutes}:${seconds}\n${run.stats.kills} aircraft down · ${run.stats.pickups} supplies\n${run.status === 'victory' ? `${run.bonus} survival bonus · ${run.player.lives} lives home` : run.elapsed >= flight.duration ? 'Time limit reached · Fortress escaped' : 'All aircraft lost'}`;
      roll.textContent = run.player.roll > 0 ? 'IMMUNE' : run.player.recharge > 0 ? `${Math.ceil(run.player.recharge)}s` : 'READY';
      evade.dataset.ready = String(run.player.recharge <= 0); evade.setAttribute('aria-label', `Evasive roll: ${roll.textContent}`);
    },
  };
}
