/** Artwork and cosmetic values only. Collision geometry belongs to content.ts. */
export interface SpriteDefinition {
  readonly frame: readonly [number, number, number, number];
  readonly anchor: readonly [number, number];
  readonly scale: number;
}
export interface Theme {
  readonly name: string;
  readonly motif: 'grove' | 'crystal';
  readonly source: string;
  readonly sprites: Readonly<Record<'keeper' | 'crawler' | 'elite_crawler', SpriteDefinition>>;
  readonly palette: {
    readonly background: string; readonly floor: string; readonly boundary: string;
    readonly light: string; readonly ground: string; readonly canopy: string;
    readonly spark: string; readonly shard: string; readonly pulse: string; readonly gem: string;
  };
}
export const themes = {
  woodland: {
    name: 'Lanternwood', motif: 'grove', source: new URL('./art/woodland.svg', import.meta.url).href,
    sprites: {
      keeper: { frame: [0, 0, 64, 64], anchor: [32, 32], scale: 0.5 },
      crawler: { frame: [64, 0, 64, 64], anchor: [32, 32], scale: 0.5 },
      elite_crawler: { frame: [128, 0, 64, 64], anchor: [32, 32], scale: 0.75 },
    },
    palette: { background: '#0b171a', floor: '#172e29', boundary: '#708a6c', light: '#f5d58b',
      ground: '#7a9b7440', canopy: '#203d34', spark: '#b7edff', shard: '#d4b7ff', pulse: '#88e0d0', gem: '#9cecaa' },
  },
  moonglass: {
    name: 'Moonglass', motif: 'crystal', source: new URL('./art/moonglass.svg', import.meta.url).href,
    sprites: {
      keeper: { frame: [0, 0, 80, 80], anchor: [40, 40], scale: 0.4 },
      crawler: { frame: [80, 0, 80, 80], anchor: [40, 40], scale: 0.4 },
      elite_crawler: { frame: [160, 0, 80, 80], anchor: [40, 40], scale: 0.6 },
    },
    palette: { background: '#111329', floor: '#202645', boundary: '#7b8ec4', light: '#b6e8ff',
      ground: '#a8b9ef40', canopy: '#30345a', spark: '#b9f6ff', shard: '#ffb8df', pulse: '#bca7ff', gem: '#8eeadf' },
  },
} as const satisfies Record<string, Theme>;
export type ThemeId = keyof typeof themes;
export const visualTiming = { hit: 0.16, defeat: 0.4, shot: 0.1, pulse: 0.3, pickup: 0.3 };
export const MAX_EFFECTS = 128;

export function validateTheme(theme: Theme, width: number, height: number): string[] {
  const errors: string[] = [];
  if (!theme.source.trim()) errors.push('source: required');
  for (const [id, sprite] of Object.entries(theme.sprites)) {
    const [x, y, w, h] = sprite.frame, [ax, ay] = sprite.anchor;
    if (![x, y, w, h, ax, ay, sprite.scale].every(Number.isFinite)
      || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > width || y + h > height
      || ax < 0 || ay < 0 || ax > w || ay > h || sprite.scale <= 0) errors.push(`${id}: invalid frame, anchor or scale`);
  }
  for (const id of ['keeper', 'crawler', 'elite_crawler'] as const) if (!theme.sprites[id]) errors.push(`${id}: missing sprite`);
  return errors;
}
