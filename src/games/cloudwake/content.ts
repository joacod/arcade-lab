/** Physical geometry and tuning. Artwork never changes these values. */
export const flight = {
  height: 600, playerX: 112, minX: 52, maxX: 236, radius: 16, ceiling: 30, floor: 570,
  gravity: 790, lift: 960, braking: 380, upLimit: 255, downLimit: 275,
  strafeSpeed: 210, strafeAccel: 1680,
  startSpeed: 205, maxSpeed: 435, speedStep: 46, speedRise: 24,
  minimumView: 560, reaction: .28, fragmentPoints: 25, lives: 3, mineRadius: 35,
  shieldFragments: 30, shieldSeconds: 5,
} as const;
/** Pickup silhouette covers helmet/rider/scooter but excludes scarf and exhaust.
 * Its convex envelope is separate from the forgiving hazard-contact radius. */
export const pickupHull = [
  { x: -13, y: -38 }, { x: 8, y: -38 }, { x: 15, y: -23 },
  { x: 29, y: 2 }, { x: 29, y: 16 }, { x: 17, y: 26 },
  { x: -28, y: 25 }, { x: -40, y: 15 }, { x: -38, y: 3 },
] as const;
export const fragmentShape = { halfWidth: 10, halfHeight: 15 } as const;
export const pickupRear = Math.min(...pickupHull.map(point => point.x));
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
/** Speed steps after 2 legs, then 3 more, then 4 more, and so on. */
export function speedAt(leg: number) {
  let tier = 0, boundary = 2;
  while (leg >= boundary && flight.startSpeed + tier * flight.speedStep < flight.maxSpeed) {
    tier++; boundary += tier + 2;
  }
  return Math.min(flight.maxSpeed, flight.startSpeed + tier * flight.speedStep);
}
export const multiplierAt = (chain: number) => Math.min(4, 1 + Math.floor(chain / 5));
/** World units per CSS pixel. The slide gesture uses this so the camera cannot change its meaning. */
export const viewScale = (width: number, height: number) => Math.min(width / flight.minimumView, height / flight.height);

export interface Flyer { x: number; y: number; vx: number; vy: number }
/** Screen-slot motion. Scroll distance stays on the route clock. */
export function slide(player: Flyer, strafe: number, drag: number, dt: number) {
  if (drag !== 0) {
    player.x = clamp(player.x + drag, flight.minX, flight.maxX);
    player.vx = 0;
    return;
  }
  const target = clamp(strafe, -1, 1) * flight.strafeSpeed;
  const maxStep = flight.strafeAccel * dt;
  player.vx += clamp(target - player.vx, -maxStep, maxStep);
  player.x += player.vx * dt;
  if (player.x < flight.minX) { player.x = flight.minX; player.vx = Math.max(0, player.vx); }
  if (player.x > flight.maxX) { player.x = flight.maxX; player.vx = Math.min(0, player.vx); }
}
/** The same integration is used by the run and the route feasibility check. */
export function fly(player: { y: number; vy: number }, thrust: boolean, dt: number) {
  const acceleration = thrust ? -flight.lift - (player.vy > 0 ? flight.braking : 0)
    : flight.gravity + (player.vy < 0 ? flight.braking : 0);
  player.vy = clamp(player.vy + acceleration * dt, -flight.upLimit, flight.downLimit);
  player.y += player.vy * dt;
  // Cloud banks cushion the boundaries; the crystal structures are the danger.
  if (player.y < flight.ceiling) { player.y = flight.ceiling; player.vy = Math.max(0, player.vy); }
  if (player.y > flight.floor) { player.y = flight.floor; player.vy = Math.min(0, player.vy); }
}
