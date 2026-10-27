import { createGameAudio } from '../browser/audio.ts';
import type { BrawlerEvent } from './game.ts';
import { circuitRecipes } from './sound-recipes.ts';
type Cue = keyof typeof circuitRecipes;
export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(circuitRecipes, onStatus), next = new Map<Cue, number>();
  let lastTime = 0;
  function cue(e: BrawlerEvent): Cue | null {
    if (e.type === 'swing') return e.player ? 'swing' : null;
    if (e.type === 'miss') return null;
    if (e.type === 'hit') return e.attack === 'heavy' ? 'heavy' : e.attack === 'finisher' ? 'finisher' : e.attack === 'air' ? 'air' : 'hit';
    return e.type;
  }
  return { ...audio,
    reset() { next.clear(); audio.reset(); },
    consume(events: readonly BrawlerEvent[]) {
      const now = audio.time; if (now < lastTime) next.clear(); lastTime = now;
      const terminal = events.find(e => e.type === 'victory' || e.type === 'gameover' || e.type === 'stage');
      if (terminal) { audio.reset(); next.clear(); audio.play(terminal.type as Cue); return; }
      // Coalesce simultaneous contacts and admit the strongest feedback before quiet movement.
      const batch = new Map<Cue, number>();
      for (const e of events) { const key = cue(e); if (key) batch.set(key, Math.max(batch.get(key) ?? 0, Math.min(1, e.strength))); }
      for (const key of ['damage', 'respawn', 'boss', 'finisher', 'heavy', 'air', 'hit', 'ko', 'pickup', 'clear', 'encounter', 'swing', 'jump'] as const) {
        if (!batch.has(key) || now < (next.get(key) ?? 0)) continue;
        if (audio.play(key, ['hit', 'heavy', 'finisher', 'air', 'damage'].includes(key) ? { parameters: { strength: batch.get(key)! } } : undefined)) next.set(key, now + (key === 'swing' ? .07 : key === 'ko' ? .12 : .06));
      }
    },
  };
}
