import { createCooldowns } from '../../engine/cooldowns.ts';
import { createGameAudio } from '../../engine/browser/audio.ts';
import type { HollowEvent } from './game.ts';
import { hollowRecipes } from './sound-recipes.ts';

export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(hollowRecipes, onStatus);
  const next = createCooldowns<HollowEvent['type']>();
  return { ...audio,
    reset() { next.clear(); audio.reset(); },
    consume(events: readonly HollowEvent[], listener: { x: number; y: number }) {
      next.advance(audio.time);
      const terminal = events.find(event => event.type === 'damage' || event.type === 'complete' || event.type === 'level');
      if (terminal) { audio.reset(); next.clear(); audio.play(terminal.type); return; }
      for (const cue of ['checkpoint', 'stomp', 'interaction', 'jump', 'land', 'vent'] as const) {
        const event = events.find(event => event.type === cue && (cue !== 'vent' || Math.abs(event.x - listener.x) < 550));
        if (!event || !next.allows(cue)) continue;
        if (audio.play(cue, cue === 'land' ? { parameters: { strength: event.strength } } : undefined)) next.record(cue, (cue === 'vent' ? 0.4 : 0.065));
      }
    },
  };
}
