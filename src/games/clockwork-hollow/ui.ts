import { createThemeSelect } from '../../common/ui/theme-select.ts';
import { themes, type Appearance } from './themes.ts';
import { createElementLookup, setText } from '../../common/ui/dom.ts';
import { createMenuReadout } from '../../common/ui/menu-components.ts';
import { createGameMenu } from '../../common/ui/menu.ts';
import { results as summarize, ventCycle, type Failure, type Run } from './game.ts';
import { movement } from './content.ts';
import type { Control } from './input.ts';
export type Screen = 'title' | 'playing' | 'paused' | 'victory' | 'defeat' | 'interlude';
export type Intent = 'start' | 'pause' | 'resume' | 'restart' | 'quit' | 'fullscreen' | 'retry' | 'continue';
const failureAdvice: Record<Failure, string> = {
  fall: 'Missed the landing. Hold jump for height; release for a shorter hop.',
  thorns: 'Caught on copper thorns. Jump over the full thorn bed.',
  pressure: 'Caught in a pressure vent. Cross on CLEAR while its timer has time to spare.',
  beetle: 'Bumped a wind-up beetle. Land on its shell from above, or leap over it.',
};
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void, appearance: (id: Appearance) => void) {
  root.innerHTML = `<header class="hollow-hud"><div class="hollow-brand"><span class="hollow-mark">◷</span><div>CLOCKWORK HOLLOW<small>THE WAKING AQUEDUCT</small></div></div>
    <div class="hollow-instruments"><div class="hollow-tallies"><output aria-label="Motes collected"></output><output class="hollow-progress" aria-label="Bells awakened"></output></div><output class="hollow-time" aria-label="Journey time"></output><button data-intent="pause">Pause</button></div></header>
    <main class="hollow-stage"><div class="hollow-location" aria-hidden="true"><span>01</span><div><b class="hollow-location-title">THE WAKING AQUEDUCT</b><small class="hollow-location-detail">Follow the light. Wake the bell.</small></div></div>
    <output class="hollow-announcement" role="status" aria-label="Checkpoint"></output></main>
    <footer class="hollow-footer"><span class="hollow-hint">A D / ← → MOVE <span>·</span> SPACE TO JUMP <span>·</span> P TO PAUSE / RESUME</span><div class="hollow-touch"><div><button data-control="left" aria-label="Move left">←</button><button data-control="right" aria-label="Move right">→</button></div><button data-control="jump" aria-label="Jump">↑ <small>JUMP</small></button></div><span class="hollow-footer-note">MOTES ARE OPTIONAL. THE BELL IS WAITING.</span></footer>`;
  const $ = createElementLookup(root);
  $('.hollow-stage').prepend(surface);
  const pause = $<HTMLButtonElement>('[data-intent="pause"]');
  pause.addEventListener('click', () => act('pause'), { signal });
  const results = createMenuReadout('Adventure results');
  const theme = createThemeSelect({ names: { normal: 'Verdant clockwork', assets: 'Porcelain Bellgarden' }, signal, modes: themes, value: 'normal', onChange: appearance });
  const menu = createGameMenu<Intent, Screen>(root, surface, $('.hollow-stage'), {
    id: 'hollow', title: 'Clockwork Hollow', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'),
    game: results.element, theme: theme.element,
    controls: `<b>A D / ← →</b> move <span>·</span> <b>Space / W / ↑ / Z</b> jump<br>Hold for a higher jump. Release for a little hop.<br>Vents: cross on CLEAR. The bar drains toward the next phase.<br>Touch: arrows + jump`,
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
  let saved = '', savedAt = 0;
  return { controls,
    appearanceStatus(value: Appearance, message: string) { theme.setValue(value); menu.displayStatus(message); },
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
      setText($('.hollow-progress'), `${run.completed} / ${run.levels.length} BELLS`);
      setText($('.hollow-time'), time);
      setText($('.hollow-brand small'), run.level.name.toUpperCase());
      setText($('.hollow-location > span'), `0${run.levelIndex + 1}`);
      const checkpoint = run.level.checkpoints[run.checkpoint];
      if (run.status === 'defeat' && run.failure) {
        setText(description, `${failureAdvice[run.failure]} Retry returns to ${checkpoint?.name ?? `the start of ${run.level.name}`}. Collected motes are kept.`);
      }
      const savedPoint = checkpoint ? `${run.level.name}: ${checkpoint.name} saved.` : '';
      if (savedPoint !== saved) {
        saved = savedPoint; savedAt = run.elapsed;
        setText(announcement, checkpoint ? `${checkpoint.name} lit. Return point saved.` : '');
      }
      announcement.classList.toggle('is-visible', Boolean(saved) && run.elapsed - savedAt < 3.2);
      setText($('.hollow-location-title'), run.level.name);
      const nearbyVent = run.level.vents.find(vent => vent.x + vent.w >= run.player.x && vent.x - run.player.x - movement.width < 230);
      let detail = checkpoint ? `Return point: ${checkpoint.name}` : run.level.subtitle;
      if (nearbyVent) {
        const cycle = ventCycle(nearbyVent, run.levelTime);
        const seconds = (Math.ceil(cycle.remaining * 10) / 10).toFixed(1);
        detail = cycle.phase === 'idle' ? `CLEAR · ${seconds}s until warning`
          : cycle.phase === 'warning' ? `FIRE IN ${seconds}s · Wait for CLEAR`
          : `PRESSURE · ${seconds}s until CLEAR`;
      } else if (run.levelIndex === 0 && run.player.x < 810) {
        detail = 'Hold Jump for height. Release for a short hop.';
      }
      setText($('.hollow-location-detail'), detail);
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
