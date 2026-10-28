import type { FighterId } from './content.ts';

export interface DuelTheme {
  readonly sky: readonly [string, string, string];
  readonly mountains: readonly [string, string];
  readonly floor: readonly [string, string, string];
  readonly orb: readonly [string, string];
  readonly clouds: readonly [string, string];
  readonly banner: string;
  readonly weather: 'storm' | 'dawn';
  readonly fighters: Readonly<Record<FighterId, { readonly cloth: string; readonly dark: string; readonly trim: string }>>;
}
export type Appearance = 'normal';
export const themes: Readonly<Record<Appearance, DuelTheme>> = {
  normal: {
    sky: ['#16192f', '#49414f', '#151825'], mountains: ['#252b40', '#2c3040'], floor: ['#5b5260', '#39333f', '#1b1c2b'],
    orb: ['#cec6ca', '#bab9c2'], clouds: ['#24283c80', '#3030446b'], banner: '#682f4666', weather: 'storm',
    fighters: { nera: { cloth: '#326f77', dark: '#203c51', trim: '#87f1db' }, kael: { cloth: '#6e4650', dark: '#323344', trim: '#ffbb82' } },
  },
};
