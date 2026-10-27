import { defineSound } from 'audiobits';

// A little brass automaton: spring lift, soft stone contact, broken metal, glass and a waking bell.
export const hollowRecipes = {
  jump: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.15, layers: [
    { id: 'spring', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 240], [0.08, 660], [0.15, 520]], curve: 'exponential' } }, gainDb: -25, envelope: { attack: 0.003, decay: 0.08, sustain: 0.2, release: 0.08 } },
    { id: 'air', source: { type: 'noise', color: 'white' }, gainDb: -34, envelope: { attack: 0.005, decay: 0.04, sustain: 0, release: 0.04 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2100, q: 0.8 }] },
  ] }),
  land: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.07, parameters: { strength: { min: 0, max: 1, default: 0.5, mode: 'play' } }, layers: [
    { id: 'feet', source: { type: 'noise', color: 'white' }, gainDb: { control: 'strength', range: [-36, -24], scale: 'linear' }, envelope: { attack: 0.002, decay: 0.04, sustain: 0, release: 0.05 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1000, q: 0.7 }] },
    { id: 'body', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 140], [0.06, 60]], curve: 'exponential' } }, gainDb: -29, envelope: { attack: 0.002, decay: 0.04, sustain: 0, release: 0.05 } },
  ] }),
  damage: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.32, layers: [
    { id: 'unwind', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 370], [0.3, 70]], curve: 'exponential' } }, gainDb: -24, envelope: { attack: 0.002, decay: 0.2, sustain: 0.15, release: 0.14 } },
    { id: 'crack', source: { type: 'noise', color: 'white' }, gainDb: -29, envelope: { attack: 0.002, decay: 0.05, sustain: 0, release: 0.08 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1600, q: 0.7 }] },
  ] }),
  interaction: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.18, layers: [
    { id: 'glass', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 880], [0.06, 1320]], curve: 'exponential' } }, gainDb: -24, envelope: { attack: 0.002, decay: 0.11, sustain: 0.1, release: 0.15 } },
    { id: 'overtone', source: { type: 'oscillator', waveform: 'triangle', frequency: 1760 }, gainDb: -35, envelope: { attack: 0.003, decay: 0.07, sustain: 0, release: 0.12 } },
  ] }),
  complete: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 1.1, layers: [
    { id: 'bell', source: { type: 'oscillator', waveform: 'sine', frequency: 523.25 }, gainDb: -23, envelope: { attack: 0.004, decay: 0.5, sustain: 0.12, release: 0.6 } },
    { id: 'fifth', source: { type: 'oscillator', waveform: 'triangle', frequency: 784 }, gainDb: -30, envelope: { attack: 0.14, decay: 0.4, sustain: 0.1, release: 0.6 } },
    { id: 'shimmer', source: { type: 'oscillator', waveform: 'sine', frequency: 1318.5 }, gainDb: -30, envelope: { attack: 0.3, decay: 0.4, sustain: 0.1, release: 0.6 } },
  ], effects: [{ type: 'delay', time: 0.18, feedback: 0.18, mix: 0.15 }] }),
};
