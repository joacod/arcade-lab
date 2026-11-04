/** Tile positions are derived from active run time, so pause and replacement cannot reset travel. */
export function coastalTiles(time: number, speed: number, height: number, overlap: number, viewport = 800) {
  const stride = height - overlap;
  const first = ((Math.max(0, time) * speed) % stride) - stride;
  return Array.from({ length: Math.ceil(viewport / stride) + 2 }, (_, i) => first + i * stride);
}
