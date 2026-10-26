import { createRun, stepRun } from './game.ts';
import { createHost } from './browser/host.ts';
import { bindInput } from './browser/input.ts';
import { createClock, FIXED_STEP } from './browser/clock.ts';
import { createPresentation } from './presentation.ts';
import { createUI, type Screen, type MenuAction } from './ui.ts';

/** Owns one browser session. Each restart replaces only the run and its presentation. */
export function mountClearing(container: HTMLElement): { dispose(): void } {
  const host = createHost(container);
  const clock = createClock();
  const presentation = createPresentation(host.ctx);
  let run = createRun();
  let screen: Screen = 'title';
  let disposed = false;
  const input = bindInput(host.canvas, () => host.viewport,
    () => screen === 'playing', host.signal);
  const ui = createUI(host.root, host.canvas, act, host.signal);

  function transition(next: Screen, focus = true) {
    input.clear();
    clock.reset();
    screen = next;
    ui.show(screen, focus);
  }
  function act(action: MenuAction) {
    if (disposed) return;
    if (action === 'start' || action === 'restart') {
      if (document.hidden || !document.hasFocus()) return;
      run = createRun(); presentation.reset(); transition('playing');
    } else if (action === 'pause' && screen === 'playing') transition('paused');
    else if (action === 'resume' && screen === 'paused') {
      if (!document.hidden && document.hasFocus()) transition('playing');
    } else if (action === 'title') {
      run = createRun(); presentation.reset(); transition('title');
    }
  }
  function suspend() {
    input.clear(); clock.reset();
    if (screen === 'playing') transition('paused', false);
  }
  window.addEventListener('blur', suspend, { signal: host.signal });
  window.addEventListener('pagehide', suspend, { signal: host.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend();
    else clock.reset();
  }, { signal: host.signal });
  host.root.addEventListener('focusout', () => {
    input.clear();
    // Hiding a menu button can briefly clear focus before the canvas receives it.
    queueMicrotask(() => {
      if (!disposed && document.activeElement !== host.canvas) suspend();
    });
  }, { signal: host.signal });
  host.root.addEventListener('keydown', event => {
    if (event.repeat || (event.code !== 'Escape' && event.code !== 'KeyP')) return;
    if (screen === 'title') return;
    event.preventDefault();
    act(screen === 'playing' ? 'pause' : 'resume');
  }, { signal: host.signal });
  ui.show(screen, false);
  host.start(now => {
    if (screen === 'playing') {
      const steps = clock.advance(now);
      const move = input.read();
      for (let i = 0; i < steps; i++) stepRun(run, move, FIXED_STEP);
    }
    presentation.draw(run, host.viewport, host.width, host.height, host.ratio, input.stick);
    ui.updateTime(run.elapsed);
  });
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      input.clear();
      host.dispose();
    },
  };
}
