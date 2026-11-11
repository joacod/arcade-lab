import { createElementLookup, setText, setProperty } from '../../common/ui/dom.ts';
import { createMenuReadout } from '../../common/ui/menu-components.ts';
import { createGameMenu, menuActions, type CommonMenuIntent } from '../../common/ui/menu.ts';
import { createThemeChoices } from '../../common/ui/theme-choices.ts';
import type { Run } from './game.ts';

export type Screen = 'title' | 'playing' | 'paused' | 'defeat';
export type Intent = CommonMenuIntent;
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void) {
  root.innerHTML = `<header class="cloudwake-hud"><div class="cloudwake-brand">CLOUDWAKE<span>SKY COURIER / ENDLESS FLIGHT</span></div>
    <div class="cloudwake-score"><small>SCORE</small><output aria-label="Score">0</output></div><button data-intent="pause">Pause</button></header>
    <main class="cloudwake-stage"></main><footer class="cloudwake-footer"><div><output aria-label="Distance">0 m</output><span class="cloudwake-fragments">0 fragments</span></div><p class="cloudwake-hint">HOLD TO RISE <span>·</span> RELEASE TO FALL</p><button data-control="thrust" aria-label="Hold to rise">↑ <span>HOLD TO RISE</span></button></footer>`;
  const $ = createElementLookup(root), stage = $('.cloudwake-stage');
  stage.prepend(surface);
  const pause = $<HTMLButtonElement>('[data-intent="pause"]');
  pause.addEventListener('click', () => act('pause'), { signal });
  const thrust = $<HTMLButtonElement>('[data-control="thrust"]');
  const results = createMenuReadout('Flight results');
  const themes = createThemeChoices({ modes: { arcade: {} }, names: { arcade: 'The Sunward Route' }, value: 'arcade', signal, onChange() {} });
  themes.setValue('arcade');
  const menu = createGameMenu<Intent, Screen>(root, surface, stage, {
    id: 'cloudwake', title: 'Cloudwake', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'), game: results.element, theme: themes.element,
    controls: '<b>One button. A whole sky.</b><p>Hold Space, W, ↑, the playfield, or the on-screen button to rise. Release to fall. Your first press on Play also applies thrust.</p><p>Follow turquoise fragments for +25 points each. Avoid coral crystals and floating storm mines. Cloud banks at the edges cushion your flight.</p><p>Distance scores automatically. Fly as far as you can. Space on Play or Restart starts a fresh flight immediately.</p>',
    actions: [menuActions.start, menuActions.resume, { ...menuActions.restart, screens: ['paused', 'defeat'] }, { ...menuActions.quit, screens: ['title', 'paused', 'defeat'] }],
  });
  return { thrust, launchButtons: menu.actions.filter(button => ['start', 'restart'].includes(button.dataset.menuAction!)),
    readiness: menu.readiness, fullscreen: menu.fullscreen, soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    show(screen: Screen, focus = true) {
      menu.description.textContent = screen === 'title' ? 'Take the sunward route. Hold to rise, release to fall. Thread the sky ruins and gather lost light, one flight at a time.'
        : screen === 'defeat' ? 'The sky is still calling. Hold Restart or press Space for another flight.' : '';
      results.element.hidden = screen === 'title';
      thrust.disabled = screen !== 'playing';
      menu.show(screen, focus);
      if (screen === 'defeat') menu.heading.textContent = 'Flight complete';
    },
    update(run: Run) {
      setText($('[aria-label="Score"]'), String(run.score).padStart(5, '0'));
      setText($('[aria-label="Distance"]'), `${Math.floor(run.distance / 10)} m`);
      setText($('.cloudwake-fragments'), `${run.pickups} fragments`);
      setProperty(thrust.dataset, 'thrusting', String(run.thrust));
      results.update(`${run.score.toLocaleString()} POINTS\n${Math.floor(run.distance / 10)} m flown · ${run.pickups} fragments\n${Math.floor(run.elapsed)} seconds aloft`);
    },
  };
}
