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
export const appearances = { verdant: 'Verdant clockwork', frost: 'Frostbound bells' } as const;
export type Appearance = keyof typeof appearances;
export const themes: Readonly<Record<Appearance, HollowTheme>> = {
  verdant: {
    districts: {
      aqueduct: { environment: 'garden', sky: '#143b42', middle: '#28574f', deep: '#0c252c', stone: '#36504a', edge: '#9eb48a', light: '#c2e6ae' },
      emberworks: { environment: 'foundry', sky: '#302a40', middle: '#65423e', deep: '#211e30', stone: '#514346', edge: '#d7a676', light: '#ffc28c' },
      belfry: { environment: 'belfry', sky: '#181e3b', middle: '#37375b', deep: '#121c32', stone: '#3c455e', edge: '#a8bdd0', light: '#c5c7ff' },
    },
    foliage: ['#548b72', '#376956'], brass: '#b7915f', scarf: '#71c4b1', atmosphere: 'motes',
  },
  frost: {
    districts: {
      aqueduct: { environment: 'garden', sky: '#172c50', middle: '#506a86', deep: '#16283e', stone: '#3c5973', edge: '#c0e9ef', light: '#a9eaf4' },
      emberworks: { environment: 'foundry', sky: '#252d4d', middle: '#66576d', deep: '#20273f', stone: '#596079', edge: '#d8d8ea', light: '#ffccaa' },
      belfry: { environment: 'belfry', sky: '#101b38', middle: '#38466d', deep: '#111c34', stone: '#445776', edge: '#d4ecff', light: '#b4d5ff' },
    },
    foliage: ['#90bcc9', '#4a7789'], brass: '#9caec7', scarf: '#e5a4b3', atmosphere: 'snow',
  },
};
