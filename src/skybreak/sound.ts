import { createAudio, type CueDefinition } from '../browser/audio.ts';
import type { Cue, FlightEvent } from './game.ts';
const cues: Record<Cue, CueDefinition> = {
  shot: [920, 480, 0.045, 0.022, 'square'], warning: [260, 180, 0.08, 0.025, 'triangle'],
  hit: [190, 65, 0.07, 0.05, 'sawtooth'], explosion: [100, 28, 0.24, 0.08, 'sawtooth'],
  evade: [300, 1200, 0.3, 0.045, 'sine'], life: [320, 80, 0.4, 0.08, 'triangle'],
  victory: [523, 1569, 0.6, 0.08, 'triangle'], defeat: [220, 45, 0.6, 0.08, 'triangle'],
};
export function createSound(onStatus: (message: string) => void) {
  const audio = createAudio(cues, ['victory', 'defeat', 'life', 'evade', 'explosion', 'hit', 'warning', 'shot'], onStatus);
  return { ...audio, consume(events: readonly FlightEvent[]) { audio.consume(events.map(event => event.type)); } };
}
