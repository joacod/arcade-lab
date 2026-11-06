import { defaultTheme, createThemeChoices } from '../../common/ui/theme-choices.ts';
import { createElementLookup, setText, setProperty, setAttribute } from '../../common/ui/dom.ts';
import { createMenuReadout } from '../../common/ui/menu-components.ts';
import { createGameMenu, menuActions, type CommonMenuIntent } from '../../common/ui/menu.ts';
import { flight, fortress, waves } from './content.ts';
import type { Run } from './game.ts';
import { themes, type Appearance } from './themes.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
export type Intent = CommonMenuIntent;
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void, onTheme: (id: Appearance) => void) {
  root.innerHTML = `<header class="skybreak-hud">
    <div class="skybreak-brand">SKYBREAK</div>
    <div class="skybreak-score"><span>SCORE</span><output aria-label="Score">000000</output></div>
    <div class="skybreak-condition"><output aria-label="Aircraft hull"><span class="skybreak-condition-label" aria-hidden="true">Hull</span><span class="skybreak-hull-segments" aria-hidden="true">${Array.from({ length: flight.player.health }, () => '<span data-filled="true"></span>').join('')}</span><span class="skybreak-hull-value"></span></output><output aria-label="Aircraft lives"><span class="skybreak-condition-label">Lives</span> <span class="skybreak-lives-value"></span></output></div>
    <button data-intent="pause">Pause</button></header>
    <main class="skybreak-stage"><div class="skybreak-boss" hidden><div><strong>IRON TEMPEST</strong><output aria-label="Fortress phase"></output></div><progress aria-label="Iron Tempest hull" max="${fortress.health}" value="${fortress.health}"></progress><span class="skybreak-boss-pattern"></span></div></main>
    <footer class="skybreak-footer"><div><output aria-label="Sortie progress"></output><output class="skybreak-loadout" aria-label="Aircraft weapons">GUN I</output><span class="skybreak-wave">AWAITING TAKEOFF</span></div><button class="skybreak-evade" aria-label="Evasive roll">ROLL (K) <span>READY</span></button></footer>`;
  const $ = createElementLookup(root);
  $('.skybreak-stage').prepend(surface);
  const pause = $<HTMLButtonElement>('[data-intent="pause"]');
  pause.addEventListener('click', () => act('pause'), { signal });
  const results = createMenuReadout('Flight results');
  const appearance = createThemeChoices({ names: Object.fromEntries(Object.entries(themes).map(([id, theme]) => [id, theme.name])), signal, modes: themes, value: defaultTheme(themes), onChange: onTheme });
  const assetStatus = document.createElement('p'); assetStatus.className = 'skybreak-asset-status'; assetStatus.setAttribute('role', 'status'); assetStatus.hidden = true;
  const menu = createGameMenu<Intent, Screen>(root, surface, $('.skybreak-stage'), {
    id: 'skybreak', title: 'Skybreak', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'),
    game: results.element, theme: appearance.element,
    controls: `WASD / arrows to steer · Space / J to fire<br>Shift / K to roll<br>Touch: hold & drag to steer and fire. Tap Roll to evade.<p><b>↑ POWER</b> forward guns · <b>⋔ SPREAD</b> 24s<br><b>+ REPAIR</b> one hull · Glow marks boss weak points.</p>`,
    actions: [menuActions.start,
      menuActions.resume,
      menuActions.restart,
      menuActions.quit],
  });

  menu.layer.querySelector('.game-menu-notices')!.prepend(assetStatus);
  const description = menu.description;
  const evade = $<HTMLButtonElement>('.skybreak-evade');
  const score = $('[aria-label="Score"]'), lives = $('.skybreak-lives-value');
  const hull = $('[aria-label="Aircraft hull"]'), progress = $('[aria-label="Sortie progress"]');
  const hullValue = $('.skybreak-hull-value'), hullSegments = [...hull.querySelectorAll<HTMLElement>('.skybreak-hull-segments > span')];
  const formatTime = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
  const wave = $('.skybreak-wave'), roll = evade.querySelector('span')!;
  return { evade,
    appearance(id: Appearance) { appearance.setValue(id); },
    appearancePending(id: Appearance) { appearance.prepare(id); },
    appearanceStatus(message: string) { assetStatus.textContent = message; assetStatus.hidden = !message; },
    readiness: menu.readiness,
    fullscreen: menu.fullscreen,
    soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    show(screen: Screen, focus = true) {
      description.textContent = screen === 'paused' ? '' : screen === 'victory' ? 'Iron Tempest destroyed.' : screen === 'defeat' ? 'Sortie ended.' : 'Destroy Iron Tempest before 2:48. Collect supplies to upgrade your guns and repair your hull.';

      results.element.hidden = !['paused', 'victory', 'defeat'].includes(screen);
      evade.disabled = screen !== 'playing';
      menu.show(screen, focus);
    },
    update(run: Run) {
      setText(score, String(run.score).padStart(6, '0')); setText(lives, String(run.player.lives));
      setText(hullValue, `${run.player.health} of ${flight.player.health}`);
      hullSegments.forEach((segment, index) => setProperty(segment.dataset, 'filled', String(index < run.player.health)));
      hull.classList.toggle('skybreak-critical', run.player.health <= 1);
      setText(progress, `${formatTime(Math.min(flight.duration, run.elapsed))} / ${formatTime(flight.duration)}`);
      setText(wave, run.boss ? run.boss.health <= 0 ? 'IRON TEMPEST · DESTROYED' : 'FINAL CONTACT · IRON TEMPEST' : run.nextWave ? `${String(run.nextWave).padStart(2, '0')} / ${waves.length} · ${waves[run.nextWave - 1]!.label.toUpperCase()}` : 'AWAITING TAKEOFF');
      setText($('[aria-label="Aircraft weapons"]'), `GUN ${['I', 'II', 'III'][run.player.power]}${run.player.spread > 0 ? ` + SPREAD ${Math.ceil(run.player.spread)}s` : ''}`);
      const bossPanel = $<HTMLElement>('.skybreak-boss');
      setProperty(bossPanel, 'hidden', !run.boss || run.boss.health <= 0);
      if (run.boss) {
        setProperty($<HTMLProgressElement>('[aria-label="Iron Tempest hull"]'), 'value', Math.max(0, run.boss.health));
        setText($('[aria-label="Fortress phase"]'), `PHASE ${run.boss.phase} / 2`);
        setText($('.skybreak-boss-pattern'), run.boss.age < fortress.entrance ? 'APPROACHING · AIM FOR THE LIGHTS' : run.boss.charge > 0 ? ({ fan: 'FAN VOLLEY · FIND A GAP', aim: 'TARGET LOCK · LEAVE THE MARKER', lanes: 'BARRAGE · LEAVE THE MARKED LANES' } as const)[run.boss.attack] : 'KEEP FIRING · AIM FOR THE LIGHTS');
      }
      const minutes = Math.floor(run.elapsed / 60), seconds = String(Math.floor(run.elapsed % 60)).padStart(2, '0');
      results.update(`${String(run.score).padStart(6, '0')} POINTS · ${minutes}:${seconds}\n${run.stats.kills} aircraft down · ${run.stats.pickups} supplies\n${run.status === 'active' || run.status === 'paused' ? '' : run.status === 'victory' ? `${run.bonus} survival bonus · ${run.player.lives} lives home` : run.elapsed >= flight.duration ? 'Time limit reached · Fortress escaped' : 'All aircraft lost'}`);
      setText(roll, run.player.roll > 0 ? 'IMMUNE' : run.player.recharge > 0 ? `${Math.ceil(run.player.recharge)}s` : 'READY');
      setProperty(evade.dataset, 'ready', String(run.player.recharge <= 0)); setAttribute(evade, 'aria-label', `Evasive roll: ${roll.textContent}`);
    },
  };
}
