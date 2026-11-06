import { blastLayouts, type BlastArtLayout } from './sprite-art.ts';
export interface BlastTheme {
  readonly art: BlastArtLayout;
  readonly finish: 'pixel' | 'painted';
  readonly sky: readonly [string, string, string];
  readonly foundrySky: readonly [string, string, string];
  /** Material silhouettes and warning colors remain readable in every appearance. */
  readonly structure: readonly [string, string];
  readonly masonry: readonly [string, string];
  readonly armor: readonly [string, string];
  readonly ledge: string;
}
export type Appearance = 'arcade' | 'deluxe';
export const appearanceNames = { arcade: 'Ember Coast', deluxe: 'Ember Reforged' } as const;
export const themes: Readonly<Record<Appearance, BlastTheme>> = {
  arcade: {
    art: blastLayouts.arcade,
    finish: 'pixel',
    sky: ['#263b50', '#cf886b', '#243e48'], foundrySky: ['#222f43', '#a46654', '#233942'], structure: ['#192f40', '#354d59'], masonry: ['#795844', '#ba9561'], armor: ['#67473f', '#9c6850'], ledge: '#9fb9ad',
  },
  deluxe: {
    art: blastLayouts.deluxe,
    finish: 'painted',
    sky: ['#243b4b', '#d59b7b', '#294652'], foundrySky: ['#202f40', '#a96e50', '#253d47'], structure: ['#233e4b', '#496570'], masonry: ['#85624a', '#c49b6c'], armor: ['#6f4b3d', '#ad7754'], ledge: '#b7c6b1',
  },
};
