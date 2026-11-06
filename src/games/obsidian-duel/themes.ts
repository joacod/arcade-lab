import type { FighterId } from './content.ts';
export interface DuelTheme {
  readonly fighters: Readonly<Record<FighterId, { readonly trim: string }>>;
}
export type Appearance = 'arcade' | 'deluxe';
export const appearanceNames: Record<Appearance, string> = { arcade: 'Eclipse Foundry', deluxe: 'Moonfall Sanctum' };
export const themes: Readonly<Record<Appearance, DuelTheme>> = {
  arcade: {
    fighters: { nera: { trim: '#9dfff1' }, kael: { trim: '#ffc17e' } },
  },
  deluxe: {
    fighters: { nera: { trim: '#a4f3dc' }, kael: { trim: '#efbd7f' } },
  },
};
