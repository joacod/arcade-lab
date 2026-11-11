import { createCooldowns } from '../../engine/cooldowns.ts';
import { createGameAudio } from '../../engine/browser/audio.ts';
import type { DuelEvent, Fighter } from './game.ts';
import { arena } from './content.ts';
import { duelRecipes } from './sound-recipes.ts';

type Cue = keyof typeof duelRecipes;
export function duelCue(event: DuelEvent, fighters: readonly Pick<Fighter, 'kind'>[]): Cue {
  return event.type === 'special' ? fighters[event.fighter]!.kind === 'nera' ? 'stormglass' : 'riftbreaker' : event.type;
}
export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(duelRecipes, onStatus), next = createCooldowns<Cue>();
  return {
    ...audio,
    reset() { next.clear(); audio.reset(); },
    consume(events: readonly DuelEvent[], fighters: readonly Pick<Fighter, 'kind'>[]) {
      next.advance(audio.time);
      for (const cue of ['victory', 'defeat', 'ko', 'timeout'] as const) {
        if (events.some(event => event.type === cue)) { audio.reset(); next.clear(); audio.play(cue); return; }
      }
      const batch = new Map<Cue, DuelEvent>();
      for (const event of events) {
        const cue = duelCue(event, fighters);
        if (!batch.has(cue) || event.strength > batch.get(cue)!.strength) batch.set(cue, event);
      }
      let admitted = 0;
      for (const cue of ['knockdown', 'heavyHit', 'hit', 'block', 'stormglass', 'riftbreaker', 'fight', 'count', 'heavySwing', 'swing'] as const) {
        const event = batch.get(cue);
        if (!event || !next.allows(cue) || admitted >= 4) continue;
        const contact = cue === 'hit' || cue === 'heavyHit';
        const pan = cue === 'fight' || cue === 'count' ? 0 : Math.max(-.55, Math.min(.55, (event.x / arena.width * 2 - 1) * .55));
        if (audio.play(cue, { pan, ...(contact ? { parameters: { strength: Math.max(0, Math.min(1, event.strength)) } } : {}) })) {
          next.record(cue, .065); admitted++;
        }
      }
    },
  };
}
