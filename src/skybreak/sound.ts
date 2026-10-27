import { createAudio, type CueDefinition } from '../browser/audio.ts';
import type { Cue, FlightEvent } from './game.ts';
const cues: Record<Cue, CueDefinition> = {
  shot: [1180, 620, 0.035, 0.014, 'triangle'], warning: [370, 540, 0.16, 0.03, 'sine'],
  damage: [260, 45, 0.25, 0.085, 'sawtooth'],
  hit: [190, 65, 0.07, 0.05, 'sawtooth'], explosion: [100, 28, 0.24, 0.08, 'sawtooth'],
  evade: [300, 1200, 0.3, 0.045, 'sine'], life: [320, 80, 0.4, 0.08, 'triangle'],
  pickup: [660, 1760, 0.22, 0.065, 'sine'], 'boss-warning': [145, 290, 0.38, 0.045, 'square'],
  'boss-break': [170, 25, 0.9, 0.09, 'sawtooth'],
  victory: [523, 1569, 0.6, 0.08, 'triangle'], defeat: [220, 45, 0.6, 0.08, 'triangle'],
};
export function createSound(onStatus: (message: string) => void) {
  const audio = createAudio(cues, ['victory', 'defeat', 'boss-break', 'pickup', 'boss-warning', 'damage', 'life', 'evade', 'explosion', 'hit', 'warning', 'shot'], onStatus);
  return { ...audio, consume(events: readonly FlightEvent[]) { audio.consume(events.map(event => event.type)); } };
}
