import { defineSound } from 'audiobits';

function chime(root: number, duration: number) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'glass', source: { type: 'oscillator', waveform: 'sine', frequency: root }, gainDb: -25,
      envelope: { attack: .003, decay: duration * .8, sustain: 0, release: .03 } },
    { id: 'overtone', startOffset: .025, source: { type: 'oscillator', waveform: 'triangle', frequency: root * 1.5 }, gainDb: -34,
      envelope: { attack: .003, decay: duration * .65, sustain: 0, release: .03 } },
  ] });
}
export const cloudwakeRecipes = {
  pickup: chime(1174.66, .19),
  checkpoint: chime(659.25, .8),
  'shield-ready': chime(987.77, .55),
  'shield-hit': chime(392, .28),
  thrust: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .14, layers: [
    { id: 'soft-turbine', source: { type: 'noise', color: 'white' }, gainDb: -37,
      envelope: { attack: .025, decay: .08, sustain: .12, release: .03 },
      effects: [{ type: 'filter', filter: 'bandpass', frequency: 650, q: .7 }] },
    { id: 'motor', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 145], [.13, 190]], curve: 'linear' } }, gainDb: -39,
      envelope: { attack: .025, decay: .08, sustain: .1, release: .03 } },
  ] }),
  crash: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .55, layers: [
    { id: 'impact', source: { type: 'noise', color: 'white' }, gainDb: -25,
      envelope: { attack: .002, decay: .2, sustain: 0, release: .05 },
      effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 2400], [.5, 170]], curve: 'exponential' }, q: .6 }] },
    { id: 'hull', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 190], [.5, 55]], curve: 'exponential' } }, gainDb: -28,
      envelope: { attack: .002, decay: .45, sustain: 0, release: .05 } },
  ] }),
};
