import { bindButtons } from '../../engine/browser/buttons.ts';
import type { Action } from './game.ts';
export type Control = 'left' | 'right' | 'up' | 'down' | 'light' | 'heavy' | 'jump';
const keys: Readonly<Record<string, Control>> = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyJ: 'light', KeyK: 'heavy', Space: 'jump' };
export function bindInput(surface: HTMLElement, controls: Record<Control, HTMLButtonElement>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, keys, active, signal });
  return { clear: buttons.clear, read(): Action {
    const { held, pressed } = buttons.read();
    return { x: Number(held.has('right')) - Number(held.has('left')), lane: Number(held.has('down')) - Number(held.has('up')),
      light: pressed.has('light'), heavy: pressed.has('heavy'), jump: pressed.has('jump') };
  } };
}
