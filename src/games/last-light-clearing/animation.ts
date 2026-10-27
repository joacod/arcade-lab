import type { ActorArt, Clip, Direction } from './art-pack.ts';
import type { RunState } from './game-state.ts';
export interface ActorObservation { x: number; y: number; angle: number; moving: boolean; since: number }
/** Observed after each simulation step, never from consecutive render frames. */
export function createAnimationObservations() {
  const actors = new Map<string | number, ActorObservation>();
  function observe(id: string | number, x: number, y: number, time: number) {
    const previous = actors.get(id);
    if (!previous) { actors.set(id, { x, y, angle: -Math.PI / 2, moving: false, since: time }); return; }
    const moving = Math.hypot(x - previous.x, y - previous.y) > 0.00001;
    if (moving !== previous.moving) previous.since = time;
    if (moving) previous.angle = Math.atan2(y - previous.y, x - previous.x);
    previous.x = x; previous.y = y; previous.moving = moving;
  }
  return {
    reset(run: Readonly<RunState>) { actors.clear(); this.observe(run); },
    observe(run: Readonly<RunState>) {
      observe('keeper', run.player.x, run.player.y, run.elapsed);
      const alive = new Set<string | number>(['keeper']);
      for (const enemy of run.enemies) { alive.add(enemy.id); observe(enemy.id, enemy.x, enemy.y, run.elapsed); }
      for (const id of actors.keys()) if (!alive.has(id)) actors.delete(id);
    },
    get(id: string | number) { return actors.get(id)!; },
  };
}
export function actorClip(art: ActorArt, observation: ActorObservation): Clip {
  let clips = art.clips;
  if (typeof art.orientation === 'object') {
    const { angle } = observation;
    const direction: Direction = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
      ? Math.cos(angle) < 0 ? 'left' : 'right' : Math.sin(angle) < 0 ? 'up' : 'down';
    clips = art.orientation.directions[direction];
  }
  return observation.moving ? clips.move : clips.idle;
}

/** Shared clip precedence and active-time origin for both artwork consumers. */
export function actorAnimation(art: ActorArt, observation: ActorObservation, time: number, hitAt?: number, attackAt?: number) {
  const hit = hitAt !== undefined && art.clips.hit && time - hitAt < art.clips.hit.frames.length * art.clips.hit.frameSeconds;
  const attack = attackAt !== undefined && art.clips.attack && time - attackAt < art.clips.attack.frames.length * art.clips.attack.frameSeconds;
  return { clip: hit ? art.clips.hit! : attack ? art.clips.attack! : actorClip(art, observation),
    age: time - (hit ? hitAt! : attack ? attackAt! : observation.since) };
}
