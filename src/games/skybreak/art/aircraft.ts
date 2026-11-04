import type { FlightArt, FlightSprite } from '../art-pack.ts';
const sprite=(image:string,width:number,height:number,footprint:FlightSprite['footprint']):FlightSprite => ({image,rect:[0,0,width,height],footprint,frames:6,stride:width,seconds:.09,rotation:0});
const images = {
  normal: {
    fighter: new URL('./aircraft/normal-fighter.svg',import.meta.url).href,
    scout: new URL('./aircraft/normal-scout.svg',import.meta.url).href,
    raider: new URL('./aircraft/normal-raider.svg',import.meta.url).href,
    gunship: new URL('./aircraft/normal-gunship.svg',import.meta.url).href,
    interceptor: new URL('./aircraft/normal-interceptor.svg',import.meta.url).href,
    flagship: new URL('./aircraft/normal-flagship.svg',import.meta.url).href,
  },
  assets: {
    fighter: new URL('./aircraft/assets-fighter.svg',import.meta.url).href,
    scout: new URL('./aircraft/assets-scout.svg',import.meta.url).href,
    raider: new URL('./aircraft/assets-raider.svg',import.meta.url).href,
    gunship: new URL('./aircraft/assets-gunship.svg',import.meta.url).href,
    interceptor: new URL('./aircraft/assets-interceptor.svg',import.meta.url).href,
    flagship: new URL('./aircraft/assets-flagship.svg',import.meta.url).href,
  },
  quality: {
    fighter: new URL('./aircraft/quality-fighter.svg',import.meta.url).href,
    scout: new URL('./aircraft/quality-scout.svg',import.meta.url).href,
    raider: new URL('./aircraft/quality-raider.svg',import.meta.url).href,
    gunship: new URL('./aircraft/quality-gunship.svg',import.meta.url).href,
    interceptor: new URL('./aircraft/quality-interceptor.svg',import.meta.url).href,
    flagship: new URL('./aircraft/quality-flagship.svg',import.meta.url).href,
  },
} as const;
export function aircraftArt(mode: keyof typeof images): FlightArt {
 return {images: images[mode],actors:{player:sprite('fighter',64,80,[56,70]),straight:sprite('scout',64,64,[48,62]),crossing:sprite('raider',64,64,[66,58]),swoop:sprite('gunship',64,64,[78,64]),interceptor:sprite('interceptor',64,64,[48,68])},flagship:sprite('flagship',336,168,[336,168])};
}
