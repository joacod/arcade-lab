import { fighters, type FighterId } from './content.ts';
import type { Match } from './game.ts';
import type { Control } from './input.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'quit' | 'fullscreen';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, select: (id: FighterId) => void, mute: (muted: boolean) => void) {
  root.innerHTML = `<header class="duel-hud"><div class="duel-health duel-player"><div><b class="duel-player-name">NERA</b><small>YOU <span class="duel-player-wins">◇ ◇</span></small></div><meter aria-label="Your health" min="0" max="100" value="100"></meter><span class="duel-player-special">STORMGLASS READY</span></div><div class="duel-clock"><small>BEST OF THREE</small><output aria-label="Round timer">75</output><span class="duel-round">ROUND 01</span></div><div class="duel-health duel-enemy"><div><b class="duel-enemy-name">KAEL</b><small><span class="duel-enemy-wins">◇ ◇</span> CPU</small></div><meter aria-label="Opponent health" min="0" max="100" value="100"></meter><span class="duel-enemy-special">RIFTBREAKER READY</span></div><button class="duel-pause" data-intent="pause" aria-label="Pause">Ⅱ</button></header>
  <main class="duel-stage"><div class="duel-arena-label">THE TEMPEST CITADEL <span>·</span> OBSIDIAN DUEL</div><div class="duel-announcement" aria-live="polite"><strong></strong><span></span></div>
  <div class="duel-menu-layer"><section class="duel-menu" aria-labelledby="duel-heading"><p class="duel-eyebrow">ARCADE LAB / 005　 •　 THE CITADEL AWAITS</p><h1 id="duel-heading">OBSIDIAN<br><em>DUEL</em><span>雨</span></h1><p class="duel-description">Two warriors. One eye of the storm.<br>Read the stance. Find the opening.</p><div class="duel-roster" role="group" aria-label="Choose your fighter"><button data-fighter="nera" aria-pressed="true"><span>01 / NERA</span><b>Stormweaver</b><small>FAST PALMS · ENERGY BOLT</small></button><button data-fighter="kael" aria-pressed="false"><span>02 / KAEL</span><b>Citadel Fist</b><small>HEAVY BLOWS · ADVANCING STRIKE</small></button></div><output class="duel-results" aria-label="Match results" hidden></output><div class="duel-actions"><button class="duel-primary" data-intent="start">Enter the duel <span>→</span></button><button class="duel-primary" data-intent="resume" hidden>Resume duel →</button><button class="duel-primary" data-intent="restart" hidden>Rematch →</button><button data-intent="quit">Game selection</button></div><p class="duel-instructions"><b>A D / ← →</b> move　 <b>W / ↑</b> jump　 <b>S / ↓</b> crouch<br><b>J</b> light　 <b>K</b> heavy　 <b>L</b> special　 <b>SHIFT</b> guard<br>Crouch + J sweeps. Jump + J kicks overhead.<br>Stand guard for overheads. Crouch guard for sweeps.<br><span>Let a heavy miss. Step in while they recover.</span></p><div class="duel-settings"><button class="duel-mute" aria-pressed="false">Mute sound</button><button data-intent="fullscreen">Fullscreen</button></div><p class="duel-sound-status" role="status" hidden></p><p class="duel-display-status" role="status" hidden></p></section></div></main>
  <footer class="duel-footer"><div class="duel-hint">A D <span>MOVE</span>　W <span>JUMP</span>　S <span>CROUCH</span>　J <span>LIGHT</span>　K <span>HEAVY</span>　L <span>SPECIAL</span>　SHIFT <span>GUARD</span>　ESC <span>PAUSE</span></div><div class="duel-touch"><div class="duel-pad"><button data-control="jump" aria-label="Jump">↑</button><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button><button data-control="crouch" aria-label="Crouch">↓</button></div><div class="duel-strikes"><button data-control="block" aria-label="Block">◇<small>GUARD</small></button><button data-control="special" aria-label="Special attack">L<small>SPECIAL</small></button><button data-control="heavy" aria-label="Heavy attack">K<small>HEAVY</small></button><button data-control="light" aria-label="Light attack">J<small>LIGHT</small></button></div></div></footer>`;
  root.querySelector('.duel-stage')!.prepend(surface);
  const controls = Object.fromEntries((['left', 'right', 'jump', 'crouch', 'light', 'heavy', 'special', 'block'] as const).map(k => [k, root.querySelector<HTMLButtonElement>(`[data-control="${k}"]`)!])) as Record<Control, HTMLButtonElement>;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-intent]')];
  const roster = [...root.querySelectorAll<HTMLButtonElement>('[data-fighter]')];
  for (const button of buttons) button.addEventListener('click', () => act(button.dataset.intent as Intent), { signal });
  for (const button of roster) button.addEventListener('click', () => {
    for (const b of roster) b.setAttribute('aria-pressed', String(b === button)); select(button.dataset.fighter as FighterId);
  }, { signal });
  const muteButton = root.querySelector<HTMLButtonElement>('.duel-mute')!; let muted = false;
  muteButton.addEventListener('click', () => { muted = !muted; muteButton.setAttribute('aria-pressed', String(muted)); muteButton.textContent = muted ? 'Unmute sound' : 'Mute sound'; mute(muted); }, { signal });
  function status(selector: string, message: string) { const e = root.querySelector<HTMLElement>(selector)!; e.textContent = message; e.hidden = !message; }
  let current: Screen = 'title';
  return { controls,
    soundStatus(message: string) { status('.duel-sound-status', message); }, displayStatus(message: string) { status('.duel-display-status', message); },
    fullscreen(available: boolean, active: boolean) { const b = root.querySelector<HTMLButtonElement>('[data-intent="fullscreen"]')!; b.hidden = !available; b.textContent = active ? 'Exit fullscreen' : 'Fullscreen'; },
    show(screen: Screen, focus = true) {
      current = screen; root.dataset.screen = screen;
      root.querySelector<HTMLElement>('.duel-menu-layer')!.hidden = screen === 'playing';
      root.querySelector<HTMLElement>('.duel-roster')!.hidden = screen !== 'title';
      root.querySelector<HTMLElement>('.duel-results')!.hidden = screen !== 'victory' && screen !== 'defeat';
      root.querySelector('h1')!.innerHTML = screen === 'title' ? 'OBSIDIAN<br><em>DUEL</em><span>雨</span>' : screen === 'paused' ? 'STILL<br><em>THE STORM.</em>' : screen === 'victory' ? 'THE STORM<br><em>IS YOURS.</em>' : 'FALL.<br><em>RISE AGAIN.</em>';
      root.querySelector('.duel-description')!.textContent = screen === 'title' ? 'Two warriors. One eye of the storm. Read the stance. Find the opening.' : screen === 'paused' ? 'Take a breath. The citadel can wait. Resume when you are ready.' : screen === 'victory' ? 'The citadel remembers your name. Beyond its gates, the storm bows.' : 'Every defeat reveals an opening. Return to the ring and change the rhythm.';
      for (const b of buttons) {
        const i = b.dataset.intent;
        if (i === 'fullscreen') continue;
        b.hidden = i === 'pause' ? screen !== 'playing' : i === 'start' ? screen !== 'title' : i === 'resume' ? screen !== 'paused' : i === 'restart' ? screen === 'playing' || screen === 'title' : screen === 'playing';
      }
      for (const b of Object.values(controls)) b.disabled = screen !== 'playing';
      surface.tabIndex = screen === 'playing' ? 0 : -1; surface.setAttribute('aria-hidden', String(screen !== 'playing'));
      if (focus) { if (screen === 'playing') surface.focus({ preventScroll: true }); else buttons.find(b => !b.hidden)?.focus({ preventScroll: true }); }
    },
    update(m: Match) {
      for (const [i, label] of ['player', 'enemy'].entries()) {
        const f = m.fighters[i]!, d = fighters[f.kind];
        root.querySelector(`.duel-${label}-name`)!.textContent = d.name.toUpperCase();
        root.querySelector(`.duel-${label}-wins`)!.textContent = [0, 1].map(w => m.wins[i]! > w ? '◆' : '◇').join(' ');
        root.querySelector(`.duel-${label}-special`)!.textContent = `${d.attacks.special.name.toUpperCase()} ${f.specialCooldown > 0 ? f.specialCooldown.toFixed(1) + 's' : 'READY'}`;
        root.querySelector<HTMLMeterElement>(i === 0 ? '[aria-label="Your health"]' : '[aria-label="Opponent health"]')!.value = f.health;
      }
      root.querySelector('[aria-label="Round timer"]')!.textContent = String(Math.ceil(m.timer)).padStart(2, '0');
      root.querySelector('.duel-round')!.textContent = `ROUND ${String(m.round).padStart(2, '0')}`;
      const banner = root.querySelector<HTMLElement>('.duel-announcement')!;
      banner.hidden = current !== 'playing' || m.phase === 'fight' && m.timer < 74.3;
      const title = m.phase === 'intro' ? `ROUND ${m.round}` : m.phase === 'roundEnd' ? m.reason === 'draw' ? 'DRAW' : m.reason === 'timeout' ? 'TIME UP' : 'K.O.' : 'FIGHT';
      const sub = m.phase === 'intro' ? `${Math.ceil(m.phaseTime)}　/　PREPARE` : m.phase === 'roundEnd' ? m.winner === null ? 'EVENLY MATCHED · DUEL AGAIN' : `${fighters[m.fighters[m.winner]!.kind].name.toUpperCase()} TAKES THE ROUND` : 'THE TEMPEST CITADEL';
      // Keep the live region quiet unless the announcement actually changes.
      if (banner.querySelector('strong')!.textContent !== title) banner.querySelector('strong')!.textContent = title;
      if (banner.querySelector('span')!.textContent !== sub) banner.querySelector('span')!.textContent = sub;
      root.querySelector('.duel-results')!.textContent = `${fighters[m.fighters[0].kind].name.toUpperCase()}　${m.wins[0]} : ${m.wins[1]}　${fighters[m.fighters[1].kind].name.toUpperCase()}\n${m.status === 'victory' ? 'CITADEL CHAMPION' : 'THE CHALLENGE CONTINUES'}`;
    },
  };
}
