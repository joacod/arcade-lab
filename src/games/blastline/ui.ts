import { createDirectionPad } from '../../common/ui/direction-pad.ts';
import { defaultTheme, createThemeChoices } from '../../common/ui/theme-choices.ts';
import { themes, appearanceNames, type Appearance } from './themes.ts';
import { createElementLookup, setProperty, setAttribute } from '../../common/ui/dom.ts';
import { createMenuReadout } from '../../common/ui/menu-components.ts';
import { createGameMenu, menuActions, type CommonMenuIntent } from '../../common/ui/menu.ts';
import { body, operators } from './content.ts';
import { objectiveText, readyToExtract } from './game.ts';
import type { Run, BlastEvent } from './state.ts';
import { initialLayout, layouts, type Layout, type Control } from './input.ts';
import { bindingLabel } from '../../engine/bindings.ts';
import { createKeyboardChoices } from '../../common/ui/keyboard-choices.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'interlude' | 'victory' | 'defeat';
export type Intent = CommonMenuIntent | 'continue';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void, appearance: (id: Appearance) => void, onLayout: (value: Layout) => void) {
  root.innerHTML = `<header class="blast-hud"><div class="blast-identity"><span class="blast-emblem" aria-hidden="true">↗</span><div><b class="blast-operator">NOVA</b><small class="blast-weapon">ASSAULT / AUTO RIFLE</small></div></div><div class="blast-vitals" aria-label="Health, lives and ammunition"><div class="blast-health-group"><span>HEALTH <b class="blast-health-value">${body.health}/${body.health}</b></span><div class="blast-health" role="meter" aria-label="Health" aria-valuemin="0" aria-valuemax="${body.health}" aria-valuenow="${body.health}">${Array.from({ length: body.health }, () => '<i></i>').join('')}</div></div><div class="blast-stock"><b class="blast-lives">${body.lives}</b><span>LIVES</span></div><div class="blast-stock"><b class="blast-grenades">${body.grenades}</b><span>GRENADES</span></div></div><div class="blast-orders"><small class="blast-mission">01 / BORDER STATION</small><output class="blast-objective" aria-label="Mission objective"></output></div><button data-intent="pause" aria-label="Pause">Pause</button></header>
  <main class="blast-stage"><div class="blast-topline"><span>ROGUE MACHINE TERRITORY</span><span class="blast-sector">SECTOR 01 / BORDER STATION</span></div><div class="blast-banner" role="status" hidden><b></b><span></span></div>
  </main>
  <div class="blast-route" aria-label="Mission route"><div class="blast-progress"></div><span class="blast-route-label">INSERTION</span><span>EXTRACTION →</span></div>
  <footer class="blast-footer"><div class="blast-hint"></div><div class="blast-touch"><div class="blast-directions"><button data-control="up" aria-label="Aim up">↑</button><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button><button data-control="down" aria-label="Aim down">↓</button></div><button class="blast-swap" data-control="switch" aria-label="Switch operator"><span data-key="switch"></span><small>SWITCH</small></button><div class="blast-triggers"><button data-control="grenade" aria-label="Throw grenade"><span data-key="grenade"></span><small>GRENADE</small></button><button data-control="jump" aria-label="Jump">↟<small>JUMP</small></button><button data-control="fire" aria-label="Fire"><span data-key="fire"></span><small>FIRE</small></button></div></div></footer>`;
  const $ = createElementLookup(root);
  $('.blast-stage').prepend(surface);
  const pause = $<HTMLButtonElement>('[data-intent="pause"]');
  pause.addEventListener('click', () => act('pause'), { signal });
  const results = createMenuReadout('Operation results');
  let layout: Layout = initialLayout;
  const help = document.createElement('div');
  const keyboard = createKeyboardChoices({ id: 'blast', choices: layouts, value: layout, signal, onChange(value) {
    layout = value; onLayout(layout); reflectBindings();
  } });
  function reflectBindings() {
    const { bindings } = layouts[layout];
    const move = `${bindingLabel(bindings.left)} / ${bindingLabel(bindings.right)}`;
    const aim = `${bindingLabel(bindings.up)} / ${bindingLabel(bindings.down)}`;
    const jump = bindingLabel(bindings.jump), fire = bindingLabel(bindings.fire), grenade = bindingLabel(bindings.grenade), swap = bindingLabel(bindings.switch);
    $('.blast-hint').innerHTML = `${move} <span>MOVE</span>　${jump.toUpperCase()} <span>JUMP</span>　${fire} <span>FIRE</span>　${aim} <span>AIM</span>　${grenade} <span>GRENADE</span>　${swap} <span>SWITCH</span>　P <span>PAUSE / RESUME</span>`;
    for (const action of ['fire', 'grenade', 'switch'] as const) write(`[data-key="${action}"]`, bindingLabel(bindings[action]));
    help.innerHTML = `<b>${move}</b> MOVE　 <b>${jump}</b> JUMP　 <b>${fire}</b> HOLD TO FIRE<br><b>${aim}</b> AIM　 <b>${grenade}</b> GRENADE　 <b>${swap}</b> SWITCH AFTER RESCUE<br><span>Move + aim for diagonals. Release jump for a short hop.<br>Bullets cost 1 health. Enemy explosives and red barrels cost a life.<br>Health reaches 0 → lose one life and redeploy. Green flags save progress.<br>Destroy air-defense relays to unlock extraction: +2 health, +1 grenade and 500 points each.<br>Grenadiers lob over cover. Move out of the marked blast zone.</span><p>Touch: use the on-screen controls.</p>`;
    surface.setAttribute('aria-label', `Blastline playfield. ${move} move, ${jump} jump, ${fire} fire, ${aim} aim, ${grenade} grenade, ${swap} switch operator. P pauses or resumes.`);
  }
  reflectBindings();
  const theme = createThemeChoices({ names: appearanceNames, signal, modes: themes, value: defaultTheme(themes), onChange: appearance });
  const menu = createGameMenu<Intent, Screen>(root, surface, $('.blast-stage'), {
    id: 'blast', title: 'Blastline', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer, :scope > .blast-route'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'),
    game: results.element, theme: theme.element,
    preferences: keyboard, controls: help,
    actions: [menuActions.start,
      menuActions.resume,
      { id: 'continue', label: 'Continue', screens: ['interlude'], primary: true },
      { ...menuActions.restart, screens: [...menuActions.restart.screens, 'interlude'] },
      { ...menuActions.quit, screens: [...menuActions.quit.screens, 'interlude'] }],
  });

  const controls = Object.fromEntries((['left', 'right', 'up', 'down', 'jump', 'fire', 'grenade', 'switch'] as const).map(c => [c, $<HTMLButtonElement>(`[data-control="${c}"]`)])) as Record<Control, HTMLButtonElement>;
  const directions = createDirectionPad<Control>($('.blast-directions'), { up: 'up', down: 'down', left: 'left', right: 'right' });
  let screen: Screen = 'title', notice = '', detail = '', noticeUntil = 0;
  function write(selector: string, value: string) { const el = $(selector); if (el.textContent !== value) el.textContent = value; }
  return { controls, directions,
    appearanceStatus(value: Appearance, message: string, preparing = false) { if (preparing) theme.prepare(value); else theme.setValue(value); menu.displayStatus(message); },
    soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    readiness: menu.readiness,
    fullscreen: menu.fullscreen,
    reset() { notice = ''; detail = ''; noticeUntil = 0; },
    consume(events: readonly BlastEvent[], run: Run) {
      const event = ['death', 'rescue', 'alarm', 'relay', 'checkpoint', 'redeploy', 'switch'].map(type => events.find(e => e.type === type)).find(Boolean);
      if (!event) return;
      const remaining = run.relays.filter(r => r.health > 0).length;
      [notice, detail] = event.type === 'rescue' ? ['BOLT IS BACK.', 'DEMOLITION ONLINE / HEALTH + GRENADES REFILLED']
        : event.type === 'alarm' ? ['EXTRACTION UNLOCKED.', 'AIR DEFENSE OFFLINE / 70 SECONDS TO REACH THE HELICOPTER →']
        : event.type === 'relay' ? ['AIR DEFENSE CUT.', `+500 POINTS / HEALTH + AMMO RESTORED / ${remaining ? `${remaining} RELAY${remaining === 1 ? '' : 'S'} LEFT` : 'ALL RELAYS OFFLINE'}`]
        : event.type === 'death' ? [event.cause === 'blast' ? 'LETHAL BLAST. LIFE LOST.' : 'LIFE LOST.', `${run.lives} LIVES LEFT / ${run.lives ? 'REDEPLOYING AT LAST SUPPLY POST' : 'OPERATION ENDED'}`]
        : event.type === 'checkpoint' ? ['SUPPLY POST SAVED.', 'FULL HEALTH + GRENADES / PROGRESS KEPT IF YOU FALL']
        : event.type === 'redeploy' ? ['BACK IN ACTION.', `HEALTH RESTORED / ${run.grenades} GRENADES / BRIEF SPAWN PROTECTION`]
        : [operators[run.player.operator].name.toUpperCase(), `${operators[run.player.operator].role} ONLINE`];
      noticeUntil = run.elapsed + (event.type === 'rescue' ? 5 : 2.8);
    },
    show(next: Screen, focus = true) {
      screen = next;
      results.element.hidden = !['paused', 'interlude', 'victory', 'defeat'].includes(next);
      menu.description.textContent = next === 'title' ? 'Air-defense relays keep your helicopter locked out. Destroy them for health and ammo, rescue Bolt and reach extraction. Losing all health costs one life; hostile explosions are lethal.' : next === 'paused' ? '' : next === 'interlude' ? 'Bolt is free. The border is behind you. The foundry is still running. Time to fix that.' : next === 'victory' ? 'Both operators extracted.' : 'Restart to restore terrain and supplies.';

      for (const b of Object.values(controls)) b.disabled = next !== 'playing';
      menu.show(next, focus);
    },
    update(run: Run) {
      const p = run.player, op = operators[p.operator];
      write('.blast-operator', op.name.toUpperCase()); write('.blast-weapon', `${op.role} / ${p.operator === 'nova' ? 'AUTO RIFLE' : 'ROCKET LAUNCHER'}`);
      write('.blast-health-value', `${p.health}/${body.health}`);
      setAttribute($('.blast-health'), 'aria-valuenow', String(p.health));
      setAttribute($('.blast-health-group'), 'data-critical', String(p.health <= 2));
      [...$('.blast-health').children].forEach((cell, i) => cell.classList.toggle('filled', i < p.health));
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
