import { createCooldowns } from '../../engine/cooldowns.ts';
import { createGameAudio } from '../../engine/browser/audio.ts';
import { blastRecipes } from './sound-recipes.ts';
import type { BlastEvent, Player, EventType } from './state.ts';
type Cue = keyof typeof blastRecipes;
const cueFor = (event: EventType): Cue => event === 'relay' || event === 'redeploy' ? 'checkpoint' : event;
const order: readonly Cue[] = ['victory', 'defeat', 'rescue', 'extract', 'death', 'alarm', 'checkpoint', 'hurt', 'explosion', 'launch', 'chain', 'kill', 'throw', 'switch', 'shot', 'terrain', 'hit', 'impact', 'jump'];
const interval: Partial<Record<Cue, number>> = { explosion: .12, shot: .07, chain: .2, impact: .13, terrain: .18, hit: .09, kill: .1 };
export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(blastRecipes, onStatus), next = createCooldowns<Cue>();
  return { ...audio,
    reset() { next.clear(); audio.reset(); },
    consume(events: readonly BlastEvent[], player: Player) {
      next.advance(audio.time);
      // Outcome wins over the death that triggered it, regardless of emission order.
      for (const cue of ['victory', 'defeat', 'rescue', 'extract', 'death'] as const) {
        if (events.some(event => event.type === cue)) { audio.reset(); next.clear(); audio.play(cue); return; }
      }
      const batch = new Map<Cue, BlastEvent>();
      for (const event of events) {
        if (Math.abs(event.x - player.x) >= 700) continue;
        const cue = cueFor(event.type);
        if (!batch.has(cue) || event.strength > batch.get(cue)!.strength) batch.set(cue, event);
      }
      let admitted = 0;
      for (const cue of order) {
        const event = batch.get(cue);
        if (!event || !next.allows(cue) || admitted >= 4) continue;
        const spatial = ['impact', 'terrain', 'explosion', 'chain', 'hit', 'kill', 'shot'].includes(cue);
        const distance = spatial ? Math.max(-1, Math.min(1, (event.x - player.x) / 700)) : 0;
        const weighted = cue === 'explosion' || cue === 'chain' || cue === 'impact' || cue === 'terrain' || cue === 'hit' || cue === 'kill';
        if (audio.play(cue, {
          pan: distance * .6, gainDb: -Math.abs(distance) * 5 + (cue === 'shot' && event.strength < 1 ? -4 : 0),
          ...(weighted ? { parameters: { strength: Math.max(0, Math.min(1, event.strength / 1.5)) } } : {}),
        })) { next.record(cue, (interval[cue] ?? .12)); admitted++; }
      }
    },
  };
}
