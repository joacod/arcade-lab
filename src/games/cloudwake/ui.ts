import { createElementLookup, setText, setProperty } from '../../common/ui/dom.ts';
import { createMenuReadout } from '../../common/ui/menu-components.ts';
import { createGameMenu, menuActions, type CommonMenuIntent } from '../../common/ui/menu.ts';
import { createThemeChoices } from '../../common/ui/theme-choices.ts';
import { flight, multiplierAt } from './content.ts';
import { legAt } from './route.ts';
import type { Run } from './game.ts';

export type Screen = 'title' | 'playing' | 'paused' | 'crashed' | 'defeat';
export type Intent = CommonMenuIntent | 'continue';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void) {
  root.innerHTML = `<header class="cloudwake-hud"><div class="cloudwake-brand">CLOUDWAKE<span>SKY COURIER / ENDLESS FLIGHT</span></div>
    <div><small>LIVES</small><output aria-label="Lives">3</output></div><div class="cloudwake-score"><small>SCORE</small><output aria-label="Score">0</output></div><button data-intent="pause">Pause</button></header>
    <main class="cloudwake-stage"><div class="cloudwake-flight-status"><span class="cloudwake-leg"></span><div class="cloudwake-shield"><span class="cloudwake-shield-label"></span><progress aria-label="Light shield" max="1" value="0"></progress></div></div></main><footer class="cloudwake-footer"><div class="cloudwake-readout"><output aria-label="Distance">0 m</output><span class="cloudwake-fragments">0 fragments</span></div><p class="cloudwake-hint">HOLD TO RISE <span>·</span> A D OR DRAG TO SLIDE</p><div class="cloudwake-touch"><button data-control="left" aria-label="Slide left">←</button><button data-control="right" aria-label="Slide right">→</button><button data-control="thrust" aria-label="Hold to rise">↑ <span>HOLD TO RISE</span></button></div></footer>`;
  const $ = createElementLookup(root), stage = $('.cloudwake-stage');
  stage.prepend(surface);
  const pause = $<HTMLButtonElement>('[data-intent="pause"]');
  pause.addEventListener('click', () => act('pause'), { signal });
  const controls = {
    thrust: $<HTMLButtonElement>('[data-control="thrust"]'),
    left: $<HTMLButtonElement>('[data-control="left"]'),
    right: $<HTMLButtonElement>('[data-control="right"]'),
  };
  const results = createMenuReadout('Flight results');
  const themes = createThemeChoices({ modes: { arcade: {} }, names: { arcade: 'The Sunward Route' }, value: 'arcade', signal, onChange() {} });
  themes.setValue('arcade');
  const menu = createGameMenu<Intent, Screen>(root, surface, stage, {
    id: 'cloudwake', title: 'Cloudwake', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer, .cloudwake-flight-status'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'), game: results.element, theme: themes.element,
    controls: `<b>Rise, fall, and slide.</b><p>Hold Space, W, ↑, the playfield, or the on-screen button to rise. Release to fall. A, D, ← and → slide across the view. The route keeps scrolling either way. Drag sideways on the playfield while rising, or use the on-screen arrows. Your first press on Play or Continue also applies thrust.</p><p>Fragments start at +25 points. Every five collected without a miss raises their multiplier, up to ×4, shown with the fragment count. A fragment that slips behind the flight window resets the streak. Touch the gem to collect it.</p><p>Collect ${flight.shieldFragments} fragments to raise a light shield for a few seconds. It saves you from one collision, then breaks immediately, even if time remains. Collect again to raise another. Avoid coral crystals, sweeping storm mines and shifting openings in the ruins. Cloud banks at the edges cushion your flight.</p><p>You have three lives. Winged lanterns light as you pass and save the route. Continue restores the latest lantern, including score, streak and any shield time still running. Lives do not refill. Legs grow longer and more precise, mixing climbs, dives, stair steps and moving openings. Speed rises after the first two legs, then at increasingly spaced leg milestones. Lanterns get farther apart as the route accelerates. The third unshielded crash ends the flight. Restart begins a fresh three-life flight.</p>`,
    actions: [menuActions.start, menuActions.resume, { id: 'continue', label: 'Continue', screens: ['crashed'], primary: true },
      { ...menuActions.restart, screens: ['paused', 'crashed', 'defeat'] }, { ...menuActions.quit, screens: ['title', 'paused', 'crashed', 'defeat'] }],
  });
  return { controls, launchButtons: menu.actions.filter(button => ['start', 'restart', 'continue'].includes(button.dataset.menuAction!)),
    readiness: menu.readiness, fullscreen: menu.fullscreen, soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    show(screen: Screen, focus = true) {
      menu.description.textContent = screen === 'title' ? 'Take the sunward route. Hold to rise, release to fall, and slide across the view. Three lives, with lantern checkpoints in clear air.'
        : screen === 'crashed' ? 'Continue from your latest lantern. Score and fragments return to that point. Hold Continue or press Space to rise as you launch.'
        : screen === 'defeat' ? 'All three lives spent. The sky is still calling. Hold Restart or press Space for another flight.' : '';
      results.element.hidden = screen === 'title';
      for (const button of Object.values(controls)) button.disabled = screen !== 'playing';
      menu.show(screen, focus);
      if (screen === 'crashed') menu.heading.textContent = 'Courier down';
      if (screen === 'defeat') menu.heading.textContent = 'Flight complete';
    },
    update(run: Run) {
      setText($('[aria-label="Score"]'), String(run.score).padStart(5, '0'));
      setText($('[aria-label="Lives"]'), String(run.lives));
      setText($('[aria-label="Distance"]'), `${Math.floor(run.distance / 10)} m`);
      const multiplier = multiplierAt(run.chain);
      setText($('.cloudwake-fragments'), `${run.pickups} fragments · ×${multiplier}`);
      setText($('.cloudwake-leg'), `LEG ${run.checkpoint.number + 1} · ${legAt(run.checkpoint.number).name}`);
      const remain = run.shieldUntil - run.elapsed;
      const live = remain > 0;
      setText($('.cloudwake-shield-label'), live
        ? `SHIELD ${remain.toFixed(1)}s${run.shieldCharge ? ` · ${run.shieldCharge}/${flight.shieldFragments}` : ''}`
        : `SHIELD ${run.shieldCharge}/${flight.shieldFragments}`);
      setProperty($<HTMLProgressElement>('.cloudwake-shield progress'), 'value', live ? remain / flight.shieldSeconds : run.shieldCharge / flight.shieldFragments);
      setProperty($('.cloudwake-shield').dataset, 'live', String(live));
      const checkpoint = run.checkpoint.number === 0 ? 'launch' : `${Math.floor(run.checkpoint.state.distance / 10)} m`;
      setProperty(controls.thrust.dataset, 'thrusting', String(run.thrust));
      const shield = live ? `Shield ${remain.toFixed(1)}s` : `Shield ${run.shieldCharge}/${flight.shieldFragments}`;
      results.update(`${run.score.toLocaleString()} POINTS\n${Math.floor(run.distance / 10)} m reached · ${run.pickups} fragments\n${run.lives} ${run.lives === 1 ? 'life' : 'lives'} left · Checkpoint: ${checkpoint}\nFragment bonus ×${multiplier} · ${shield}`);
    },
  };
}
