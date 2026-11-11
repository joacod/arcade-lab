import { createCooldowns } from '../../engine/cooldowns.ts';
import { createGameAudio } from '../../engine/browser/audio.ts';
import type { BrawlerEvent } from './game.ts';
import { circuitRecipes } from './sound-recipes.ts';
type Cue = keyof typeof circuitRecipes;
export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(circuitRecipes, onStatus), next = createCooldowns<Cue>();
  function cue(e: BrawlerEvent): Cue | null {
    if (e.type === 'swing') return e.player ? e.attack === 'heavy' || e.attack === 'finisher' ? 'heavySwing' : 'swing' : null;
    if (e.type === 'miss') return null;
    if (e.type === 'hit') return e.attack === 'heavy' ? 'heavy' : e.attack === 'finisher' ? 'finisher' : e.attack === 'air' ? 'air' : 'hit';
    return e.type;
  }
  return { ...audio,
    reset() { next.clear(); audio.reset(); },
    consume(events: readonly BrawlerEvent[]) {
      next.advance(audio.time);
      const terminal = events.find(e => e.type === 'victory' || e.type === 'gameover' || e.type === 'stage');
      if (terminal) { audio.reset(); next.clear(); audio.play(terminal.type as Cue); return; }
      // Coalesce simultaneous contacts and admit the strongest feedback before quiet movement.
      const batch = new Map<Cue, number>();
      for (const e of events) { const key = cue(e); if (key) batch.set(key, Math.max(batch.get(key) ?? 0, Math.min(1, e.strength))); }
      let admitted = 0;
      for (const key of ['damage', 'respawn', 'boss', 'finisher', 'heavy', 'air', 'hit', 'ko', 'pickup', 'clear', 'encounter', 'heavySwing', 'swing', 'jump'] as const) {
        if (!batch.has(key) || !next.allows(key) || admitted >= 4) continue;
        if (audio.play(key, ['hit', 'heavy', 'finisher', 'air', 'damage'].includes(key) ? { parameters: { strength: batch.get(key)! } } : undefined)) { next.record(key, (key === 'swing' || key === 'heavySwing' ? .07 : key === 'ko' ? .12 : .06)); admitted++; }
      }
    },
  };
}
