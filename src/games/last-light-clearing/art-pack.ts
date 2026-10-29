/** Game-owned artwork. All sizes here are visual, never physical collision bodies. */
export type ActorRole = 'keeper' | 'crawler' | 'elite';
export type FrameRect = readonly [x: number, y: number, width: number, height: number];
export interface ArtFrame { readonly image: string; readonly rect: FrameRect }
export interface Clip {
  readonly frames: readonly ArtFrame[];
  readonly frameSeconds: number;
  readonly loop: boolean;
}
export type Direction = 'up' | 'down' | 'left' | 'right';
export interface ActorArt {
  readonly clips: { readonly idle: Clip; readonly move: Clip; readonly hit?: Clip; readonly attack?: Clip };
  /** Normalized pivot in every frame and authored world-space frame footprint. */
  readonly anchor: readonly [number, number];
  readonly footprint: readonly [number, number];
  readonly orientation: 'rotate' | 'mirror' | { readonly directions: Readonly<Record<Direction, { readonly idle: Clip; readonly move: Clip }>> };
}
export interface Decoration {
  readonly clip: Clip;
  readonly footprint: readonly [number, number];
  readonly anchor: readonly [number, number];
}
export interface ArtPack {
  readonly images: Readonly<Record<string, string>>;
  readonly sampling: 'nearest' | 'smooth';
  readonly actors: Readonly<Record<ActorRole, ActorArt>>;
  readonly environment?: {
    readonly tileSize: number;
    readonly groundOpacity?: number;
    readonly border?: Decoration;
    readonly ground: readonly Decoration[];
    readonly perimeter: readonly Decoration[];
  };
}
export type ImageDimensions = Readonly<Record<string, { readonly width: number; readonly height: number }>>;
export const frame = (image: string, rect: FrameRect): ArtFrame => ({ image, rect });
export const still = (image: string, rect: FrameRect): Clip => ({ frames: [frame(image, rect)], frameSeconds: 1, loop: true });
/** A single row of an inspected regular sheet, with explicit count and stride. */
export function row(image: string, x: number, y: number, width: number, height: number,
  count: number, frameSeconds: number, stride = width): Clip {
  return { frames: Array.from({ length: count }, (_, i) => frame(image, [x + i * stride, y, width, height])), frameSeconds, loop: true };
}
export function clipFrame(clip: Clip, age: number): ArtFrame {
  const index = Math.floor(Math.max(0, age) / clip.frameSeconds);
  return clip.frames[clip.loop ? index % clip.frames.length : Math.min(index, clip.frames.length - 1)]!;
}
export function validateArtPack(pack: ArtPack, dimensions: ImageDimensions): string[] {
  const errors: string[] = [];
  for (const [id, url] of Object.entries(pack.images)) if (!url.trim() || !dimensions[id]) errors.push(`${id}: missing image`);
  function clip(value: Clip, path: string) {
    if (!value.frames.length || !Number.isFinite(value.frameSeconds) || value.frameSeconds <= 0) errors.push(`${path}: invalid timing or empty clip`);
    for (const { image, rect: [x, y, w, h] } of value.frames) {
      const size = dimensions[image];
      if (!(image in pack.images) || !size || ![x, y, w, h].every(Number.isFinite)
        || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > size.width || y + h > size.height) errors.push(`${path}: invalid frame (${image})`);
    }
  }
  function geometry(value: Pick<ActorArt, 'anchor' | 'footprint'>, path: string) {
    if (!value.anchor.every(v => Number.isFinite(v) && v >= 0 && v <= 1)
      || !value.footprint.every(v => Number.isFinite(v) && v > 0)) errors.push(`${path}: invalid anchor or footprint`);
  }
  for (const role of ['keeper', 'crawler', 'elite'] as const) {
    const actor = pack.actors[role];
    if (!actor) { errors.push(`${role}: missing actor`); continue; }
    geometry(actor, role);
    for (const [name, value] of Object.entries(actor.clips)) clip(value, `${role}.${name}`);
    if (typeof actor.orientation === 'object') for (const direction of ['up', 'down', 'left', 'right'] as const) {
      const clips = actor.orientation.directions[direction];
      if (!clips) errors.push(`${role}.${direction}: missing clips`);
      else { clip(clips.idle, `${role}.${direction}.idle`); clip(clips.move, `${role}.${direction}.move`); }
    }
  }
  if (pack.environment) {
    if (!Number.isFinite(pack.environment.tileSize) || pack.environment.tileSize <= 0 || !pack.environment.ground.length) errors.push('environment: invalid tiles');
    if (pack.environment.groundOpacity !== undefined && (!Number.isFinite(pack.environment.groundOpacity) || pack.environment.groundOpacity < 0 || pack.environment.groundOpacity > 1)) errors.push('environment: invalid ground opacity');
    const decorations = [...pack.environment.ground, ...pack.environment.perimeter];
    if (pack.environment.border) decorations.push(pack.environment.border);
    for (const [i, item] of decorations.entries()) {
      geometry(item, `decoration ${i}`); clip(item.clip, `decoration ${i}`);
    }
  }
  return errors;
}
