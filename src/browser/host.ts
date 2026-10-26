import { createViewport } from './viewport.ts';

export function createHost(container: HTMLElement) {
  const root = document.createElement('section');
  root.className = 'clearing-app';
  root.setAttribute('aria-label', 'Last Light Clearing');
  container.append(root);
  const lifetime = new AbortController();
  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Clearing arena. Move with WASD or arrow keys. Press Escape to pause. Drag to move with touch or mouse.');
  const ctx = canvas.getContext('2d');
  if (!ctx) { root.remove(); throw new Error('Canvas 2D is required to play.'); }
  let width = 1;
  let height = 1;
  let ratio = 1;
  let viewport = createViewport(width, height);
  let frame = 0;
  let disposed = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    viewport = createViewport(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize, { signal: lifetime.signal });

  return {
    root, canvas, ctx, signal: lifetime.signal,
    get width() { return width; },
    get height() { return height; },
    get ratio() { return ratio; },
    get viewport() { return viewport; },
    start(onFrame: (now: number) => void) {
      resize();
      const tick = (now: number) => {
        if (disposed) return;
        onFrame(now);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      lifetime.abort();
      observer.disconnect();
      root.remove();
    },
  };
}
