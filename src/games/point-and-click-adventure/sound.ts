import { defineSound } from 'audiobits';
import { createGameAudio } from '../../engine/browser/audio.ts';
import { createCooldowns } from '../../engine/cooldowns.ts';
import type { Cue } from './game.ts';
const tone = (frequency: number, duration: number) => defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
  { id: 'resonance', source: { type: 'oscillator', waveform: 'sine', frequency }, gainDb: -25, envelope: { attack: .006, decay: duration * .8, sustain: .02, release: .09 } },
  { id: 'overtone', source: { type: 'oscillator', waveform: 'sine', frequency: frequency * 2.76 }, gainDb: -36, envelope: { attack: .002, decay: duration * .4, sustain: 0, release: .04 } },
] });
export const adventureRecipes = {
  discovery: tone(784, .45), seal: tone(523, .8), bell: tone(146.8, 1.8),
  music: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 1.2, layers: [0, .25, .5].map((startOffset, i) => ({
    id: `tine-${i}`, startOffset, source: { type: 'oscillator' as const, waveform: 'sine' as const, frequency: [659, 784, 988][i]! }, gainDb: -30,
    envelope: { attack: .002, decay: .5, sustain: 0, release: .05 },
  })) }),
  ghost: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .8, layers: [
    { id: 'breath', source: { type: 'noise', color: 'white' }, gainDb: -30, envelope: { attack: .13, decay: .55, sustain: 0, release: .1 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 950, q: 2 }] },
    { id: 'borrowed-voice', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 290], [.7, 160]], curve: 'exponential' } }, gainDb: -33, envelope: { attack: .1, decay: .6, sustain: 0, release: .1 } },
  ] }),
  mechanism: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .2, layers: [
    { id: 'brass-click', source: { type: 'noise', color: 'white' }, gainDb: -30, envelope: { attack: .002, decay: .1, sustain: 0, release: .04 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1500, q: 1.5 }] },
  ] }),
};
export function createSound(report: (message: string) => void) {
  const audio = createGameAudio(adventureRecipes, report);
  const cooldowns = createCooldowns<Cue>();
  return { ...audio,
    reset() { cooldowns.clear(); audio.reset(); },
    consume(events: Cue[]) {
      cooldowns.advance(audio.time);
      for (const cue of new Set(events)) if (cooldowns.allows(cue) && audio.play(cue)) cooldowns.record(cue, cue === 'bell' || cue === 'music' ? 1.2 : .2);
    },
  };
}
