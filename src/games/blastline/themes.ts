import type { Operator } from './content.ts';

export interface BlastTheme {
  readonly sky: readonly [string, string, string];
  readonly foundrySky: readonly [string, string, string];
  readonly skyline: readonly [string, string, string];
  readonly sun: string;
  readonly weather: 'ash' | 'snow';
  /** Material silhouettes and warning colors remain readable in every appearance. */
  readonly structure: readonly [string, string];
  readonly masonry: readonly [string, string];
  readonly armor: readonly [string, string];
  readonly ledge: string;
  readonly enemies: readonly [string, string];
  readonly operators: Readonly<Record<Operator, { readonly suit: string; readonly dark: string }>>;
}
export type Appearance = 'normal';
export const themes: Readonly<Record<Appearance, BlastTheme>> = {
  normal: {
    sky: ['#253f4b', '#ad8465', '#293e42'], foundrySky: ['#202b3a', '#765447', '#293e42'], skyline: ['#394a50', '#2b4248', '#263c42'],
    sun: '#eccd8c', weather: 'ash', structure: ['#1a323d', '#2e4850'], masonry: ['#776f57', '#a1906d'], armor: ['#71594e', '#92705a'], ledge: '#77918a',
    enemies: ['#687b74', '#846e62'], operators: { nova: { suit: '#6cc7b4', dark: '#325861' }, bolt: { suit: '#dca54c', dark: '#6d654c' } },
  },
};
