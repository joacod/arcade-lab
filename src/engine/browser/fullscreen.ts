/** A persistent display target can outlive the game sessions rendered inside it. */
export interface FullscreenControl {
  readonly available: boolean;
  readonly active: boolean;
  toggle(): Promise<string>;
}

export function createFullscreen(target: HTMLElement): FullscreenControl {
  return {
    get available() { return Boolean(document.fullscreenEnabled && target.requestFullscreen); },
    get active() { return document.fullscreenElement === target; },
    async toggle() {
      try {
        if (document.fullscreenElement === target) await document.exitFullscreen();
        else if (document.fullscreenEnabled && target.requestFullscreen) await target.requestFullscreen();
        else return 'Fullscreen is unavailable in this browser.';
        return '';
      } catch { return 'Fullscreen could not open. You can keep playing here.'; }
    },
  };
}
