import { createCooldowns } from '../../engine/cooldowns.ts';
import { createGameAudio } from '../../engine/browser/audio.ts';
import type { DuelEvent } from './game.ts';
import { duelRecipes } from './sound-recipes.ts';
type Cue = keyof typeof duelRecipes;
export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(duelRecipes, onStatus),
    next = createCooldowns<Cue>();
  return {
    ...audio,
    reset() {
      next.clear();
      audio.reset();
    },
    consume(events: readonly DuelEvent[]) {
      next.advance(audio.time);
      const terminal = events.find(e => ['victory', 'defeat', 'ko', 'timeout'].includes(e.type));
      if (terminal) {
        audio.reset();
        next.clear();
        audio.play(terminal.type);
        return;
      }
      const batch = new Set(events.map(e => e.type));
      for (const key of ['knockdown', 'heavyHit', 'hit', 'block', 'special', 'fight', 'count', 'heavySwing', 'swing'] as const) {
        if (!batch.has(key) || !next.allows(key)) continue;
        if (audio.play(key)) next.record(key, .065);
      }
    }
  };
}
