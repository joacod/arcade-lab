import { createThemeSelect } from '../../common/ui/theme-select.ts';
import { themes, type Appearance } from './themes.ts';
import { createElementLookup, setText } from '../../common/ui/dom.ts';
import { createMenuReadout } from '../../common/ui/menu-components.ts';
import { createGameMenu } from '../../common/ui/menu.ts';
import { results as summarize, type Run } from './game.ts';
import type { Control } from './input.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'victory' | 'defeat' | 'interlude';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'quit' | 'fullscreen' | 'retry' | 'continue';
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void, appearance: (id: Appearance) => void) {
  root.innerHTML = `<header class="hollow-hud"><div class="hollow-brand"><span class="hollow-mark">◷</span><div>CLOCKWORK HOLLOW<small>THE WAKING AQUEDUCT</small></div></div>
    <div class="hollow-instruments"><output aria-label="Motes collected">◇ 0 / 12</output><output class="hollow-progress" aria-label="Journey progress"></output><button data-intent="pause">Pause <kbd>Ⅱ</kbd></button></div></header>
    <main class="hollow-stage"><div class="hollow-location" aria-hidden="true"><span>01</span><div>THE WAKING AQUEDUCT<small>Follow the light. Wake the bell.</small></div></div>
    <output class="hollow-announcement" role="status" aria-label="Checkpoint"></output></main>
    <footer class="hollow-footer"><span class="hollow-hint">A D / ← → MOVE <span>·</span> SPACE TO JUMP</span><div class="hollow-touch"><div><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button></div><button data-control="jump" aria-label="Jump">↑ <small>JUMP</small></button></div><span class="hollow-footer-note">MOTES ARE OPTIONAL. THE BELL IS WAITING.</span></footer>`;
  const $ = createElementLookup(root);
  $('.hollow-stage').prepend(surface);
  const pause = $<HTMLButtonElement>('[data-intent="pause"]');
  pause.addEventListener('click', () => act('pause'), { signal });
  const results = createMenuReadout('Adventure results');
  const theme = createThemeSelect({ names: { normal: 'Verdant clockwork' }, signal, modes: themes, value: 'normal', onChange: appearance });
  const menu = createGameMenu<Intent, Screen>(root, surface, $('.hollow-stage'), {
    id: 'hollow', title: 'Clockwork Hollow', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'),
    game: results.element, theme: theme.element,
    controls: `<b>A D / ← →</b> move <span>·</span> <b>Space / W / ↑ / Z</b> jump<br>Hold for a higher jump. Release for a little hop.<br><b>Escape / P</b> pause <span>·</span> Touch: arrows + jump`,
    actions: [{ id: 'start', label: 'Play', screens: ['title'], primary: true },
      { id: 'resume', label: 'Resume', screens: ['paused'], primary: true },
      { id: 'continue', label: 'Continue', screens: ['interlude'], primary: true },
      { id: 'retry', label: 'Retry checkpoint', screens: ['defeat'], primary: true },
      { id: 'restart', label: 'Restart', screens: ['paused', 'victory', 'defeat', 'interlude'], primary: false },
      { id: 'quit', label: 'Game selection', screens: ['title', 'paused', 'victory', 'defeat', 'interlude'] }],
  });

  const controls = Object.fromEntries((['left', 'right', 'jump'] as const).map(action => [action, $<HTMLButtonElement>(`[data-control="${action}"]`)])) as Record<Control, HTMLButtonElement>;
  const description = menu.description;
  const motes = $('[aria-label="Motes collected"]'), hint = $('.hollow-hint');
  const announcement = $('.hollow-announcement');
  let saved = '';
  return { controls,
    soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    fullscreen: menu.fullscreen,
    show(screen: Screen, focus = true) {
      menu.heading.textContent = screen === 'title' ? 'Clockwork Hollow' : screen === 'paused' ? 'Paused' : screen === 'victory' ? 'Victory' : screen === 'defeat' ? 'Defeat' : 'Stage complete';
      description.textContent = screen === 'paused' ? '' : screen === 'victory' ? 'All three bells reached.' : screen === 'interlude' ? 'Continue to the next district.' : screen === 'defeat' ? 'Retry from the latest checkpoint. Collected motes are retained.' : 'Cross three districts and reach each bell. Lanterns save your return point. Motes are optional.';
      results.element.hidden = !['paused', 'victory', 'defeat', 'interlude'].includes(screen);

      for (const control of Object.values(controls)) control.disabled = screen !== 'playing';
      menu.show(screen, focus);
    },
    update(run: Run) {
      const collected = run.collected.filter(Boolean).length, tally = summarize(run);
      const time = `${Math.floor(run.elapsed / 60)}:${String(Math.floor(run.elapsed % 60)).padStart(2, '0')}`;
      setText(motes, `◇ ${collected} / ${run.level.motes.length}`);
      setText($('.hollow-progress'), `${run.levelIndex + 1} / ${run.levels.length} · ${time}`);
      setText($('.hollow-brand small'), run.level.name.toUpperCase());
      setText($('.hollow-location > span'), `0${run.levelIndex + 1}`);
      const location = $('.hollow-location > div');
      const checkpoint = run.level.checkpoints[run.checkpoint];
      const savedPoint = checkpoint ? `${run.level.name}: ${checkpoint.name} saved.` : '';
      if (savedPoint !== saved) { saved = savedPoint; setText(announcement, saved); }
      const caption = `${run.level.name} · ${checkpoint ? `Saved: ${checkpoint.name}` : run.level.subtitle}`;
      if (location.textContent !== caption) setText(location, caption);
      const next = run.levels[run.levelIndex + 1];
      setText($('[data-menu-action="continue"]'), next ? `Continue to ${next.name}` : 'Continue');
      results.update(`${run.completed} / ${run.levels.length} bells awakened · ${tally.motes} / ${tally.total} wind-up motes\n${time} on the path · ${run.deaths} missed steps · ${tally.score.toLocaleString()} points${run.status === 'victory' ? `\n${tally.title}` : ''}`);
      if (run.status === 'interlude') setText(description, `${run.level.name} is awake. Next: ${next?.name}. ${next?.subtitle}`);
      setText(hint, run.levelIndex === 0 && run.player.x < 810 ? 'HOLD JUMP FOR HEIGHT · RELEASE FOR A LITTLE HOP'
        : checkpoint && Math.abs(run.player.x - checkpoint.x) < 220 ? 'LANTERN LIT · YOUR RETURN POINT IS SAVED'
        : run.levelIndex > 0 ? 'BLUE: SAFE · AMBER: WARNING · CORAL: PRESSURE · LAND ON BEETLES'
        : 'LAND ON BEETLES · TOUCH LANTERNS · FOLLOW THE MOTES');
    },
  };
}
