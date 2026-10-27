import { createGameAudio } from '../browser/audio.ts';
import type { HollowEvent } from './game.ts';
import { hollowRecipes } from './sound-recipes.ts';

export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(hollowRecipes, onStatus);
  const next = new Map<HollowEvent['type'], number>();
  let lastTime = 0;
  return { ...audio,
    reset() { next.clear(); audio.reset(); },
    consume(events: readonly HollowEvent[], listener: { x: number; y: number }) {
      const now = audio.time;
      if (now < lastTime) next.clear();
      lastTime = now;
      const terminal = events.find(event => event.type === 'damage' || event.type === 'complete' || event.type === 'level');
      if (terminal) { audio.reset(); next.clear(); audio.play(terminal.type); return; }
      for (const cue of ['checkpoint', 'stomp', 'interaction', 'jump', 'land', 'vent'] as const) {
        const event = events.find(event => event.type === cue && (cue !== 'vent' || Math.abs(event.x - listener.x) < 550));
        if (!event || now < (next.get(cue) ?? 0)) continue;
        if (audio.play(cue, cue === 'land' ? { parameters: { strength: event.strength } } : undefined)) next.set(cue, now + (cue === 'vent' ? 0.4 : 0.065));
      }
    },
  };
}
