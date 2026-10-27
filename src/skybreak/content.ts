/** Authored gameplay values, independent of artwork and browser dimensions. */
export type Pattern = 'straight' | 'crossing' | 'swoop' | 'interceptor';
export type PickupKind = 'power' | 'spread' | 'repair';
export const flight = {
  width: 480, height: 800, duration: 168,
  player: { speed: 300, radius: 10, health: 3, lives: 3, fireInterval: 0.14, bulletSpeed: 760 },
  evade: { duration: 0.65, recharge: 5.5 }, damageImmunity: 1.15, respawnImmunity: 2.5,
  spreadDuration: 24, pickupRadius: 24, pickupSpeed: 80,
} as const;
export const fortress = { at: 112, entrance: 3, health: 420, defeatDuration: 2.8, radius: 38, engineRadius: 25 } as const;
export const aircraft = {
  straight: { health: 2, radius: 17, speed: 112, score: 100, fireInterval: 2.6, bulletSpeed: 170 },
  crossing: { health: 3, radius: 15, speed: 136, score: 150, fireInterval: 2.9, bulletSpeed: 185 },
  swoop: { health: 4, radius: 21, speed: 104, score: 200, fireInterval: 2.5, bulletSpeed: 155 },
  interceptor: { health: 5, radius: 18, speed: 180, score: 300, fireInterval: 1.8, bulletSpeed: 215 },
} as const;
export interface Wave { at: number; pattern: Pattern; count: number; side: -1 | 1; label: string }
export const waves: readonly Wave[] = [
  { at: 1, pattern: 'straight', count: 5, side: 1, label: 'First contact' },
  { at: 8, pattern: 'crossing', count: 4, side: 1, label: 'Crosswind east' },
  { at: 15, pattern: 'swoop', count: 5, side: -1, label: 'Turning tide' },
  { at: 23, pattern: 'straight', count: 6, side: -1, label: 'Blue horizon' },
  { at: 30, pattern: 'crossing', count: 5, side: -1, label: 'Crosswind west' },
  { at: 37, pattern: 'interceptor', count: 3, side: 1, label: 'Needle squadron' },
  { at: 44, pattern: 'swoop', count: 6, side: 1, label: 'Whitecaps' },
  { at: 51, pattern: 'straight', count: 7, side: 1, label: 'Open water' },
  { at: 58, pattern: 'crossing', count: 5, side: 1, label: 'Converging wings' },
  { at: 65, pattern: 'interceptor', count: 4, side: -1, label: 'Red needles' },
  { at: 72, pattern: 'swoop', count: 6, side: -1, label: 'Storm front' },
  { at: 79, pattern: 'crossing', count: 6, side: -1, label: 'Tight crossing' },
  { at: 86, pattern: 'interceptor', count: 4, side: 1, label: 'High pursuit' },
  { at: 93, pattern: 'straight', count: 7, side: -1, label: 'Iron curtain' },
  { at: 100, pattern: 'swoop', count: 6, side: 1, label: 'Last escort' },
];
/** Guaranteed supply drops reward positioning, without depending on a lucky kill. */
export const supplies: readonly { at: number; kind: PickupKind; x: number }[] = [
  { at: 10, kind: 'power', x: 240 }, { at: 25, kind: 'spread', x: 150 },
  { at: 40, kind: 'repair', x: 330 }, { at: 54, kind: 'power', x: 240 },
  { at: 69, kind: 'spread', x: 330 }, { at: 83, kind: 'repair', x: 150 },
  { at: 97, kind: 'power', x: 240 }, { at: 109, kind: 'spread', x: 240 },
  { at: 132, kind: 'repair', x: 240 },
];
