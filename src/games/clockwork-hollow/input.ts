import { bindButtons } from '../../engine/browser/buttons.ts';
import type { KeyBindings } from '../../engine/bindings.ts';
import type { Action } from './game.ts';
export type Control = 'left' | 'right' | 'jump';
const bindings: KeyBindings<Control> = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], jump: ['Space', 'KeyW', 'ArrowUp', 'KeyZ'],
};
export function bindInput(surface: HTMLElement, controls: Readonly<Record<Control, HTMLButtonElement>>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, bindings, active, signal });
  return { clear: buttons.clear, read(): Action {
    const { held, pressed } = buttons.read();
    return { move: Number(held.has('right')) - Number(held.has('left')), jumpHeld: held.has('jump'), jumpPressed: pressed.has('jump') };
  } };
}
