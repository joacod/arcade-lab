export interface BlastTheme {
  readonly finish: 'pixel' | 'painted';
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
}
export type Appearance = 'normal' | 'assets' | 'quality';
export const appearanceNames = { normal: 'Iron coast', assets: 'Ember Coast', quality: 'Ember Reforged' } as const;
export const themes: Readonly<Record<Appearance, BlastTheme>> = {
  normal: {
    finish: 'pixel',
    sky: ['#253f4b', '#ad8465', '#293e42'], foundrySky: ['#202b3a', '#765447', '#293e42'], skyline: ['#394a50', '#2b4248', '#263c42'],
    sun: '#eccd8c', weather: 'ash', structure: ['#1a323d', '#2e4850'], masonry: ['#776f57', '#a1906d'], armor: ['#71594e', '#92705a'], ledge: '#77918a',
  },
  assets: {
    finish: 'pixel',
    sky: ['#263b50', '#cf886b', '#243e48'], foundrySky: ['#222f43', '#a46654', '#233942'], skyline: ['#50606a', '#344e58', '#253e48'],
    sun: '#f2cc8c', weather: 'ash', structure: ['#192f40', '#354d59'], masonry: ['#795844', '#ba9561'], armor: ['#67473f', '#9c6850'], ledge: '#9fb9ad',
  },
  quality: {
    finish: 'painted',
    sky: ['#243b4b', '#d59b7b', '#294652'], foundrySky: ['#202f40', '#a96e50', '#253d47'], skyline: ['#667b83', '#405d68', '#294550'],
    sun: '#f4d9aa', weather: 'ash', structure: ['#233e4b', '#496570'], masonry: ['#85624a', '#c49b6c'], armor: ['#6f4b3d', '#ad7754'], ledge: '#b7c6b1',
  },
};
