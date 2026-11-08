import type { DirectionPad } from '../../engine/browser/buttons.ts';
import './direction-pad.css';

/** Keep authored action labels and native keyboard buttons inside a sliding touch pad. */
export function createDirectionPad<Action extends string>(element: HTMLElement, actions: DirectionPad<Action>['actions']): DirectionPad<Action> {
  element.classList.add('touch-direction-pad');
  element.setAttribute('role', 'group');
  if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label', 'Direction controls');
  for (const [direction, action] of Object.entries(actions)) {
    const button = element.querySelector<HTMLButtonElement>(`[data-control="${action}"]`);
    if (!button) throw new Error(`Missing direction button: ${action}`);
    button.dataset.direction = direction;
  }
  return { element, actions };
}
