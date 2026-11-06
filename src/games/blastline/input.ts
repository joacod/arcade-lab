import { bindButtons } from '../../engine/browser/buttons.ts';
import type { KeyBindings } from '../../engine/bindings.ts';
import type { Action } from './state.ts';
export type Control = 'left' | 'right' | 'up' | 'down' | 'jump' | 'fire' | 'grenade' | 'switch';
const bindings: KeyBindings<Control> = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  jump: ['Space'], fire: ['KeyJ'], grenade: ['KeyK'], switch: ['KeyQ'],
};
export function bindInput(surface: HTMLElement, controls: Readonly<Record<Control, HTMLButtonElement>>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, bindings, active, signal });
  return { clear: buttons.clear, read(): Action {
    const { held, pressed } = buttons.read();
    return { move: Number(held.has('right')) - Number(held.has('left')), aim: Number(held.has('down')) - Number(held.has('up')),
      jumpPressed: pressed.has('jump'), jumpHeld: held.has('jump'), fire: held.has('fire'), firePressed: pressed.has('fire'), grenade: pressed.has('grenade'), switch: pressed.has('switch') };
  } };
}
