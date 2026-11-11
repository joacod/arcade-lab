/** Physical geometry and tuning. Artwork never changes these values. */
export const flight = {
  height: 600, playerX: 112, radius: 16, ceiling: 30, floor: 570,
  gravity: 790, lift: 960, braking: 380, upLimit: 255, downLimit: 275,
  startSpeed: 205, maxSpeed: 325, rampSeconds: 90,
  minimumView: 560, reaction: .28, pickupRadius: 18, fragmentPoints: 25,
} as const;
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export const speedAt = (elapsed: number) => flight.startSpeed + (flight.maxSpeed - flight.startSpeed) * Math.min(1, elapsed / flight.rampSeconds);

export interface Flyer { y: number; vy: number }
/** The same integration is used by the run and the route feasibility check. */
export function fly(player: Flyer, thrust: boolean, dt: number) {
  const acceleration = thrust ? -flight.lift - (player.vy > 0 ? flight.braking : 0)
    : flight.gravity + (player.vy < 0 ? flight.braking : 0);
  player.vy = clamp(player.vy + acceleration * dt, -flight.upLimit, flight.downLimit);
  player.y += player.vy * dt;
  // Cloud banks cushion the boundaries; the crystal structures are the danger.
  if (player.y < flight.ceiling) { player.y = flight.ceiling; player.vy = Math.max(0, player.vy); }
  if (player.y > flight.floor) { player.y = flight.floor; player.vy = Math.min(0, player.vy); }
}
