import type { FullscreenControl } from './fullscreen.ts';
import './host.css';

interface HostOptions {
  className: string;
  label: string;
  surfaceLabel: string;
  onDisplayChange(): void;
  onFullscreenChange(): void;
  fullscreen: FullscreenControl;
}
export function createHost(container: HTMLElement, callbacks: HostOptions) {
  const root = document.createElement('section');
  root.className = `game-host ${callbacks.className}`;
  root.setAttribute('aria-label', callbacks.label);
  container.append(root);
  const fullscreen = callbacks.fullscreen;
  const lifetime = new AbortController();
  // Long presses belong to the game, including its HUD and touch controls.
  for (const name of ['contextmenu', 'selectstart', 'dragstart']) {
    root.addEventListener(name, event => event.preventDefault(), { signal: lifetime.signal });
  }
  const surface = document.createElement('div');
  surface.className = 'play-surface';
  surface.tabIndex = 0;
  surface.setAttribute('aria-label', callbacks.surfaceLabel);
  let width = 1;
  let height = 1;
  let ratio = 1;
  let viewportWidth = window.innerWidth, viewportHeight = window.innerHeight, displayRatio = window.devicePixelRatio;
  let frame: number | undefined;
  let started = false;
  let disposed = false;
  let onFrame: ((now: number) => void) | undefined;

  function schedule() {
    if (!disposed && started && !document.hidden && frame === undefined) frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = undefined;
    if (disposed || document.hidden) return;
    onFrame?.(now);
    schedule();
  }

  function resize() {
    if (disposed) return;
    const rect = surface.getBoundingClientRect();
    const nextWidth = Math.max(1, rect.width), nextHeight = Math.max(1, rect.height);
    const nextRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = nextWidth; height = nextHeight; ratio = nextRatio;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(surface);
  window.addEventListener('resize', () => {
    const changed = viewportWidth !== window.innerWidth || viewportHeight !== window.innerHeight || displayRatio !== window.devicePixelRatio;
    viewportWidth = window.innerWidth; viewportHeight = window.innerHeight; displayRatio = window.devicePixelRatio;
    resize();
    // HUD text can wrap as pickups, scores and objectives change. Measuring the
    // resulting playfield must not turn a normal gameplay update into a pause.
    if (changed) callbacks.onDisplayChange();
  }, { signal: lifetime.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
    } else {
      resize(); schedule();
    }
  }, { signal: lifetime.signal });
  document.addEventListener('fullscreenchange', () => {
    if (disposed) return;
    callbacks.onDisplayChange(); resize(); callbacks.onFullscreenChange();
  }, { signal: lifetime.signal });

  return {
    root, surface, signal: lifetime.signal,
    get width() { return width; },
    get height() { return height; },
    get ratio() { return ratio; },
    get fullscreenAvailable() { return fullscreen.available; },
    get fullscreen() { return fullscreen.active; },
    async toggleFullscreen() {
      if (disposed) return '';
      callbacks.onDisplayChange();
      return fullscreen.toggle();
    },
    start(callback: (now: number) => void) {
      if (disposed || started) return;
      started = true;
      onFrame = callback;
      resize();
      schedule();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined; onFrame = undefined;
      lifetime.abort();
      observer.disconnect();
      root.remove();
    },
  };
}
