export function createHost(container: HTMLElement, callbacks: { onDisplayChange(): void; onFullscreenChange(): void }) {
  const root = document.createElement('section');
  root.className = 'clearing-app';
  root.setAttribute('aria-label', 'Last Light Clearing');
  container.append(root);
  const lifetime = new AbortController();
  const surface = document.createElement('div');
  surface.className = 'play-surface';
  surface.tabIndex = 0;
  surface.setAttribute('aria-label', 'Clearing arena. Move with WASD or arrow keys. Press Escape to pause. Drag to move with touch or mouse.');
  let width = 1;
  let height = 1;
  let ratio = 1;
  let left = 0, top = 0;
  let frame = 0;
  let disposed = false;

  function resize() {
    if (disposed) return;
    const rect = surface.getBoundingClientRect();
    const nextWidth = Math.max(1, rect.width), nextHeight = Math.max(1, rect.height);
    const nextRatio = Math.min(window.devicePixelRatio || 1, 2);
    const changed = width !== nextWidth || height !== nextHeight || ratio !== nextRatio
      || left !== rect.left || top !== rect.top;
    left = rect.left; top = rect.top;
    width = nextWidth; height = nextHeight; ratio = nextRatio;
    if (changed) callbacks.onDisplayChange();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(surface);
  window.addEventListener('resize', resize, { signal: lifetime.signal });
  document.addEventListener('fullscreenchange', () => {
    if (disposed) return;
    callbacks.onDisplayChange(); resize(); callbacks.onFullscreenChange();
  }, { signal: lifetime.signal });

  return {
    root, surface, signal: lifetime.signal,
    get width() { return width; },
    get height() { return height; },
    get ratio() { return ratio; },
    get fullscreenAvailable() { return Boolean(document.fullscreenEnabled && root.requestFullscreen); },
    get fullscreen() { return document.fullscreenElement === root; },
    async toggleFullscreen() {
      if (disposed) return '';
      callbacks.onDisplayChange();
      try {
        if (document.fullscreenElement === root) await document.exitFullscreen();
        else if (document.fullscreenEnabled && root.requestFullscreen) await root.requestFullscreen();
        else return 'Fullscreen is unavailable in this browser. The viewport layout is still available.';
        return '';
      } catch {
        return 'Fullscreen could not open. You can continue in the viewport layout.';
      }
    },
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
