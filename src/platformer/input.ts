import { bindButtons } from '../browser/buttons.ts';
import type { Action } from './game.ts';
export type Control = 'left' | 'right' | 'jump';
const keys: Readonly<Record<string, Control>> = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', KeyZ: 'jump',
};
export function bindInput(surface: HTMLElement, controls: Readonly<Record<Control, HTMLButtonElement>>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, keys, active, signal });
  return { clear: buttons.clear, read(): Action {
    const { held, pressed } = buttons.read();
    return { move: Number(held.has('right')) - Number(held.has('left')), jumpHeld: held.has('jump'), jumpPressed: pressed.has('jump') };
  } };
}
