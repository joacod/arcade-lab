interface HostOptions {
  className: string;
  label: string;
  surfaceLabel: string;
  onDisplayChange(): void;
  onFullscreenChange(): void;
}
export function createHost(container: HTMLElement, callbacks: HostOptions) {
  const root = document.createElement('section');
  root.className = callbacks.className;
  root.setAttribute('aria-label', callbacks.label);
  container.append(root);
  const lifetime = new AbortController();
  const surface = document.createElement('div');
  surface.className = 'play-surface';
  surface.tabIndex = 0;
  surface.setAttribute('aria-label', callbacks.surfaceLabel);
  let width = 1;
  let height = 1;
  let ratio = 1;
  let left = 0, top = 0;
  let frame: number | undefined;
  let started = false;
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
      if (disposed || started) return;
      started = true;
      resize();
      const tick = (now: number) => {
        frame = undefined;
        if (disposed) return;
        onFrame(now);
        if (!disposed) frame = requestAnimationFrame(tick);
      };
      if (!disposed) frame = requestAnimationFrame(tick);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame !== undefined) cancelAnimationFrame(frame);
      lifetime.abort();
      observer.disconnect();
      root.remove();
    },
  };
}
