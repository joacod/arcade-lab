/** Authored gameplay values, independent of artwork and browser dimensions. */
export type Pattern = 'straight' | 'crossing' | 'swoop';
export const flight = {
  width: 480, height: 800, duration: 72,
  player: { speed: 300, radius: 10, health: 3, lives: 3, fireInterval: 0.14, bulletSpeed: 760 },
  evade: { duration: 0.65, recharge: 7 }, damageImmunity: 1.15, respawnImmunity: 2.5,
} as const;
export const aircraft = {
  straight: { health: 2, radius: 17, speed: 112, score: 100, fireInterval: 2.6, bulletSpeed: 170 },
  crossing: { health: 2, radius: 15, speed: 136, score: 150, fireInterval: 2.9, bulletSpeed: 185 },
  swoop: { health: 3, radius: 21, speed: 104, score: 200, fireInterval: 2.5, bulletSpeed: 155 },
} as const;
export interface Wave { at: number; pattern: Pattern; count: number; side: -1 | 1; label: string }
export const waves: readonly Wave[] = [
  { at: 1, pattern: 'straight', count: 5, side: 1, label: 'First contact' },
  { at: 7, pattern: 'crossing', count: 4, side: 1, label: 'Crosswind' },
  { at: 13, pattern: 'swoop', count: 5, side: -1, label: 'Turning tide' },
  { at: 20, pattern: 'straight', count: 5, side: -1, label: 'Blue horizon' },
  { at: 26, pattern: 'crossing', count: 5, side: -1, label: 'Crosswind' },
  { at: 32, pattern: 'swoop', count: 5, side: 1, label: 'Whitecaps' },
  { at: 39, pattern: 'straight', count: 6, side: 1, label: 'Open water' },
  { at: 45, pattern: 'crossing', count: 5, side: 1, label: 'Crosswind' },
  { at: 51, pattern: 'swoop', count: 6, side: -1, label: 'Last passage' },
  { at: 58, pattern: 'straight', count: 6, side: -1, label: 'Break for home' },
];
