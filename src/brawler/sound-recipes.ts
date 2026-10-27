import { defineSound, type Recipe } from 'audiobits';
// Soft filtered air is separated from contact: a missed punch never gets the bass/crack.
const swing = defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .12, layers: [
  { id: 'air', source: { type: 'noise', color: 'white' }, gainDb: -28, envelope: { attack: .018, decay: .045, sustain: 0, release: .045 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 800], [.1, 2800]], curve: 'exponential' }, q: .8 }] },
] });
function impact(low: number, length: number, grit: number): Recipe {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration: length,
    parameters: { strength: { min: 0, max: 1, default: .65, mode: 'play' } }, layers: [
      { id: 'weight', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, low], [.045, low * .45], [length, 42]], curve: 'exponential' } }, gainDb: { control: 'strength', range: [-29, -18], scale: 'linear' }, envelope: { attack: .002, decay: length * .55, sustain: .05, release: .09 } },
      { id: 'snap', source: { type: 'noise', color: 'white' }, gainDb: { control: 'strength', range: [-32, -23], scale: 'linear' }, envelope: { attack: .001, decay: .04, sustain: 0, release: .055 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: grit, q: .65 }] },
      { id: 'armor', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, low * 3.1], [length * .6, low * 1.3]], curve: 'exponential' } }, gainDb: -33, envelope: { attack: .002, decay: .05, sustain: 0, release: .07 } },
    ] });
}
function signal(notes: readonly [number, number, number], length: number): Recipe {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration: length, layers: [
    { id: 'signal', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, notes[0]], [length * .28, notes[1]], [length * .55, notes[2]]], curve: 'exponential' } }, gainDb: -26, envelope: { attack: .004, decay: length * .55, sustain: .12, release: length * .4 } },
    { id: 'halo', source: { type: 'oscillator', waveform: 'sine', frequency: notes[2] * 1.5 }, gainDb: -34, envelope: { attack: length * .3, decay: length * .35, sustain: .08, release: length * .4 } },
  ], effects: [{ type: 'delay', time: .12, feedback: .12, mix: .1 }] });
}
export const circuitRecipes = {
  swing, hit: impact(165, .15, 1450), heavy: impact(118, .27, 850), finisher: impact(190, .24, 2100),
  air: impact(210, .20, 1800), damage: impact(125, .3, 1100),
  ko: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .35, layers: [
    { id: 'fall', source: { type: 'oscillator', waveform: 'sawtooth', frequency: { points: [[0, 160], [.3, 48]], curve: 'exponential' } }, gainDb: -30, envelope: { attack: .003, decay: .18, sustain: .05, release: .14 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 700, q: .7 }] },
    { id: 'rattle', source: { type: 'noise', color: 'white' }, gainDb: -31, envelope: { attack: .003, decay: .1, sustain: 0, release: .11 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2200, q: 1.2 }] },
  ] }),
  jump: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .12, layers: [
    { id: 'lift', source: { type: 'noise', color: 'white' }, gainDb: -33, envelope: { attack: .012, decay: .055, sustain: 0, release: .04 }, effects: [{ type: 'filter', filter: 'highpass', frequency: 1100, q: .7 }] },
  ] }),
  boss: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .6, layers: [
    { id: 'capacitor', source: { type: 'oscillator', waveform: 'sawtooth', frequency: { points: [[0, 80], [.5, 230]], curve: 'exponential' } }, gainDb: -30, envelope: { attack: .05, decay: .3, sustain: .35, release: .15 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 550, q: 1.5 }] },
    { id: 'relay', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 520], [.5, 390]], curve: 'exponential' } }, gainDb: -32, envelope: { attack: .02, decay: .35, sustain: .1, release: .15 } },
  ] }),
  encounter: signal([164.8, 220, 196], .3), clear: signal([329.6, 440, 659.3], .5),
  pickup: signal([523.25, 659.25, 1046.5], .35), respawn: signal([220, 329.6, 440], .6),
  stage: signal([261.63, 392, 523.25], .8), victory: signal([329.6, 493.9, 659.25], 1.2), gameover: signal([220, 164.8, 110], .9),
};
