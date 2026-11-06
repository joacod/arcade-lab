import type { District } from './content.ts';
interface DistrictStyle {
  readonly environment: 'garden' | 'foundry' | 'belfry';
  readonly sky: string; readonly middle: string; readonly deep: string;
  readonly stone: string; readonly edge: string; readonly light: string;
}
export interface HollowTheme {
  readonly districts: Readonly<Record<District, DistrictStyle>>;
}
export type Appearance = 'arcade' | 'deluxe';
export const appearanceNames: Readonly<Record<Appearance, string>> = {
  arcade: 'Porcelain Bellgarden', deluxe: 'Lumen Conservatory',
};
export const themes: Readonly<Record<Appearance, HollowTheme>> = {
  arcade: {
    districts: {
      aqueduct: { environment: 'garden', sky: '#1d304c', middle: '#487880', deep: '#203c51', stone: '#456e78', edge: '#fff0cf', light: '#bfe8d8' },
      emberworks: { environment: 'foundry', sky: '#332d4a', middle: '#86616c', deep: '#352e4a', stone: '#80646e', edge: '#fff0cf', light: '#f2c59e' },
      belfry: { environment: 'belfry', sky: '#1c2545', middle: '#555c89', deep: '#242d50', stone: '#656e99', edge: '#fff0cf', light: '#d9ddf5' },
    },
  },
  deluxe: {
    districts: {
      aqueduct: { environment: 'garden', sky: '#071d2b', middle: '#264b51', deep: '#091f29', stone: '#254a4a', edge: '#bcdbc1', light: '#85d9be' },
      emberworks: { environment: 'foundry', sky: '#201b2b', middle: '#65434b', deep: '#231e2c', stone: '#50414b', edge: '#efc994', light: '#efae73' },
      belfry: { environment: 'belfry', sky: '#101a33', middle: '#404768', deep: '#141e34', stone: '#354359', edge: '#cdd7ef', light: '#afbdf5' },
    },
  },
};
