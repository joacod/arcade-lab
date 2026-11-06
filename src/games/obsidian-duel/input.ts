import { bindButtons } from '../../engine/browser/buttons.ts';
import type { KeyBindings } from '../../engine/bindings.ts';
import type { Action } from './game.ts';
export type Control = 'left' | 'right' | 'jump' | 'crouch' | 'light' | 'heavy' | 'special' | 'block';
const bindings: KeyBindings<Control> = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp', 'Space'], crouch: ['KeyS', 'ArrowDown'],
  light: ['KeyJ'], heavy: ['KeyK'], special: ['KeyL'], block: ['ShiftLeft', 'ShiftRight'],
};
export function bindInput(surface: HTMLElement, controls: Record<Control, HTMLButtonElement>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, bindings, active, signal });
  return { clear: buttons.clear, read(): Action {
    const { held, pressed } = buttons.read();
    return { x: Number(held.has('right')) - Number(held.has('left')), crouch: held.has('crouch'), block: held.has('block'),
      jump: pressed.has('jump'), light: pressed.has('light'), heavy: pressed.has('heavy'), special: pressed.has('special') };
  } };
}
