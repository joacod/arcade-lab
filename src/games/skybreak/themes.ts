import type { FlightArt } from './art-pack.ts';
import { aircraftArt } from './art/aircraft.ts';

export interface FlightTheme {
  readonly name: string;
  readonly art: FlightArt;
  readonly finish: 'pixel' | 'painted';
  readonly scenery: { readonly url: string; readonly width: number; readonly height: number; readonly speed: number; readonly overlap: number };
  readonly palette: {
    readonly background: string;
    readonly sea: readonly [string,string,string];
    readonly accent: string;
  };
}
export type Appearance = 'arcade' | 'deluxe';
export const themes: Readonly<Record<Appearance, FlightTheme>> = {
  arcade: {
    name: 'Aurora Fleet', art: aircraftArt('arcade'), finish: 'pixel',
    scenery: { url: new URL('./art/coastal-sortie/reef-route.svg', import.meta.url).href, width: 480, height: 1600, speed: 96, overlap: 0 },
    palette: {background:'#07202c',sea:['#203d43','#35665e','#1f4044'],accent:'#e9d5a3'},
  },
  deluxe: {
    name: 'Tempest Coast', art: aircraftArt('deluxe'),
    finish: 'painted',
    scenery: { url: new URL('./art/tempest-coast/backdrop.webp', import.meta.url).href, width: 1024, height: 1536, speed: 96, overlap: 80 },
    palette: { background: '#030b13', sea:['#083039','#12424a','#092c36'],
      accent: '#9ce9e4' },
  },
};
