import { bindButtons } from '../../engine/browser/buttons.ts';
import type { KeyBindings } from '../../engine/bindings.ts';
import type { Action } from './game.ts';
export type Control = 'left' | 'right' | 'up' | 'down' | 'light' | 'heavy' | 'jump';
export const layouts = {
  arrows: { name: 'Arrows + Z / X', movement: 'ARROWS', description: 'Right hand moves · left hand attacks', bindings: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    light: ['KeyZ'], heavy: ['KeyX'], jump: ['Space'],
  } },
  wasd: { name: 'WASD + J / K', movement: 'WASD', description: 'Left hand moves · right hand attacks', bindings: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    light: ['KeyJ'], heavy: ['KeyK'], jump: ['Space'],
  } },
} as const satisfies Record<string, { name: string; movement: string; description: string; bindings: KeyBindings<Control> }>;
export type Layout = keyof typeof layouts;
export const initialLayout: Layout = 'arrows';
export function bindInput(surface: HTMLElement, controls: Record<Control, HTMLButtonElement>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, bindings: layouts[initialLayout].bindings, active, signal });
  return { clear: buttons.clear, setLayout(layout: Layout) { buttons.setBindings(layouts[layout].bindings); }, read(): Action {
    const { held, pressed } = buttons.read();
    return { x: Number(held.has('right')) - Number(held.has('left')), lane: Number(held.has('down')) - Number(held.has('up')),
      light: pressed.has('light'), heavy: pressed.has('heavy'), jump: pressed.has('jump') };
  } };
}
