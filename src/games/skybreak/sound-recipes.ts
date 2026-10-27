import { defineSound } from 'audiobits';

// Compact arcade machinery: dry gun transients, filtered air, metal and low hull impacts.
export const skybreakRecipes = {
  shot: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.025, layers: [
    { id: 'muzzle', source: { type: 'noise', color: 'white' }, gainDb: -32, envelope: { attack: 0.001, decay: 0.015, sustain: 0, release: 0.012 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2400, q: 0.8 }] },
    { id: 'bolt', source: { type: 'oscillator', waveform: 'square', frequency: { points: [[0, 980], [0.02, 420]], curve: 'exponential' } }, gainDb: -38, envelope: { attack: 0.001, decay: 0.018, sustain: 0, release: 0.012 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1800, q: 0.7 }] },
  ] }),
  hit: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.025, layers: [
    { id: 'ricochet', source: { type: 'oscillator', waveform: 'triangle', frequency: { random: [1600, 2200] } }, gainDb: -34, envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.025 } },
    { id: 'metal', source: { type: 'noise', color: 'white' }, gainDb: -32, envelope: { attack: 0.001, decay: 0.015, sustain: 0, release: 0.02 }, effects: [{ type: 'filter', filter: 'highpass', frequency: 1700, q: 0.7 }] },
  ] }),
  'boss-hit': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.045, layers: [
    { id: 'armor', source: { type: 'oscillator', waveform: 'square', frequency: 146.8 }, gainDb: -32, envelope: { attack: 0.001, decay: 0.025, sustain: 0.1, release: 0.035 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 900, q: 1 }] },
    { id: 'sparks', source: { type: 'noise', color: 'white' }, gainDb: -31, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.035 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2800, q: 1.2 }] },
  ] }),
  explosion: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.14, layers: [
    { id: 'blast', source: { type: 'noise', color: 'white' }, gainDb: -25, envelope: { attack: 0.002, decay: 0.11, sustain: 0.1, release: 0.16 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 2300], [0.13, 250]], curve: 'exponential' }, q: 0.7 }] },
    { id: 'thump', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 115], [0.1, 42]], curve: 'exponential' } }, gainDb: -24, envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.12 } },
  ] }),
  damage: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.16, layers: [
    { id: 'hull', source: { type: 'oscillator', waveform: 'sawtooth', frequency: { points: [[0, 180], [0.15, 65]], curve: 'exponential' } }, gainDb: -25, envelope: { attack: 0.002, decay: 0.09, sustain: 0.2, release: 0.16 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 850, q: 0.7 }] },
    { id: 'fracture', source: { type: 'noise', color: 'white' }, gainDb: -22, envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.07 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 900, q: 1 }] },
  ] }),
  evade: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.28, layers: [
    { id: 'slipstream', source: { type: 'noise', color: 'white' }, gainDb: -25, envelope: { attack: 0.035, decay: 0.1, sustain: 0.2, release: 0.1 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 500], [0.12, 3200], [0.28, 700]], curve: 'exponential' }, q: 1.5 }] },
  ] }),
  warning: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.09, layers: [
    { id: 'radar', source: { type: 'oscillator', waveform: 'sine', frequency: 880 }, gainDb: -31, envelope: { attack: 0.003, decay: 0.06, sustain: 0.1, release: 0.06 } },
  ] }),
  life: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.4, layers: [
    { id: 'mayday', source: { type: 'oscillator', waveform: 'square', frequency: { points: [[0, 440], [0.18, 220], [0.38, 110]], curve: 'exponential' } }, gainDb: -27, envelope: { attack: 0.003, decay: 0.25, sustain: 0.2, release: 0.2 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1300, q: 0.7 }] },
    { id: 'debris', source: { type: 'noise', color: 'white' }, gainDb: -27, envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 600, q: 0.7 }] },
  ] }),
  pickup: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.14, layers: [
    { id: 'supply', source: { type: 'oscillator', waveform: 'square', frequency: { points: [[0, 660], [0.045, 880], [0.12, 1320]], curve: 'exponential' } }, gainDb: -30, envelope: { attack: 0.002, decay: 0.07, sustain: 0.2, release: 0.13 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 2600, q: 0.7 }] },
  ] }),
  'boss-warning': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.3, layers: [
    { id: 'lock', source: { type: 'oscillator', waveform: 'square', frequency: { points: [[0, 220], [0.27, 440]], curve: 'linear' } }, gainDb: -30, envelope: { attack: 0.01, decay: 0.16, sustain: 0.3, release: 0.09 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1700, q: 1 }] },
    { id: 'beacon', source: { type: 'oscillator', waveform: 'sine', frequency: 660 }, gainDb: -30, envelope: { attack: 0.08, decay: 0.12, sustain: 0.3, release: 0.09 } },
  ] }),
  'boss-shot': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.12, layers: [
    { id: 'cannon', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 210], [0.1, 55]], curve: 'exponential' } }, gainDb: -23, envelope: { attack: 0.002, decay: 0.08, sustain: 0.1, release: 0.13 } },
    { id: 'pressure', source: { type: 'noise', color: 'white' }, gainDb: -27, envelope: { attack: 0.002, decay: 0.07, sustain: 0, release: 0.1 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1600, q: 0.7 }] },
  ] }),
  'boss-break': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.65, layers: [
    { id: 'rupture', source: { type: 'noise', color: 'white' }, gainDb: -22, envelope: { attack: 0.003, decay: 0.4, sustain: 0.15, release: 0.4 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 3000], [0.6, 140]], curve: 'exponential' }, q: 0.8 }] },
    { id: 'core', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 130], [0.6, 32]], curve: 'exponential' } }, gainDb: -21, envelope: { attack: 0.004, decay: 0.35, sustain: 0.2, release: 0.4 } },
  ] }),
  victory: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.5, layers: [
    { id: 'brass', source: { type: 'oscillator', waveform: 'sawtooth', frequency: 523.25 }, gainDb: -29, envelope: { attack: 0.012, decay: 0.16, sustain: 0.4, release: 0.25 } },
    { id: 'fifth', source: { type: 'oscillator', waveform: 'square', frequency: 784 }, gainDb: -33, envelope: { attack: 0.06, decay: 0.16, sustain: 0.4, release: 0.25 } },
    { id: 'octave', source: { type: 'oscillator', waveform: 'triangle', frequency: 1046.5 }, gainDb: -29, envelope: { attack: 0.12, decay: 0.16, sustain: 0.4, release: 0.3 } },
  ], effects: [{ type: 'filter', filter: 'lowpass', frequency: 2300, q: 0.7 }] }),
  defeat: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.45, layers: [
    { id: 'fall', source: { type: 'oscillator', waveform: 'square', frequency: { points: [[0, 330], [0.2, 220], [0.4, 82.5]], curve: 'exponential' } }, gainDb: -28, envelope: { attack: 0.008, decay: 0.25, sustain: 0.25, release: 0.3 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1100, q: 0.7 }] },
  ] }),
};
