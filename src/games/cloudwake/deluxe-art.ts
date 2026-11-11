/** Loaded only when Deluxe is selected. */
export const urls = {
  courier: new URL('./art/sunward-radiance/courier.webp', import.meta.url).href,
  pillar: new URL('./art/sunward-radiance/pillar.webp', import.meta.url).href,
  mine: new URL('./art/sunward-radiance/mine.webp', import.meta.url).href,
  fragment: new URL('./art/sunward-radiance/fragment.webp', import.meta.url).href,
  cloud: new URL('./art/sunward-radiance/cloud.webp', import.meta.url).href,
  sky: new URL('./art/sunward-radiance/sky.webp', import.meta.url).href,
  checkpoint: new URL('./art/sunward-radiance/checkpoint.webp', import.meta.url).href,
};
export const sizes = { courier: [1024, 1024], pillar: [192, 480], mine: [256, 256], fragment: [192, 288], cloud: [640, 252], sky: [1536, 1024], checkpoint: [1024, 1024] } as const;
