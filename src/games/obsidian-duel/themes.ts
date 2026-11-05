import type { FighterId } from './content.ts';

export interface DuelTheme {
  readonly sky: readonly [string, string];
  readonly mountain: string;
  readonly floor: string;
  readonly fighters: Readonly<Record<FighterId, { readonly cloth: string; readonly trim: string }>>;
}
export type Appearance = 'normal' | 'assets' | 'quality';
export const appearanceNames: Record<Appearance, string> = { normal: 'Tempest citadel', assets: 'Eclipse Foundry', quality: 'Moonfall Sanctum' };
export const themes: Readonly<Record<Appearance, DuelTheme>> = {
  normal: {
    sky: ['#16192f', '#49414f'], mountain: '#252b40', floor: '#39333f',
    fighters: { nera: { cloth: '#e6dbc0', trim: '#87f1db' }, kael: { cloth: '#39373a', trim: '#ffbb82' } },
  },
  assets: {
    sky: ['#151c2d', '#354654'], mountain: '#273440', floor: '#303c47',
    fighters: { nera: { cloth: '#dddac5', trim: '#9dfff1' }, kael: { cloth: '#3e3943', trim: '#ffc17e' } },
  },
  quality: {
    sky: ['#08191f', '#254348'], mountain: '#183139', floor: '#263c40',
    fighters: { nera: { cloth: '#e5e3ca', trim: '#a4f3dc' }, kael: { cloth: '#343d45', trim: '#efbd7f' } },
  },
};
