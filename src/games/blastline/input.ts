import { bindButtons } from '../../engine/browser/buttons.ts';
import type { KeyBindings } from '../../engine/bindings.ts';
import type { Action } from './state.ts';
export type Control = 'left' | 'right' | 'up' | 'down' | 'jump' | 'fire' | 'grenade' | 'switch';
export const layouts = {
  arrows: { name: 'Arrows + Z / X / C', description: 'Right hand moves · left hand attacks', bindings: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    jump: ['Space'], fire: ['KeyZ'], grenade: ['KeyX'], switch: ['KeyC'],
  } },
  wasd: { name: 'WASD + J / K / L', description: 'Left hand moves · right hand attacks', bindings: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    jump: ['Space'], fire: ['KeyJ'], grenade: ['KeyK'], switch: ['KeyL'],
  } },
} as const satisfies Record<string, { name: string; description: string; bindings: KeyBindings<Control> }>;
export type Layout = keyof typeof layouts;
export const initialLayout: Layout = 'arrows';
export function bindInput(surface: HTMLElement, controls: Readonly<Record<Control, HTMLButtonElement>>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, bindings: layouts[initialLayout].bindings, active, signal });
  return { clear: buttons.clear, setLayout(layout: Layout) { buttons.setBindings(layouts[layout].bindings); }, read(): Action {
    const { held, pressed } = buttons.read();
    return { move: Number(held.has('right')) - Number(held.has('left')), aim: Number(held.has('down')) - Number(held.has('up')),
      jumpPressed: pressed.has('jump'), jumpHeld: held.has('jump'), fire: held.has('fire'), firePressed: pressed.has('fire'), grenade: pressed.has('grenade'), switch: pressed.has('switch') };
  } };
}
