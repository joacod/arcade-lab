import type { ThemeModes } from '../../common/ui/theme-select.ts';
import type { FlightArt } from './art-pack.ts';
import { auroraFleet } from './art/aurora-fleet.ts';

export interface FlightTheme {
  readonly name: string;
  readonly scene: 'ocean' | 'orbit';
  readonly art?: FlightArt;
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
};
