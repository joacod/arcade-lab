import { initialTheme, createThemeChoices } from '../../common/ui/theme-choices.ts';
import { themes, appearanceNames, type Appearance } from './themes.ts';
import { createElementLookup, setText, setProperty } from '../../common/ui/dom.ts';
import { createMenuReadout } from '../../common/ui/menu-components.ts';
import { createGameMenu } from '../../common/ui/menu.ts';
import { fighters, type FighterId } from './content.ts';
import type { Match } from './game.ts';
import { initialLayout, layouts, type Layout, type Control } from './input.ts';
import { bindingLabel } from '../../engine/bindings.ts';
import { createKeyboardChoices } from '../../common/ui/keyboard-choices.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'quit' | 'fullscreen' | 'title';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, select: (id: FighterId) => void, mute: (muted: boolean) => void, appearance: (id: Appearance) => void, onLayout: (value: Layout) => void) {
  root.innerHTML = `<header class="duel-hud"><div class="duel-health duel-player"><div><b class="duel-player-name">NERA</b><small>YOU <span class="duel-player-wins">◇ ◇</span></small></div><meter aria-label="Your health" min="0" max="100" value="100"></meter><span class="duel-player-special">STORMGLASS READY</span></div><div class="duel-clock"><small>BEST OF THREE</small><output aria-label="Round timer">75</output><span class="duel-round">ROUND 01</span></div><div class="duel-health duel-enemy"><div><b class="duel-enemy-name">KAEL</b><small><span class="duel-enemy-wins">◇ ◇</span> CPU</small></div><meter aria-label="Opponent health" min="0" max="100" value="100"></meter><span class="duel-enemy-special">RIFTBREAKER READY</span></div><button class="duel-pause" data-intent="pause" aria-label="Pause">Pause</button></header>
  <main class="duel-stage"><div class="duel-arena-label">THE TEMPEST CITADEL <span>·</span> OBSIDIAN DUEL</div><div class="duel-announcement" aria-live="polite"><strong></strong><span></span></div>
  </main>
  <footer class="duel-footer"><div class="duel-hint"></div><div class="duel-touch"><div class="duel-pad"><button data-control="jump" aria-label="Jump">↑</button><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button><button data-control="crouch" aria-label="Crouch">↓</button></div><div class="duel-strikes"><button data-control="block" aria-label="Block">◇<small>GUARD</small></button><button data-control="special" aria-label="Special attack"><span data-key="special"></span><small>SPECIAL</small></button><button data-control="heavy" aria-label="Heavy attack"><span data-key="heavy"></span><small>HEAVY</small></button><button data-control="light" aria-label="Light attack"><span data-key="light"></span><small>LIGHT</small></button></div></div></footer>`;
  const $ = createElementLookup(root);
  $('.duel-stage').prepend(surface);
  const pause = $<HTMLButtonElement>('[data-intent="pause"]');
  pause.addEventListener('click', () => act('pause'), { signal });
  const results = createMenuReadout('Match results');
  let layout: Layout = initialLayout;
  const help = document.createElement('div');
  const keyboard = createKeyboardChoices({ id: 'duel', choices: layouts, value: layout, signal, onChange(value) {
    layout = value; onLayout(layout); reflectBindings();
  } });
  const gameContent = document.createElement('div');
  gameContent.innerHTML = `<div class="duel-roster" role="group" aria-label="Choose your fighter"><button data-fighter="nera" aria-pressed="true"><b>Nera</b><small>Fast palms · Energy bolt</small></button><button data-fighter="kael" aria-pressed="false"><b>Kael</b><small>Heavy blows · Advancing strike</small></button></div>`;
  gameContent.append(keyboard, results.element);
  function reflectBindings() {
    const { bindings } = layouts[layout];
    const move = `${bindingLabel(bindings.left)} / ${bindingLabel(bindings.right)}`;
    const jump = bindingLabel(bindings.jump), crouch = bindingLabel(bindings.crouch);
    const light = bindingLabel(bindings.light), heavy = bindingLabel(bindings.heavy), special = bindingLabel(bindings.special);
    const guard = bindingLabel(bindings.block);
    $('.duel-hint').innerHTML = `${move} <span>MOVE</span>　${jump.toUpperCase()} <span>JUMP</span>　${crouch} <span>CROUCH</span>　${light} <span>LIGHT</span>　${heavy} <span>HEAVY</span>　${special} <span>SPECIAL</span>　SHIFT <span>GUARD</span>　P <span>PAUSE / RESUME</span>`;
    for (const action of ['light', 'heavy', 'special'] as const) setText($(`[data-key="${action}"]`), bindingLabel(bindings[action]));
    help.innerHTML = `<b>${move}</b> move　 <b>${jump}</b> jump　 <b>${crouch}</b> crouch<br><b>${light}</b> light　 <b>${heavy}</b> heavy　 <b>${special}</b> special　 <b>${guard}</b> guard<br>Crouch + ${light} sweeps. Jump + ${light} / ${heavy} attacks overhead.<br>Hold a direction at takeoff to jump forward or back. Attacks keep the jump arc.<br>Jump over to switch sides. Strike after crossing to turn back toward your opponent.<br>Stand guard for overheads. Crouch guard for sweeps.<br><span>Let a heavy miss. Step in when RECOVERING appears.</span><p>Touch: use the on-screen controls.</p>`;
    surface.setAttribute('aria-label', `Obsidian Duel playfield. ${move} move, ${jump} jump, ${crouch} crouch, ${light} light, ${heavy} heavy, ${special} special, ${guard} guard. P pauses or resumes.`);
  }
  reflectBindings();
  const theme = createThemeChoices({ names: appearanceNames, signal, modes: themes, value: initialTheme, onChange: appearance });
  const menu = createGameMenu<Intent, Screen>(root, surface, $('.duel-stage'), {
    id: 'duel', title: 'Obsidian Duel', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'),
    game: gameContent, theme: theme.element, cycleTheme: theme.cycle,
    controls: help,
    actions: [{ id: 'start', label: 'Play', screens: ['title'], primary: true },
      { id: 'resume', label: 'Resume', screens: ['paused'], primary: true },
      { id: 'restart', label: 'Restart', screens: ['paused', 'victory', 'defeat'], primary: true },
      { id: 'title', requiresReady: false, label: 'Game setup', screens: ['paused', 'victory', 'defeat'] },
      { id: 'quit', requiresReady: false, label: 'Game selection', screens: ['title', 'paused', 'victory', 'defeat'] }],
  });

  const controls = Object.fromEntries((['left', 'right', 'jump', 'crouch', 'light', 'heavy', 'special', 'block'] as const).map(k => [k, $<HTMLButtonElement>(`[data-control="${k}"]`)])) as Record<Control, HTMLButtonElement>;
  const roster = [...root.querySelectorAll<HTMLButtonElement>('[data-fighter]')];
  for (const button of roster) button.addEventListener('click', () => {
    for (const b of roster) b.setAttribute('aria-pressed', String(b === button)); select(button.dataset.fighter as FighterId);
  }, { signal });
  let current: Screen = 'title', activeAppearance: Appearance = 'normal';
  return { controls,
    appearanceStatus(id: Appearance, message: string, preparing = false) {
      if (preparing) theme.prepare(id); else theme.setValue(id);menu.displayStatus(message);
      if(!message && !preparing){
        activeAppearance=id;
        setText($('.duel-arena-label'), `${appearanceNames[id].toUpperCase()} · OBSIDIAN DUEL`);
        root.dataset.theme=id;
      }
    },
    soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    readiness: menu.readiness,
    fullscreen: menu.fullscreen,
    show(screen: Screen, focus = true) {
      current = screen;
      keyboard.hidden = screen !== 'title' && screen !== 'paused';
      $<HTMLElement>('.duel-roster').hidden = screen !== 'title';
      results.element.hidden = !['paused', 'victory', 'defeat'].includes(screen);
      menu.heading.textContent = screen === 'title' ? 'Obsidian Duel' : screen === 'paused' ? 'Paused' : screen === 'victory' ? 'Victory' : screen === 'defeat' ? 'Defeat' : 'Stage complete';
      menu.description.textContent = screen === 'title' ? 'Win two rounds against the CPU. Choose your fighter.' : '';

      for (const b of Object.values(controls)) b.disabled = screen !== 'playing';
      menu.show(screen, focus);
    },
    update(m: Match) {
      for (const [i, label] of ['player', 'enemy'].entries()) {
        const f = m.fighters[i]!, d = fighters[f.kind];
        setText($(`.duel-${label}-name`), d.name.toUpperCase());
        setText($(`.duel-${label}-wins`), [0, 1].map(w => m.wins[i]! > w ? '◆' : '◇').join(' '));
        setText($(`.duel-${label}-special`), `${d.attacks.special.name.toUpperCase()} ${f.specialCooldown > 0 ? f.specialCooldown.toFixed(1) + 's' : 'READY'}`);
        setProperty($<HTMLMeterElement>(i === 0 ? '[aria-label="Your health"]' : '[aria-label="Opponent health"]'), 'value', f.health);
      }
      setText($('[aria-label="Round timer"]'), String(Math.ceil(m.timer)).padStart(2, '0'));
      setText($('.duel-round'), `ROUND ${String(m.round).padStart(2, '0')}`);
      const banner = $<HTMLElement>('.duel-announcement');
      setProperty(banner, 'hidden', current !== 'playing' || m.phase === 'fight' && m.timer < 74.3);
      const title = m.phase === 'intro' ? `ROUND ${m.round}` : m.phase === 'roundEnd' ? m.reason === 'draw' ? 'DRAW' : m.reason === 'timeout' ? 'TIME UP' : 'K.O.' : 'FIGHT';
      const sub = m.phase === 'intro' ? `${Math.ceil(m.phaseTime)}　/　PREPARE` : m.phase === 'roundEnd' ? m.winner === null ? 'EVENLY MATCHED · DUEL AGAIN' : `${fighters[m.fighters[m.winner]!.kind].name.toUpperCase()} TAKES THE ROUND` : appearanceNames[activeAppearance].toUpperCase();
      // Keep the live region quiet unless the announcement actually changes.
      setText($('.duel-announcement strong'), title);
      setText($('.duel-announcement span'), sub);
      results.update(`${fighters[m.fighters[0].kind].name.toUpperCase()}　${m.wins[0]} : ${m.wins[1]}　${fighters[m.fighters[1].kind].name.toUpperCase()}`);
    },
  };
}
