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
export type Appearance = 'normal' | 'assets' | 'quality';
export const appearanceNames: Record<Appearance, string> = { normal: 'Tempest citadel', assets: 'Eclipse Foundry', quality: 'Moonfall Sanctum' };
export const themes: Readonly<Record<Appearance, DuelTheme>> = {
  normal: {
    sky: ['#16192f', '#49414f', '#151825'], mountains: ['#252b40', '#2c3040'], floor: ['#5b5260', '#39333f', '#1b1c2b'],
    orb: ['#cec6ca', '#bab9c2'], clouds: ['#24283c80', '#3030446b'], banner: '#682f4666', weather: 'storm',
    fighters: { nera: { cloth: '#326f77', dark: '#203c51', trim: '#87f1db' }, kael: { cloth: '#6e4650', dark: '#323344', trim: '#ffbb82' } },
  },
  assets: {
    sky: ['#151c2d', '#354654', '#17232e'], mountains: ['#273440', '#33404a'], floor: ['#54616a', '#303c47', '#151d2b'],
    orb: ['#efbc7a', '#201e2a'], clouds: ['#73828622', '#39495744'], banner: '#275f67', weather: 'dawn',
    fighters: { nera: { cloth: '#dddac5', dark: '#224953', trim: '#9dfff1' }, kael: { cloth: '#3e3943', dark: '#292d39', trim: '#ffc17e' } },
  },
  quality: {
    sky: ['#08191f', '#254348', '#12272b'], mountains: ['#183139', '#203c42'], floor: ['#546267', '#263c40', '#0c1e25'],
    orb: ['#ece9cf', '#9cbeb6'], clouds: ['#a4d9ce18', '#345c6630'], banner: '#356b67', weather: 'dawn',
    fighters: { nera: { cloth: '#e5e3ca', dark: '#224c52', trim: '#a4f3dc' }, kael: { cloth: '#343d45', dark: '#202f3b', trim: '#efbd7f' } },
  },
};
