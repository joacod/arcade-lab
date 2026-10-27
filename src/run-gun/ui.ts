import { operators } from './content.ts';
import { objectiveText, readyToExtract } from './game.ts';
import type { Run, BlastEvent } from './state.ts';
import type { Control } from './input.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'interlude' | 'victory' | 'defeat';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'continue' | 'quit' | 'fullscreen';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void) {
  root.innerHTML = `<header class="blast-hud"><div class="blast-identity"><span class="blast-emblem" aria-hidden="true">↗</span><div><b class="blast-operator">NOVA</b><small class="blast-weapon">ASSAULT / AUTO RIFLE</small><span class="blast-health" aria-label="Health">▰ ▰ ▰ ▰ ▰</span></div></div><div class="blast-orders"><small class="blast-mission">01 / BORDER STATION</small><output class="blast-objective" aria-label="Mission objective"></output></div><div class="blast-resources"><span><b class="blast-lives">5</b> LIVES</span><span><b class="blast-grenades">4</b> GRENADES</span></div><button data-intent="pause" aria-label="Pause">Ⅱ</button></header>
  <main class="blast-stage"><div class="blast-topline"><span>ROGUE MACHINE TERRITORY</span><span class="blast-sector">SECTOR 01 / BORDER STATION</span></div><div class="blast-banner" role="status" hidden><b></b><span></span></div>
  <div class="blast-menu-layer"><section class="blast-menu" aria-labelledby="blast-heading"><p class="blast-eyebrow"><span>ARCADE LAB / 006</span>　 ACTION REPORT: LIVE</p><h1 id="blast-heading">BLAST<span>LINE<span class="blast-dot">.</span></span></h1><p class="blast-tagline">MAKE AN ENTRANCE.<br>LEAVE NOTHING STANDING.</p><p class="blast-description">Two operators. One very bad day for the machines.<br>Break their defenses, bring your ally home, and catch the last ride out.</p><div class="blast-mission-cards"><div><small>01 / INFILTRATE</small><b>Border Station</b><span>RESCUE BOLT · CUT THE POWER</span></div><div><small>02 / DEMOLISH</small><b>Foundry Run</b><span>BREAK THE BASTION · GET OUT</span></div></div><output class="blast-results" aria-label="Operation results" hidden></output><div class="blast-actions"><button class="blast-primary" data-intent="start">Start operation <span>→</span></button><button class="blast-primary" data-intent="resume" hidden>Resume operation →</button><button class="blast-primary" data-intent="continue" hidden>Enter Foundry Run →</button><button data-intent="restart" hidden>Restart operation</button><button data-intent="quit">Game selection</button></div><p class="blast-instructions"><b>A D / ← →</b> MOVE　 <b>SPACE</b> JUMP　 <b>J</b> HOLD TO FIRE<br><b>W S / ↑ ↓</b> AIM　 <b>K</b> GRENADE　 <b>Q</b> SWITCH AFTER RESCUE<br><span>Move + aim for diagonals. Release jump for a short hop.<br>Hit red barrels. Shoot glowing relays. Green flags resupply.<br>Five lives. Checkpoints keep your progress. Get to the extraction pad.</span></p><div class="blast-settings"><button class="blast-mute" aria-pressed="false">Mute sound</button><button data-intent="fullscreen">Fullscreen</button><span>ORIGINAL PIXEL ACTION / 3–5 MIN</span></div><p class="blast-sound-status" role="status" hidden></p><p class="blast-display-status" role="status" hidden></p></section><div class="blast-title-stamp" aria-hidden="true"><span>NO QUIET<br>EXITS.</span><small>BLASTLINE / FIELD OPERATIONS</small><b>✦</b></div></div></main>
  <div class="blast-route" aria-label="Mission route"><div class="blast-progress"></div><span class="blast-route-label">INSERTION</span><span>EXTRACTION →</span></div>
  <footer class="blast-footer"><div class="blast-hint">A D <span>MOVE</span>　SPACE <span>JUMP</span>　J <span>FIRE</span>　W S <span>AIM</span>　K <span>GRENADE</span>　Q <span>SWITCH</span>　ESC <span>PAUSE</span></div><div class="blast-touch"><div class="blast-directions"><button data-control="up" aria-label="Aim up">↑</button><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button><button data-control="down" aria-label="Aim down">↓</button></div><button class="blast-swap" data-control="switch" aria-label="Switch operator">Q<small>SWITCH</small></button><div class="blast-triggers"><button data-control="grenade" aria-label="Throw grenade">K<small>GRENADE</small></button><button data-control="jump" aria-label="Jump">↟<small>JUMP</small></button><button data-control="fire" aria-label="Fire">J<small>FIRE</small></button></div></div></footer>`;
  root.querySelector('.blast-stage')!.prepend(surface);
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const controls = Object.fromEntries((['left', 'right', 'up', 'down', 'jump', 'fire', 'grenade', 'switch'] as const).map(c => [c, $<HTMLButtonElement>(`[data-control="${c}"]`)])) as Record<Control, HTMLButtonElement>;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-intent]')];
  for (const b of buttons) b.addEventListener('click', () => act(b.dataset.intent as Intent), { signal });
  let muted = false, screen: Screen = 'title', notice = '', detail = '', noticeUntil = 0;
  $('.blast-mute').addEventListener('click', () => { muted = !muted; $('.blast-mute').setAttribute('aria-pressed', String(muted)); $('.blast-mute').textContent = muted ? 'Unmute sound' : 'Mute sound'; mute(muted); }, { signal });
  function status(selector: string, value: string) { const el = $(selector); el.textContent = value; el.hidden = !value; }
  function write(selector: string, value: string) { const el = $(selector); if (el.textContent !== value) el.textContent = value; }
  return { controls,
    soundStatus(value: string) { status('.blast-sound-status', value); }, displayStatus(value: string) { status('.blast-display-status', value); },
    fullscreen(available: boolean, active: boolean) { const b = $<HTMLButtonElement>('[data-intent="fullscreen"]'); b.hidden = !available; b.textContent = active ? 'Exit fullscreen' : 'Fullscreen'; },
    reset() { notice = ''; noticeUntil = 0; },
    consume(events: readonly BlastEvent[], run: Run) {
      const event = events.find(e => ['rescue', 'alarm', 'death', 'checkpoint', 'switch'].includes(e.type));
      if (!event) return;
      [notice, detail] = event.type === 'rescue' ? ['BOLT IS BACK.', 'DEMOLITION ONLINE / Q TO SWITCH / SUPPLIES REFILLED'] : event.type === 'alarm' ? ['TIME TO LEAVE.', 'POWER OFFLINE / 70 SECONDS TO EXTRACT →'] : event.type === 'death' ? ['KEEP THE LINE.', `${run.lives} LIVES / REDEPLOYING AT LAST SUPPLY POST`] : event.type === 'checkpoint' ? ['LOCKED & LOADED.', 'CHECKPOINT SAVED / HEALTH + GRENADES REFILLED'] : [operators[run.player.operator].name.toUpperCase(), `${operators[run.player.operator].role} ONLINE`];
      noticeUntil = run.elapsed + (event.type === 'rescue' ? 5 : 2.8);
    },
    show(next: Screen, focus = true) {
      screen = next; root.dataset.screen = next;
      $('.blast-menu-layer').hidden = next === 'playing'; $('.blast-mission-cards').hidden = next !== 'title'; $('.blast-title-stamp').hidden = next !== 'title';
      $('.blast-results').hidden = !['interlude', 'victory', 'defeat'].includes(next);
      $('.blast-tagline').hidden = next !== 'title';
      $('h1').innerHTML = next === 'title' ? 'BLAST<span>LINE<span class="blast-dot">.</span></span>' : next === 'paused' ? 'HOLD<span>FIRE.</span>' : next === 'interlude' ? 'BORDER<span>BROKEN.</span>' : next === 'victory' ? 'JOB<span>DONE.</span>' : 'LINE<span>DOWN.</span>';
      $('.blast-description').textContent = next === 'title' ? 'Two operators. One very bad day for the machines. Break their defenses, bring your ally home, and catch the last ride out.' : next === 'paused' ? 'Take a breath. Your operation is on hold.' : next === 'interlude' ? 'Bolt is free. The border is behind you. The foundry is still running. Time to fix that.' : next === 'victory' ? 'Two operators extracted. One machine empire having a very bad day. Nice work out there.' : 'The machines held this time. Fresh terrain. Full supplies. Another way through.';
      for (const b of buttons) {
        const i = b.dataset.intent;
        if (i === 'fullscreen') continue;
        b.hidden = i === 'pause' ? next !== 'playing' : i === 'start' ? next !== 'title' : i === 'resume' ? next !== 'paused' : i === 'continue' ? next !== 'interlude' : i === 'restart' ? next === 'title' || next === 'playing' : next === 'playing';
      }
      for (const b of Object.values(controls)) b.disabled = next !== 'playing';
      surface.tabIndex = next === 'playing' ? 0 : -1; surface.setAttribute('aria-hidden', String(next !== 'playing'));
      if (focus) { if (next === 'playing') surface.focus({ preventScroll: true }); else buttons.find(b => !b.hidden)?.focus({ preventScroll: true }); }
    },
    update(run: Run) {
      const p = run.player, op = operators[p.operator];
      write('.blast-operator', op.name.toUpperCase()); write('.blast-weapon', `${op.role} / ${p.operator === 'nova' ? 'AUTO RIFLE' : 'ROCKET LAUNCHER'}`);
      write('.blast-health', Array.from({ length: 5 }, (_, i) => i < p.health ? '▰' : '▱').join(' ')); $('.blast-health').setAttribute('aria-label', `Health ${p.health} of 5`);
      write('.blast-lives', String(run.lives)); write('.blast-grenades', String(run.grenades));
      write('.blast-mission', `0${run.missionIndex + 1} / ${run.mission.name.toUpperCase()}`); write('.blast-objective', objectiveText(run));
      write('.blast-sector', `SECTOR 0${run.missionIndex + 1} / ${run.mission.name.toUpperCase()}`);
      $('.blast-progress').style.width = `${Math.min(100, run.player.x / run.mission.exit.x * 100)}%`;
      controls.switch.disabled = screen !== 'playing' || !run.rescued;
      const banner = $('.blast-banner');
      banner.hidden = screen !== 'playing' || run.elapsed > noticeUntil && run.extraction === 0 || !notice && run.extraction === 0;
      write('.blast-banner b', run.extraction > 0 ? 'CATCH YOUR BREATH.' : notice);
      write('.blast-banner span', run.extraction > 0 ? 'EXTRACTION CONFIRMED / STAND CLEAR' : detail);
      $('.blast-objective').classList.toggle('blast-urgent', readyToExtract(run));
      write('.blast-results', `${run.status === 'victory' ? 'OPERATION COMPLETE' : run.status === 'defeat' ? run.collapse === 0 ? 'FACILITY COLLAPSED' : 'NO LIVES REMAINING' : 'BORDER STATION COMPLETE'}\n${String(run.score).padStart(6, '0')} POINTS　/　${Math.floor(run.elapsed / 60)}:${String(Math.floor(run.elapsed % 60)).padStart(2, '0')}\n${run.destroyed} TILES BROKEN　/　${run.kills} MACHINES DOWN　/　${run.lives} LIVES`);
    },
  };
}
