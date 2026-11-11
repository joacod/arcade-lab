import { createCooldowns } from '../../engine/cooldowns.ts';
import type { GameEvent } from './game-state.ts';
import { createGameAudio } from '../../engine/browser/audio.ts';
import { clearingRecipes } from './sound-recipes.ts';

type Cue = keyof typeof clearingRecipes;
const priority: readonly Cue[] = ['victory', 'defeat', 'evolution', 'upgrade', 'elite', 'player-hit', 'pickup', 'pulse', 'halo', 'arc_spark', 'shard', 'spark', 'enemy-defeated', 'enemy-hit'];
// Busy combat stays quiet enough for decisions and danger to read.
const interval: Partial<Record<Cue, number>> = { pickup: 0.09, 'enemy-hit': 0.09, 'enemy-defeated': 0.12, halo: 0.16, spark: 0.065, 'arc_spark': 0.065, shard: 0.09 };
export function clearingCue(event: GameEvent): Cue {
  if (event.type === 'player-hit' && event.damage === 0) return 'halo';
  return event.type === 'outcome' ? event.outcome : event.type === 'shot' ? event.weapon : event.type;
}

/** Fantasy sound identity and event policy belong to Clearing, outside simulation. */
export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(clearingRecipes, onStatus);
  const next = createCooldowns<Cue>();
  return {
    ...audio,
    reset() { next.clear(); audio.reset(); },
    consume(events: readonly GameEvent[]) {
      const frame = new Set<Cue>();
      let pickups = 0;
      for (const event of events) {
        const cue = clearingCue(event);
        frame.add(cue);
        if (event.type === 'pickup') pickups++;
      }
      // Terminal/milestone cues replace combat tails rather than competing with them.
      for (const cue of ['victory', 'defeat', 'evolution', 'upgrade'] as const) {
        if (frame.has(cue)) { audio.reset(); next.clear(); audio.play(cue); return; }
      }
      next.advance(audio.time);
      let admitted = 0;
      for (const cue of priority) {
        if (!frame.has(cue) || !next.allows(cue) || admitted >= 5) continue;
        const options = cue === 'pickup' ? { parameters: { cluster: Math.min(1, Math.max(0, (pickups - 1) / 5)) } } : undefined;
        if (audio.play(cue, options)) { next.record(cue, (interval[cue] ?? 0)); admitted++; }
      }
    },
  };
}
