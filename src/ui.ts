export type Screen = 'title' | 'playing' | 'paused';
export type MenuAction = 'start' | 'pause' | 'resume' | 'restart' | 'title';

export function createUI(root: HTMLElement, canvas: HTMLCanvasElement,
  onAction: (action: MenuAction) => void, signal: AbortSignal) {
  root.innerHTML = `
    <header class="masthead"><a class="brand" href="./"><span class="brand-mark" aria-hidden="true">a</span> arcade lab<span class="brand-divider">/</span><span class="brand-note">Experiments in play</span></a><span class="edition">FIELD STUDY 001</span></header>
    <main>
      <div class="introduction"><div><p class="eyebrow">01 / A LIGHT IN THE WOODS</p><h1>Last Light Clearing<span>.</span></h1></div><p class="intro-note">Find your footing.<br>Keep a little light alive.</p></div>
      <div class="game-shell">
        <div class="hud"><div class="hud-identity"><span class="live-dot"></span><strong>THE CLEARING</strong><span class="status">Ready to explore</span></div><div class="hud-actions"><output class="timer" aria-label="Active time">00:00</output><button data-action="pause" class="pause-button" hidden>Pause <kbd>Esc</kbd></button></div></div>
        <div class="stage"><div class="menu-layer"><section class="menu" aria-labelledby="menu-heading"><p class="eyebrow menu-kicker">LAST LIGHT CLEARING</p><div class="lantern" aria-hidden="true">✦</div><h2 id="menu-heading">A quiet beginning.</h2><p class="menu-description">You are the Keeper. Explore the clearing<br>and carry your light to its edges.</p><div class="menu-actions"><button class="primary" data-action="start">Enter the clearing <span aria-hidden="true">↗</span></button><button class="primary" data-action="resume" hidden>Resume exploring <span aria-hidden="true">↗</span></button><button data-action="restart" hidden>Restart</button><button data-action="title" hidden>Return to title</button></div><p class="menu-footnote">Movement study · No enemies. No hurry.</p></section></div></div>
        <div class="controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span class="control-copy">or arrow keys to move</span></span><span class="touch-hint"><span aria-hidden="true">◎</span> Drag in the clearing to move</span></div>
      </div>
      <footer><p><span class="footer-dot"></span> STEP 01 <span class="footer-divider">/</span> Movement &amp; foundations</p><p>Built for the browser. Room to grow.</p></footer>
    </main>`;
  const stage = root.querySelector<HTMLElement>('.stage')!;
  stage.prepend(canvas);
  const layer = root.querySelector<HTMLElement>('.menu-layer')!;
  const heading = root.querySelector<HTMLElement>('h2')!;
  const description = root.querySelector<HTMLElement>('.menu-description')!;
  const status = root.querySelector<HTMLElement>('.status')!;
  const timer = root.querySelector<HTMLOutputElement>('.timer')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button[data-action]')];
  for (const button of buttons) {
    button.addEventListener('click', () => onAction(button.dataset.action as MenuAction), { signal });
  }
  let displayedSecond = -1;
  return {
    updateTime(elapsed: number) {
      const seconds = Math.floor(elapsed);
      if (seconds === displayedSecond) return;
      displayedSecond = seconds;
      timer.value = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    },
    show(screen: Screen, focus = true) {
      root.dataset.screen = screen;
      layer.hidden = screen === 'playing';
      canvas.tabIndex = screen === 'playing' ? 0 : -1;
      canvas.setAttribute('aria-hidden', String(screen !== 'playing'));
      heading.textContent = screen === 'paused' ? 'Take a breath.' : 'A quiet beginning.';
      description.innerHTML = screen === 'paused'
        ? 'Your light is safe here.<br>Return when you’re ready.'
        : 'You are the Keeper. Explore the clearing<br>and carry your light to its edges.';
      status.textContent = screen === 'playing' ? 'Keeper · Exploring' : screen === 'paused' ? 'Paused' : 'Ready to explore';
      for (const button of buttons) {
        const action = button.dataset.action;
        button.hidden = !(screen === 'title' ? action === 'start'
          : screen === 'playing' ? action === 'pause'
          : action === 'resume' || action === 'restart' || action === 'title');
      }
      if (focus) {
        if (screen === 'playing') canvas.focus({ preventScroll: true });
        else buttons.find(button => !button.hidden)?.focus({ preventScroll: true });
      }
    },
  };
}
