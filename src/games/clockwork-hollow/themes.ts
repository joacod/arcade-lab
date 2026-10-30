import type { LevelId } from './content.ts';

interface DistrictStyle {
  readonly environment: 'garden' | 'foundry' | 'belfry';
  readonly sky: string; readonly middle: string; readonly deep: string;
  readonly stone: string; readonly edge: string; readonly light: string;
}
export interface HollowTheme {
  readonly districts: Readonly<Record<LevelId, DistrictStyle>>;
  readonly foliage: readonly [string, string];
  readonly brass: string;
  readonly scarf: string;
  readonly atmosphere: 'motes' | 'snow';
}
export type Appearance = 'normal' | 'assets';
export const themes: Readonly<Record<Appearance, HollowTheme>> = {
  normal: {
    districts: {
      aqueduct: { environment: 'garden', sky: '#143b42', middle: '#28574f', deep: '#0c252c', stone: '#36504a', edge: '#9eb48a', light: '#c2e6ae' },
      emberworks: { environment: 'foundry', sky: '#302a40', middle: '#65423e', deep: '#211e30', stone: '#514346', edge: '#d7a676', light: '#ffc28c' },
      belfry: { environment: 'belfry', sky: '#181e3b', middle: '#37375b', deep: '#121c32', stone: '#3c455e', edge: '#a8bdd0', light: '#c5c7ff' },
    },
    foliage: ['#548b72', '#376956'], brass: '#b7915f', scarf: '#71c4b1', atmosphere: 'motes',
  },
  assets: {
    districts: {
      aqueduct: { environment: 'garden', sky: '#1d304c', middle: '#487880', deep: '#203c51', stone: '#456e78', edge: '#fff0cf', light: '#bfe8d8' },
      emberworks: { environment: 'foundry', sky: '#332d4a', middle: '#86616c', deep: '#352e4a', stone: '#80646e', edge: '#fff0cf', light: '#f2c59e' },
      belfry: { environment: 'belfry', sky: '#1c2545', middle: '#555c89', deep: '#242d50', stone: '#656e99', edge: '#fff0cf', light: '#d9ddf5' },
    },
    foliage: ['#59b8b2', '#387b83'], brass: '#fff0cf', scarf: '#ec7968', atmosphere: 'motes',
  },
};
