import { createGameMenu } from '../../engine/browser/menu.ts';
import { flight, fortress, waves } from './content.ts';
import type { Run } from './game.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'quit' | 'fullscreen';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void) {
  root.innerHTML = `<header class="skybreak-hud">
    <div class="skybreak-brand">SKYBREAK</div>
    <div class="skybreak-score"><span>SCORE</span><output aria-label="Score">000000</output></div>
    <div class="skybreak-condition"><output aria-label="Aircraft lives">3 lives</output><output aria-label="Aircraft hull">Hull ●●●</output></div>
    <button data-intent="pause">Pause</button></header>
    <main class="skybreak-stage"><div class="skybreak-boss" hidden><div><strong>IRON TEMPEST</strong><output aria-label="Fortress phase"></output></div><progress aria-label="Iron Tempest hull" max="${fortress.health}" value="${fortress.health}"></progress><span class="skybreak-boss-pattern"></span></div></main>
    <footer class="skybreak-footer"><div><output aria-label="Sortie progress">00 / 168 s</output><output class="skybreak-loadout" aria-label="Aircraft weapons">GUN I</output><span class="skybreak-wave">AWAITING TAKEOFF</span></div><button class="skybreak-evade" aria-label="Evasive roll">ROLL <span>READY</span></button></footer>`;
  root.querySelector('.skybreak-stage')!.prepend(surface);
  const pause = root.querySelector<HTMLButtonElement>('[data-intent="pause"]')!;
  pause.addEventListener('click', () => act('pause'), { signal });
  const menu = createGameMenu<Intent, Screen>(root, surface, root.querySelector('.skybreak-stage')!, {
    id: 'skybreak', title: 'Skybreak', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'),
    game: `<div class="skybreak-results" hidden><output aria-label="Flight results"></output></div>`,
    controls: `WASD / arrows to steer · Space / J to fire<br>Shift / K to roll · Escape to pause<br>Touch: hold & drag to steer and fire. Tap Roll to evade.<p><b>↑ POWER</b> forward guns · <b>⋔ SPREAD</b> 24s<br><b>+ REPAIR</b> one hull · Glow marks boss weak points.</p>`,
    actions: [{ id: 'start', label: 'Play', screens: ['title'], primary: true },
      { id: 'resume', label: 'Resume', screens: ['paused'], primary: true },
      { id: 'restart', label: 'Restart', screens: ['paused', 'victory', 'defeat'], primary: true },
      { id: 'quit', label: 'Game selection', screens: ['title', 'paused', 'victory', 'defeat'] }],
  });

  const description = menu.description;
  const evade = root.querySelector<HTMLButtonElement>('.skybreak-evade')!;
  const score = root.querySelector('[aria-label="Score"]')!, lives = root.querySelector('[aria-label="Aircraft lives"]')!;
  const hull = root.querySelector('[aria-label="Aircraft hull"]')!, progress = root.querySelector('[aria-label="Sortie progress"]')!;
  const wave = root.querySelector('.skybreak-wave')!, roll = evade.querySelector('span')!;
  return { evade,
    fullscreen: menu.fullscreen,
    soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    show(screen: Screen, focus = true) {
      menu.heading.textContent = screen === 'title' ? 'Skybreak' : screen === 'paused' ? 'Paused' : screen === 'victory' ? 'Victory' : screen === 'defeat' ? 'Defeat' : 'Stage complete';
      description.textContent = screen === 'paused' ? '' : screen === 'victory' ? 'Iron Tempest destroyed.' : screen === 'defeat' ? 'Sortie ended.' : 'Destroy Iron Tempest before 2:48. Collect supplies to upgrade your guns and repair your hull.';

      root.querySelector<HTMLElement>('.skybreak-results')!.hidden = !['paused', 'victory', 'defeat'].includes(screen);
      evade.disabled = screen !== 'playing';
      menu.show(screen, focus);
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
      root.querySelector('[aria-label="Flight results"]')!.textContent = `${String(run.score).padStart(6, '0')} POINTS · ${minutes}:${seconds}\n${run.stats.kills} aircraft down · ${run.stats.pickups} supplies\n${run.status === 'active' || run.status === 'paused' ? '' : run.status === 'victory' ? `${run.bonus} survival bonus · ${run.player.lives} lives home` : run.elapsed >= flight.duration ? 'Time limit reached · Fortress escaped' : 'All aircraft lost'}`;
      roll.textContent = run.player.roll > 0 ? 'IMMUNE' : run.player.recharge > 0 ? `${Math.ceil(run.player.recharge)}s` : 'READY';
      evade.dataset.ready = String(run.player.recharge <= 0); evade.setAttribute('aria-label', `Evasive roll: ${roll.textContent}`);
    },
  };
}
