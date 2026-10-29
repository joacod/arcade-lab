import { createThemeSelect } from '../../common/ui/theme-select.ts';
import { themes, type Appearance } from './themes.ts';
import { createElementLookup, setProperty, setAttribute } from '../../common/ui/dom.ts';
import { createMenuReadout } from '../../common/ui/menu-components.ts';
import { createGameMenu } from '../../common/ui/menu.ts';
import { operators } from './content.ts';
import { objectiveText, readyToExtract } from './game.ts';
import type { Run, BlastEvent } from './state.ts';
import type { Control } from './input.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'interlude' | 'victory' | 'defeat';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'continue' | 'quit' | 'fullscreen';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void, appearance: (id: Appearance) => void) {
  root.innerHTML = `<header class="blast-hud"><div class="blast-identity"><span class="blast-emblem" aria-hidden="true">↗</span><div><b class="blast-operator">NOVA</b><small class="blast-weapon">ASSAULT / AUTO RIFLE</small><span class="blast-health" aria-label="Health">▰ ▰ ▰ ▰ ▰</span></div></div><div class="blast-orders"><small class="blast-mission">01 / BORDER STATION</small><output class="blast-objective" aria-label="Mission objective"></output></div><div class="blast-resources"><span><b class="blast-lives">5</b> LIVES</span><span><b class="blast-grenades">4</b> GRENADES</span></div><button data-intent="pause" aria-label="Pause">Pause</button></header>
  <main class="blast-stage"><div class="blast-topline"><span>ROGUE MACHINE TERRITORY</span><span class="blast-sector">SECTOR 01 / BORDER STATION</span></div><div class="blast-banner" role="status" hidden><b></b><span></span></div>
  </main>
  <div class="blast-route" aria-label="Mission route"><div class="blast-progress"></div><span class="blast-route-label">INSERTION</span><span>EXTRACTION →</span></div>
  <footer class="blast-footer"><div class="blast-hint">A D <span>MOVE</span>　SPACE <span>JUMP</span>　J <span>FIRE</span>　W S <span>AIM</span>　K <span>GRENADE</span>　Q <span>SWITCH</span>　P <span>PAUSE / RESUME</span></div><div class="blast-touch"><div class="blast-directions"><button data-control="up" aria-label="Aim up">↑</button><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button><button data-control="down" aria-label="Aim down">↓</button></div><button class="blast-swap" data-control="switch" aria-label="Switch operator">Q<small>SWITCH</small></button><div class="blast-triggers"><button data-control="grenade" aria-label="Throw grenade">K<small>GRENADE</small></button><button data-control="jump" aria-label="Jump">↟<small>JUMP</small></button><button data-control="fire" aria-label="Fire">J<small>FIRE</small></button></div></div></footer>`;
  const $ = createElementLookup(root);
  $('.blast-stage').prepend(surface);
  const pause = $<HTMLButtonElement>('[data-intent="pause"]');
  pause.addEventListener('click', () => act('pause'), { signal });
  const results = createMenuReadout('Operation results');
  const theme = createThemeSelect({ names: { normal: 'Iron coast' }, signal, modes: themes, value: 'normal', onChange: appearance });
  const menu = createGameMenu<Intent, Screen>(root, surface, $('.blast-stage'), {
    id: 'blast', title: 'Blastline', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer, :scope > .blast-route'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'),
    game: results.element, theme: theme.element,
    controls: `<b>A D / ← →</b> MOVE　 <b>SPACE</b> JUMP　 <b>J</b> HOLD TO FIRE<br><b>W S / ↑ ↓</b> AIM　 <b>K</b> GRENADE　 <b>Q</b> SWITCH AFTER RESCUE<br><span>Move + aim for diagonals. Release jump for a short hop.<br>Hit red barrels. Shoot glowing relays. Green flags resupply.<br>Five lives. Checkpoints keep your progress. Get to the extraction pad.</span><p>Touch: use the on-screen controls.</p>`,
    actions: [{ id: 'start', label: 'Play', screens: ['title'], primary: true },
      { id: 'resume', label: 'Resume', screens: ['paused'], primary: true },
      { id: 'continue', label: 'Continue', screens: ['interlude'], primary: true },
      { id: 'restart', label: 'Restart', screens: ['paused', 'victory', 'defeat', 'interlude'], primary: true },
      { id: 'quit', label: 'Game selection', screens: ['title', 'paused', 'victory', 'defeat', 'interlude'] }],
  });

  const controls = Object.fromEntries((['left', 'right', 'up', 'down', 'jump', 'fire', 'grenade', 'switch'] as const).map(c => [c, $<HTMLButtonElement>(`[data-control="${c}"]`)])) as Record<Control, HTMLButtonElement>;
  let screen: Screen = 'title', notice = '', detail = '', noticeUntil = 0;
  function write(selector: string, value: string) { const el = $(selector); if (el.textContent !== value) el.textContent = value; }
  return { controls,
    soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    fullscreen: menu.fullscreen,
    reset() { notice = ''; noticeUntil = 0; },
    consume(events: readonly BlastEvent[], run: Run) {
      const event = events.find(e => ['rescue', 'alarm', 'death', 'checkpoint', 'switch'].includes(e.type));
      if (!event) return;
      [notice, detail] = event.type === 'rescue' ? ['BOLT IS BACK.', 'DEMOLITION ONLINE / Q TO SWITCH / SUPPLIES REFILLED'] : event.type === 'alarm' ? ['TIME TO LEAVE.', 'POWER OFFLINE / 70 SECONDS TO EXTRACT →'] : event.type === 'death' ? ['KEEP THE LINE.', `${run.lives} LIVES / REDEPLOYING AT LAST SUPPLY POST`] : event.type === 'checkpoint' ? ['LOCKED & LOADED.', 'CHECKPOINT SAVED / HEALTH + GRENADES REFILLED'] : [operators[run.player.operator].name.toUpperCase(), `${operators[run.player.operator].role} ONLINE`];
      noticeUntil = run.elapsed + (event.type === 'rescue' ? 5 : 2.8);
    },
    show(next: Screen, focus = true) {
      screen = next;
      results.element.hidden = !['paused', 'interlude', 'victory', 'defeat'].includes(next);
      menu.heading.textContent = next === 'title' ? 'Blastline' : next === 'paused' ? 'Paused' : next === 'victory' ? 'Victory' : next === 'defeat' ? 'Defeat' : 'Stage complete';
      menu.description.textContent = next === 'title' ? 'Rescue Bolt, cut the power and reach extraction. Supply posts save progress and refill your resources.' : next === 'paused' ? '' : next === 'interlude' ? 'Bolt is free. The border is behind you. The foundry is still running. Time to fix that.' : next === 'victory' ? 'Both operators extracted.' : 'Restart to restore terrain and supplies.';

      for (const b of Object.values(controls)) b.disabled = next !== 'playing';
      menu.show(next, focus);
    },
    update(run: Run) {
      const p = run.player, op = operators[p.operator];
      write('.blast-operator', op.name.toUpperCase()); write('.blast-weapon', `${op.role} / ${p.operator === 'nova' ? 'AUTO RIFLE' : 'ROCKET LAUNCHER'}`);
      write('.blast-health', Array.from({ length: 5 }, (_, i) => i < p.health ? '▰' : '▱').join(' ')); setAttribute($('.blast-health'), 'aria-label', `Health ${p.health} of 5`);
      write('.blast-lives', String(run.lives)); write('.blast-grenades', String(run.grenades));
      write('.blast-mission', `0${run.missionIndex + 1} / ${run.mission.name.toUpperCase()}`); write('.blast-objective', objectiveText(run));
      write('.blast-sector', `SECTOR 0${run.missionIndex + 1} / ${run.mission.name.toUpperCase()}`);
      setProperty($('.blast-progress').style, 'width', `${Math.round(Math.min(100, run.player.x / run.mission.exit.x * 100) * 100) / 100}%`);
      setProperty(controls.switch, 'disabled', screen !== 'playing' || !run.rescued);
      const banner = $('.blast-banner');
      setProperty(banner, 'hidden', screen !== 'playing' || run.elapsed > noticeUntil && run.extraction === 0 || !notice && run.extraction === 0);
      write('.blast-banner b', run.extraction > 0 ? 'CATCH YOUR BREATH.' : notice);
      write('.blast-banner span', run.extraction > 0 ? 'EXTRACTION CONFIRMED / STAND CLEAR' : detail);
      $('.blast-objective').classList.toggle('blast-urgent', readyToExtract(run));
      results.update(`${run.status === 'victory' ? 'OPERATION COMPLETE' : run.status === 'defeat' ? run.collapse === 0 ? 'FACILITY COLLAPSED' : 'NO LIVES REMAINING' : run.status === 'interlude' ? 'BORDER STATION COMPLETE' : run.mission.name.toUpperCase()}\n${String(run.score).padStart(6, '0')} POINTS　/　${Math.floor(run.elapsed / 60)}:${String(Math.floor(run.elapsed % 60)).padStart(2, '0')}\n${run.destroyed} TILES BROKEN　/　${run.kills} MACHINES DOWN　/　${run.lives} LIVES`);
    },
  };
}
