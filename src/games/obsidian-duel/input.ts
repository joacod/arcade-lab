import { bindButtons } from '../../engine/browser/buttons.ts';
import type { KeyBindings } from '../../engine/bindings.ts';
import type { Action } from './game.ts';
export type Control = 'left' | 'right' | 'jump' | 'crouch' | 'light' | 'heavy' | 'special' | 'block';
export const layouts = {
  arrows: { name: 'Arrows + Z / X / C', description: 'Right hand moves · left hand attacks', bindings: {
    left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp', 'Space'], crouch: ['ArrowDown'],
    light: ['KeyZ'], heavy: ['KeyX'], special: ['KeyC'], block: ['ShiftLeft', 'ShiftRight'],
  } },
  wasd: { name: 'WASD + J / K / L', description: 'Left hand moves · right hand attacks', bindings: {
    left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'], crouch: ['KeyS'],
    light: ['KeyJ'], heavy: ['KeyK'], special: ['KeyL'], block: ['ShiftLeft', 'ShiftRight'],
  } },
} as const satisfies Record<string, { name: string; description: string; bindings: KeyBindings<Control> }>;
export type Layout = keyof typeof layouts;
export const initialLayout: Layout = 'arrows';
export function bindInput(surface: HTMLElement, controls: Record<Control, HTMLButtonElement>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, bindings: layouts[initialLayout].bindings, active, signal });
  return { clear: buttons.clear, setLayout(layout: Layout) { buttons.setBindings(layouts[layout].bindings); }, read(): Action {
    const { held, pressed } = buttons.read();
    return { x: Number(held.has('right')) - Number(held.has('left')), crouch: held.has('crouch'), block: held.has('block'),
      jump: pressed.has('jump'), light: pressed.has('light'), heavy: pressed.has('heavy'), special: pressed.has('special') };
  } };
}
