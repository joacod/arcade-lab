export interface GameSession { dispose(): void }
export interface GameEntry { mount(container: HTMLElement): GameSession }
