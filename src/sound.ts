import type { GameEvent } from './game-state.ts';

import { createAudio } from './browser/audio.ts';
export { MAX_VOICES } from './browser/audio.ts';
const cues = {
  shot: [620, 280, 0.07, 0.035, 'triangle'],
  pulse: [130, 55, 0.22, 0.08, 'sine'],
  'enemy-hit': [190, 85, 0.07, 0.025, 'triangle'],
  'player-hit': [95, 42, 0.2, 0.12, 'sawtooth'],
  pickup: [880, 1320, 0.09, 0.055, 'sine'],
  upgrade: [440, 880, 0.22, 0.09, 'triangle'],
  evolution: [660, 1760, 0.35, 0.08, 'sine'],
  victory: [523, 1046, 0.55, 0.1, 'triangle'],
  defeat: [220, 55, 0.5, 0.1, 'triangle'],
} as const;
type Cue = keyof typeof cues;

/** Clearing notifications mapped to the shared browser voice owner. */
export function createSound(onStatus: (message: string) => void) {
  const audio = createAudio(cues, ['victory', 'defeat', 'evolution', 'upgrade', 'player-hit', 'pickup', 'pulse', 'shot', 'enemy-hit'], onStatus);
  return { ...audio, consume(events: readonly GameEvent[]) {
    audio.consume(events.map(event => event.type === 'outcome' ? event.outcome : event.type).filter((cue): cue is Cue => cue in cues));
  } };
}
