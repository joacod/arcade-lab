import { bindButtons } from '../browser/buttons.ts';
import type { Action } from './game.ts';
export type Control = 'left' | 'right' | 'jump' | 'crouch' | 'light' | 'heavy' | 'special' | 'block';
const keys: Readonly<Record<string, Control>> = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'jump', ArrowUp: 'jump', Space: 'jump', KeyS: 'crouch', ArrowDown: 'crouch',
  KeyJ: 'light', KeyK: 'heavy', KeyL: 'special', ShiftLeft: 'block', ShiftRight: 'block' };
export function bindInput(surface: HTMLElement, controls: Record<Control, HTMLButtonElement>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, keys, active, signal });
  return { clear: buttons.clear, read(): Action {
    const { held, pressed } = buttons.read();
    return { x: Number(held.has('right')) - Number(held.has('left')), crouch: held.has('crouch'), block: held.has('block'),
      jump: pressed.has('jump'), light: pressed.has('light'), heavy: pressed.has('heavy'), special: pressed.has('special') };
  } };
}
