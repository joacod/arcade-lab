export const themes = {
  arcade: { name: 'The Sunward Route' },
  deluxe: { name: 'Sunward Radiance' },
} as const;
export type Appearance = keyof typeof themes;
