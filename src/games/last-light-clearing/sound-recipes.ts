import { defineSound } from 'audiobits';

// Lantern rewards bloom as stationary partials; only cast gestures bend in pitch.
function lantern(root: number, duration: number, gain: number) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'ember', source: { type: 'oscillator', waveform: 'sine', frequency: root }, gainDb: gain,
      envelope: { attack: .008, decay: duration * .8, sustain: .04, release: .1 } },
    { id: 'warmth', source: { type: 'oscillator', waveform: 'sine', frequency: root * 1.5 }, gainDb: gain - 7,
      envelope: { attack: .035, decay: duration * .7, sustain: .025, release: .12 } },
    { id: 'light', source: { type: 'oscillator', waveform: 'sine', frequency: root * 2.5 }, gainDb: gain - 12,
      envelope: { attack: .06, decay: duration * .55, sustain: 0, release: .06 } },
  ], effects: [{ type: 'delay', time: .137, feedback: .16, mix: .13 }] });
}

export const clearingRecipes = {
  spark: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .085, layers: [
    { id: 'kindle', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, { random: [1450, 1520] }], [.018, 980], [.08, 620]], curve: 'exponential' } }, gainDb: -31,
      envelope: { attack: .003, decay: .075, sustain: 0, release: .015 } },
    { id: 'ember-fizz', source: { type: 'noise', color: 'white' }, gainDb: -38,
      envelope: { attack: .002, decay: .025, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 3800, q: .8 }] },
  ] }),
  arc_spark: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .12, layers: [
    { id: 'fork', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 1244.5], [.022, 2489], [.11, 622.25]], curve: 'exponential' } }, gainDb: -33,
      envelope: { attack: .002, decay: .1, sustain: 0, release: .02 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 2800, q: .6 }] },
    { id: 'ionized-air', source: { type: 'noise', color: 'white' }, gainDb: -35,
      envelope: { attack: .003, decay: .055, sustain: 0, release: .02 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 4600], [.1, 1300]], curve: 'exponential' }, q: 1.1 }] },
  ] }),
  shard: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .09, layers: [
    { id: 'glass-edge', source: { type: 'oscillator', waveform: 'sine', frequency: { random: [2350, 2430] } }, gainDb: -34,
      envelope: { attack: .002, decay: .075, sustain: 0, release: .015 } },
    { id: 'fracture-mode', source: { type: 'oscillator', waveform: 'sine', frequency: 3890 }, gainDb: -43,
      envelope: { attack: .002, decay: .03, sustain: 0, release: .01 } },
    { id: 'cut', source: { type: 'noise', color: 'white' }, gainDb: -37,
      envelope: { attack: .002, decay: .018, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'highpass', frequency: 3100, q: .7 }] },
  ] }),
  halo: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .2, layers: [
    { id: 'ward', source: { type: 'oscillator', waveform: 'sine', frequency: 783.99 }, gainDb: -31,
      envelope: { attack: .007, decay: .18, sustain: 0, release: .025 } },
    { id: 'gold-rim', source: { type: 'oscillator', waveform: 'sine', frequency: 2117 }, gainDb: -39,
      envelope: { attack: .003, decay: .09, sustain: 0, release: .02 } },
  ] }),
  pulse: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .3, layers: [
    { id: 'expansion', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 174.61], [.1, 87.31], [.29, 55]], curve: 'exponential' } }, gainDb: -24,
      envelope: { attack: .012, decay: .26, sustain: 0, release: .035 } },
    { id: 'dust-wave', source: { type: 'noise', color: 'white' }, gainDb: -31,
      envelope: { attack: .025, decay: .23, sustain: 0, release: .04 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 1600], [.28, 280]], curve: 'exponential' }, q: .7 }] },
    { id: 'ward-resonance', source: { type: 'oscillator', waveform: 'sine', frequency: 523.25 }, gainDb: -34,
      envelope: { attack: .025, decay: .25, sustain: 0, release: .025 } },
  ] }),
  'enemy-hit': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .055, layers: [
    { id: 'contact', source: { type: 'noise', color: 'white' }, gainDb: -36,
      envelope: { attack: .002, decay: .04, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { random: [800, 1150] }, q: .7 }] },
  ] }),
  'enemy-defeated': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .14, layers: [
    { id: 'ash', source: { type: 'noise', color: 'white' }, gainDb: -35,
      envelope: { attack: .006, decay: .12, sustain: 0, release: .02 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 1800], [.13, 650]], curve: 'exponential' }, q: .65 }] },
    { id: 'released-mote', source: { type: 'oscillator', waveform: 'sine', frequency: 659.25 }, gainDb: -39,
      envelope: { attack: .015, decay: .11, sustain: 0, release: .02 } },
  ] }),
  'player-hit': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .23, layers: [
    { id: 'wound', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 164.81], [.05, 82.4], [.22, 61.74]], curve: 'exponential' } }, gainDb: -23,
      envelope: { attack: .002, decay: .2, sustain: 0, release: .03 } },
    { id: 'breach', source: { type: 'noise', color: 'white' }, gainDb: -25,
      envelope: { attack: .002, decay: .065, sustain: 0, release: .02 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1050, q: .7 }] },
    { id: 'dark-ward', source: { type: 'oscillator', waveform: 'sine', frequency: 233.08 }, gainDb: -33,
      envelope: { attack: .004, decay: .19, sustain: 0, release: .03 } },
  ] }),
  pickup: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .115,
    parameters: { cluster: { min: 0, max: 1, default: 0, mode: 'play' } }, layers: [
      { id: 'gem', source: { type: 'oscillator', waveform: 'sine', frequency: { control: 'cluster', range: [1174.66, 1567.98], scale: 'exponential' } }, gainDb: -32,
        envelope: { attack: .003, decay: .1, sustain: 0, release: .015 } },
      { id: 'facets', source: { type: 'oscillator', waveform: 'sine', frequency: { control: 'cluster', range: [2819.18, 3763.15], scale: 'exponential' } }, gainDb: { control: 'cluster', range: [-45, -39], scale: 'linear' },
        envelope: { attack: .002, decay: .045, sustain: 0, release: .01 } },
    ] }),
  upgrade: lantern(523.25, .48, -25),
  evolution: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .85, layers: [
    { id: 'rekindle', source: { type: 'noise', color: 'white' }, gainDb: -31,
      envelope: { attack: .23, decay: .3, sustain: 0, release: .04 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 450], [.3, 3200], [.84, 1200]], curve: 'exponential' }, q: .8 }] },
    { id: 'awakened-core', startOffset: .16, source: { type: 'oscillator', waveform: 'sine', frequency: 783.99 }, gainDb: -25,
      envelope: { attack: .04, decay: .6, sustain: .02, release: .12 } },
    { id: 'crown', startOffset: .24, source: { type: 'oscillator', waveform: 'sine', frequency: 1174.66 }, gainDb: -31,
      envelope: { attack: .03, decay: .5, sustain: .02, release: .12 } },
  ], effects: [{ type: 'delay', time: .167, feedback: .18, mix: .13 }] }),
  elite: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .7, layers: [
    { id: 'briar-horn', source: { type: 'oscillator', waveform: 'triangle', frequency: 98 }, gainDb: -26,
      envelope: { attack: .035, decay: .59, sustain: .04, release: .08 } },
    { id: 'unease', source: { type: 'oscillator', waveform: 'sine', frequency: 103.83 }, gainDb: -30,
      envelope: { attack: .06, decay: .55, sustain: .04, release: .08 } },
    { id: 'earth', source: { type: 'noise', color: 'white' }, gainDb: -29,
      envelope: { attack: .025, decay: .5, sustain: 0, release: .06 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 380, q: .8 }] },
  ] }),
  victory: lantern(523.25, 1.15, -24),
  defeat: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .85, layers: [
    { id: 'last-ember', source: { type: 'oscillator', waveform: 'sine', frequency: 293.66 }, gainDb: -26,
      envelope: { attack: .015, decay: .76, sustain: 0, release: .05 } },
    { id: 'shadow', source: { type: 'oscillator', waveform: 'sine', frequency: 349.23 }, gainDb: -33,
      envelope: { attack: .05, decay: .7, sustain: 0, release: .05 } },
    { id: 'extinguished-wick', source: { type: 'noise', color: 'white' }, gainDb: -36,
      envelope: { attack: .07, decay: .6, sustain: 0, release: .05 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 1600], [.8, 200]], curve: 'exponential' }, q: .6 }] },
  ] }),
};
