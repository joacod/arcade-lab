import { bindButtons } from '../../engine/browser/buttons.ts';
import type { Action } from './state.ts';
export type Control = 'left' | 'right' | 'up' | 'down' | 'jump' | 'fire' | 'grenade' | 'switch';
const keys: Readonly<Record<string, Control>> = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', Space: 'jump', KeyJ: 'fire', KeyK: 'grenade', KeyQ: 'switch' };
export function bindInput(surface: HTMLElement, controls: Readonly<Record<Control, HTMLButtonElement>>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, keys, active, signal });
  return { clear: buttons.clear, read(): Action {
    const { held, pressed } = buttons.read();
    return { move: Number(held.has('right')) - Number(held.has('left')), aim: Number(held.has('down')) - Number(held.has('up')),
      jumpPressed: pressed.has('jump'), jumpHeld: held.has('jump'), fire: held.has('fire') || pressed.has('fire'), grenade: pressed.has('grenade'), switch: pressed.has('switch') };
  } };
}
