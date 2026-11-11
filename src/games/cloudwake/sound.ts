import { createGameAudio } from '../../engine/browser/audio.ts';
import { createCooldowns } from '../../engine/cooldowns.ts';
import type { FlightEvent } from './game.ts';
import { cloudwakeRecipes } from './sound-recipes.ts';

export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(cloudwakeRecipes, onStatus);
  const cooldowns = createCooldowns<keyof typeof cloudwakeRecipes>();
  return { ...audio,
    reset() { cooldowns.clear(); audio.reset(); },
    consume(events: readonly FlightEvent[], thrust: boolean) {
      cooldowns.advance(audio.time);
      for (const cue of ['crash', 'shield-hit', 'checkpoint', 'shield-ready', 'combo', 'reward', 'pickup', 'thrust'] as const) {
        if (!(cue === 'thrust' ? thrust : events.some(event => event.type === cue)) || !cooldowns.allows(cue)) continue;
        if (cue === 'crash') { audio.reset(); cooldowns.clear(); }
        if (audio.play(cue)) cooldowns.record(cue, cue === 'thrust' ? .14 : cue === 'pickup' ? .065 : .5);
        if (cue === 'crash') break;
      }
    },
  };
}
