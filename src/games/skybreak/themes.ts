import type { ThemeModes } from '../../common/ui/theme-select.ts';
import type { FlightArt } from './art-pack.ts';
import { auroraFleet } from './art/aurora-fleet.ts';

export interface FlightTheme {
  readonly name: string;
  readonly scene: 'ocean' | 'orbit';
  readonly art?: FlightArt;
  readonly quality?: { readonly backdrop: string };
  readonly palette: {
    readonly background: string; readonly haze: string; readonly nebula: string;
    readonly planet: string; readonly atmosphere: string; readonly accent: string;
    readonly player: string; readonly enemy: string; readonly armor: string;
  };
}
export const themes: ThemeModes<FlightTheme> = {
  normal: {
    name: 'Pacific Run', scene: 'ocean',
    palette: { background: '#051724', haze: '#09516b', nebula: '#083953', planet: '#357e6d', atmosphere: '#a8e9ef',
      accent: '#a8e9ef', player: '#eaf6e9', enemy: '#f17c67', armor: '#526b7c' },
  },
  assets: auroraFleet,
  quality: {
    name: 'Orbital Foundry', scene: 'orbit',
    quality: { backdrop: new URL('./art/orbital-foundry/backdrop.webp', import.meta.url).href },
    palette: { background: '#030b13', haze: '#10343e', nebula: '#1d5860', planet: '#27545b', atmosphere: '#8edfe6',
      accent: '#9ce9e4', player: '#e8f3ed', enemy: '#e79c75', armor: '#526675' },
  },
};
