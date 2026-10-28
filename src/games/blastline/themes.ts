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
export const appearances = { iron: 'Iron coast', arctic: 'Arctic relay' } as const;
export type Appearance = keyof typeof appearances;
export const themes: Readonly<Record<Appearance, BlastTheme>> = {
  iron: {
    sky: ['#253f4b', '#ad8465', '#293e42'], foundrySky: ['#202b3a', '#765447', '#293e42'], skyline: ['#394a50', '#2b4248', '#263c42'],
    sun: '#eccd8c', weather: 'ash', structure: ['#1a323d', '#2e4850'], masonry: ['#776f57', '#a1906d'], armor: ['#71594e', '#92705a'], ledge: '#77918a',
    enemies: ['#687b74', '#846e62'], operators: { nova: { suit: '#6cc7b4', dark: '#325861' }, bolt: { suit: '#dca54c', dark: '#6d654c' } },
  },
  arctic: {
    sky: ['#182c50', '#7899b2', '#263d57'], foundrySky: ['#252b50', '#677993', '#23344d'], skyline: ['#496780', '#36516e', '#273f5a'],
    sun: '#d9ecf1', weather: 'snow', structure: ['#223c53', '#3b5d77'], masonry: ['#707b87', '#9facb7'], armor: ['#756f88', '#a397b5'], ledge: '#c8e5ef',
    enemies: ['#5b7694', '#857798'], operators: { nova: { suit: '#c8e7e9', dark: '#3a6b84' }, bolt: { suit: '#efbd7b', dark: '#886754' } },
  },
};
