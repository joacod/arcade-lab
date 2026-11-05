import type { FullscreenControl } from './browser/fullscreen.ts';

export interface GameSession { dispose(): void }
export interface GameEntry { mount(container: HTMLElement, fullscreen: FullscreenControl): GameSession }
