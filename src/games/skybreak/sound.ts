import { createGameAudio } from '../../engine/browser/audio.ts';
import type { FlightEvent } from './game.ts';
import { flight } from './content.ts';
import { skybreakRecipes } from './sound-recipes.ts';

type Cue = keyof typeof skybreakRecipes;
const priority: readonly Cue[] = ['victory', 'defeat', 'boss-break', 'life', 'damage', 'pickup', 'boss-warning', 'boss-shot', 'evade', 'explosion', 'boss-hit', 'hit', 'warning', 'shot'];
const interval: Partial<Record<Cue, number>> = { shot: 0.06, hit: 0.065, 'boss-hit': 0.09, explosion: 0.1, warning: 0.4 };

export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(skybreakRecipes, onStatus);
  const next = new Map<Cue, number>();
  let lastTime = 0;
  return {
    ...audio,
    reset() { next.clear(); audio.reset(); },
    consume(events: readonly FlightEvent[]) {
      const frame = new Map<Cue, FlightEvent>();
      for (const event of events) frame.set(event.type === 'hit' && event.target === 'boss' ? 'boss-hit' : event.type, event);
      for (const cue of ['victory', 'defeat', 'boss-break', 'life'] as const) {
        if (frame.has(cue)) { audio.reset(); next.clear(); audio.play(cue); return; }
      }
      const now = audio.time;
      if (now < lastTime) next.clear(); // A recovered engine has a fresh clock.
      lastTime = now;
      for (const cue of priority) {
        const event = frame.get(cue);
        if (!event || now < (next.get(cue) ?? 0)) continue;
        // Restrained world-space placement; the aircraft's own feedback stays centered.
        const spatial = ['hit', 'boss-hit', 'explosion', 'boss-shot'].includes(cue);
        const pan = spatial && Number.isFinite(event.x) ? Math.max(-0.65, Math.min(0.65, (event.x / flight.width * 2 - 1) * 0.65)) : 0;
        if (audio.play(cue, { pan })) next.set(cue, now + (interval[cue] ?? 0));
      }
    },
  };
}
