import { createCooldowns } from '../../engine/cooldowns.ts';
import { createGameAudio } from '../../engine/browser/audio.ts';
import { blastRecipes } from './sound-recipes.ts';
import type { BlastEvent, Player } from './state.ts';
type Cue = keyof typeof blastRecipes;
const order: readonly Cue[] = ['victory', 'defeat', 'rescue', 'extract', 'death', 'alarm', 'checkpoint', 'hurt', 'explosion', 'launch', 'chain', 'kill', 'throw', 'switch', 'shot', 'terrain', 'hit', 'impact', 'jump'];
const interval: Partial<Record<Cue, number>> = { explosion: .1, shot: .07, chain: .2, impact: .13, terrain: .18, hit: .09, kill: .1 };
export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(blastRecipes, onStatus), next = createCooldowns<Cue>();
  return { ...audio,
    reset() { next.clear(); audio.reset(); },
    consume(events: readonly BlastEvent[], player: Player) {
      next.advance(audio.time);
      const milestone = events.find(e => ['victory', 'defeat', 'rescue', 'extract', 'death'].includes(e.type));
      if (milestone) { audio.reset(); next.clear(); audio.play(milestone.type); return; }
      // Coalesce each cue per batch, choose priority first and admit at most four voices.
      const batch = new Set(events.filter(e => Math.abs(e.x - player.x) < 700).map(e => e.type));
      let admitted = 0;
      for (const cue of order) {
        if (!batch.has(cue) || !next.allows(cue) || admitted >= 4) continue;
        if (audio.play(cue)) { next.record(cue, (interval[cue] ?? .12)); admitted++; }
      }
    },
  };
}
