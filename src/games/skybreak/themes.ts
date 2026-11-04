import type { ThemeModes } from '../../common/ui/theme-select.ts';
import type { FlightArt } from './art-pack.ts';
import { aircraftArt } from './art/aircraft.ts';

export interface FlightTheme {
  readonly name: string;
  readonly art?: FlightArt;
  readonly quality?: { readonly backdrop: string };
  readonly palette: {
    readonly background: string;
    readonly sea: readonly [string,string,string];
    readonly accent: string;
    readonly player: string; readonly enemy: string; readonly armor: string;
  };
}
export const themes: ThemeModes<FlightTheme> = {
  normal: {
    name: 'Pacific Run', art: aircraftArt('normal'),
    palette: { background: '#051724', sea:['#083953','#09516b','#082f50'],
      accent: '#a8e9ef', player: '#eaf6e9', enemy: '#f17c67', armor: '#526b7c' },
  },
  assets: {
    name: 'Aurora Fleet',art:aircraftArt('assets'),
    palette: {background:'#07202c',sea:['#203d43','#35665e','#1f4044'],accent:'#e9d5a3',player:'#e8efcf',enemy:'#d68b67',armor:'#526b7c'},
  },
  quality: {
    name: 'Tempest Coast', art: aircraftArt('quality'),
    quality: { backdrop: new URL('./art/tempest-coast/backdrop.webp', import.meta.url).href },
    palette: { background: '#030b13', sea:['#083039','#12424a','#092c36'],
      accent: '#9ce9e4', player: '#e8f3ed', enemy: '#e79c75', armor: '#526675' },
  },
};
