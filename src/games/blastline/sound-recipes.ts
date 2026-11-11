import { defineSound } from 'audiobits';

// Rifle, launcher and debris have separate mechanisms; explosions carry the low end.
function debris(frequency: number, duration: number, gain: number) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration,
    parameters: { strength: { min: 0, max: 1, default: .5, mode: 'play' } }, layers: [
      { id: 'fragments', source: { type: 'noise', color: 'white' }, gainDb: { control: 'strength', range: [gain - 6, gain], scale: 'linear' },
        envelope: { attack: .002, decay: duration * .9, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { random: [frequency * .85, frequency * 1.15] }, q: .8 }] },
      { id: 'surface', source: { type: 'oscillator', waveform: 'sine', frequency: frequency * .26 }, gainDb: { control: 'strength', range: [gain - 15, gain - 7], scale: 'linear' },
        envelope: { attack: .002, decay: duration * .55, sustain: 0, release: .015 } },
    ] });
}
function blast(duration: number, gain: number) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration,
    parameters: { strength: { min: 0, max: 1, default: .65, mode: 'play' } }, layers: [
      { id: 'pressure', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 145], [.045, 62], [duration, 29]], curve: 'exponential' } }, gainDb: { control: 'strength', range: [gain - 7, gain], scale: 'linear' },
        envelope: { attack: .003, decay: duration * .85, sustain: 0, release: .04 } },
      { id: 'fireball', source: { type: 'noise', color: 'white' }, gainDb: { control: 'strength', range: [gain - 8, gain - 2], scale: 'linear' },
        envelope: { attack: .003, decay: duration * .9, sustain: 0, release: .04 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 3800], [duration * .25, 1000], [duration, 160]], curve: 'exponential' }, q: .6 }] },
      { id: 'shrapnel', source: { type: 'noise', color: 'white' }, gainDb: gain - 11,
        envelope: { attack: .018, decay: duration * .35, sustain: 0, release: .025 }, effects: [{ type: 'filter', filter: 'highpass', frequency: 2900, q: .7 }] },
    ] });
}
// A crisp second radio tone follows the carrier; static stays beneath both.
function radio(root: number, duration: number, interval = 1.5) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'carrier', source: { type: 'oscillator', waveform: 'square', frequency: root }, gainDb: -32,
      envelope: { attack: .004, decay: duration * .85, sustain: .02, release: .025 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1500, q: .7 }] },
    { id: 'acknowledgement', startOffset: duration * .18, source: { type: 'oscillator', waveform: 'sine', frequency: root * interval }, gainDb: -32,
      envelope: { attack: .004, decay: duration * .72, sustain: .02, release: .035 } },
    { id: 'radio-squelch', source: { type: 'noise', color: 'white' }, gainDb: -40,
      envelope: { attack: .002, decay: .045, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1700, q: 1.2 }] },
  ] });
}
export const blastRecipes = {
  shot: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .09, layers: [
    { id: 'muzzle-crack', source: { type: 'noise', color: 'white' }, gainDb: -28,
      envelope: { attack: .002, decay: .035, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { random: [2300, 2850] }, q: .65 }] },
    { id: 'barrel', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 210], [.055, 78]], curve: 'exponential' } }, gainDb: -31,
      envelope: { attack: .002, decay: .065, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 700, q: .7 }] },
    { id: 'bolt-return', startOffset: .025, source: { type: 'noise', color: 'white' }, gainDb: -38,
      envelope: { attack: .002, decay: .055, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 3600, q: 2 }] },
  ] }),
  launch: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .3, layers: [
    { id: 'exhaust', source: { type: 'noise', color: 'white' }, gainDb: -26,
      envelope: { attack: .008, decay: .26, sustain: 0, release: .025 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 550], [.06, 1600], [.29, 450]], curve: 'exponential' }, q: .7 }] },
    { id: 'tube', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 165], [.08, 72]], curve: 'exponential' } }, gainDb: -25,
      envelope: { attack: .003, decay: .16, sustain: 0, release: .02 } },
  ] }),
  throw: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .17, layers: [
    { id: 'arm-swish', source: { type: 'noise', color: 'white' }, gainDb: -33,
      envelope: { attack: .018, decay: .13, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1200, q: .65 }] },
    { id: 'pin', source: { type: 'oscillator', waveform: 'sine', frequency: 2180 }, gainDb: -35,
      envelope: { attack: .002, decay: .035, sustain: 0, release: .01 } },
  ] }),
  impact: debris(2900, .075, -31), terrain: debris(750, .22, -29),
  explosion: blast(.65, -22), chain: blast(.32, -27),
  hit: debris(1500, .1, -30), kill: debris(650, .19, -28),
  hurt: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .25, layers: [
    { id: 'vest-impact', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 155], [.05, 68], [.24, 48]], curve: 'exponential' } }, gainDb: -22,
      envelope: { attack: .002, decay: .22, sustain: 0, release: .025 } },
    { id: 'fabric-tear', source: { type: 'noise', color: 'white' }, gainDb: -25,
      envelope: { attack: .002, decay: .08, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1150, q: .65 }] },
  ] }),
  death: radio(146.83, .65, 1.0595), rescue: radio(440, .65),
  switch: radio(880, .14, 1.25), checkpoint: radio(587.33, .32, 1.25),
  alarm: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .75, layers: [
    { id: 'evacuation-siren', source: { type: 'oscillator', waveform: 'square', frequency: { points: [[0, 440], [.18, 660], [.36, 440], [.54, 660], [.74, 440]], curve: 'linear' } }, gainDb: -31,
      envelope: { attack: .015, decay: .15, sustain: .55, release: .06 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1500, q: .7 }] },
  ] }),
  extract: radio(523.25, .65, 2), victory: radio(587.33, 1, 1.5), defeat: radio(196, .8, 1.1892),
  jump: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .08, layers: [
    { id: 'boot', source: { type: 'noise', color: 'white' }, gainDb: -36,
      envelope: { attack: .002, decay: .06, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 950, q: .6 }] },
  ] }),
};
