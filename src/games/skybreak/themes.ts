import type { FlightArt } from './art-pack.ts';
import localThemes from './local-skybreak.ts';

export interface FlightTheme {
  readonly name: string;
  readonly description: string;
  readonly scene: 'ocean' | 'orbit' | 'rift';
  readonly art?: FlightArt;
  readonly palette: {
    readonly background: string; readonly haze: string; readonly nebula: string;
    readonly planet: string; readonly atmosphere: string; readonly accent: string;
    readonly player: string; readonly enemy: string; readonly armor: string;
  };
}
export const deepSpace: FlightTheme = {
  name: 'Deep Space', scene: 'orbit',
  description: 'A blue gas giant, distant orbital stations and luminous starfighters.',
  palette: { background: '#050916', haze: '#111d38', nebula: '#394477', planet: '#264d73', atmosphere: '#8bcaff',
    accent: '#a8dbff', player: '#e5f7ff', enemy: '#eb9bba', armor: '#4d5d80' },
};
export const themes: Readonly<Record<string, FlightTheme>> = {
  pacific: {
    name: 'Pacific Run', scene: 'ocean',
    description: 'The original island sortie: turquoise water, drifting clouds and propeller aircraft.',
    palette: { background: '#051724', haze: '#09516b', nebula: '#083953', planet: '#357e6d', atmosphere: '#a8e9ef',
      accent: '#a8e9ef', player: '#eaf6e9', enemy: '#f17c67', armor: '#526b7c' },
  },
  'deep-space': deepSpace,
  ...localThemes,
};
