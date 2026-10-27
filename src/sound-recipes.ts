import { defineSound } from 'audiobits';

// Lantern magic: soft sine partials, glass transients and restrained echo on milestones.
export const clearingRecipes = {
  spark: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.045, layers: [
    { id: 'glint', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 1568], [0.035, 784]], curve: 'exponential' } }, gainDb: -27, envelope: { attack: 0.002, decay: 0.025, sustain: 0.1, release: 0.055 } },
    { id: 'body', source: { type: 'oscillator', waveform: 'triangle', frequency: 392 }, gainDb: -34, envelope: { attack: 0.002, decay: 0.03, sustain: 0, release: 0.02 } },
  ] }),
  'arc_spark': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.06, layers: [
    { id: 'arc', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 1176], [0.02, 2352], [0.055, 784]], curve: 'exponential' } }, gainDb: -30, envelope: { attack: 0.002, decay: 0.035, sustain: 0.12, release: 0.06 } },
    { id: 'halo', source: { type: 'oscillator', waveform: 'sine', frequency: 1568 }, gainDb: -35, envelope: { attack: 0.006, decay: 0.04, sustain: 0.1, release: 0.09 } },
  ] }),
  shard: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.04, layers: [
    { id: 'crystal', source: { type: 'oscillator', waveform: 'triangle', frequency: 2093 }, gainDb: -31, envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.04 } },
    { id: 'edge', source: { type: 'noise', color: 'white' }, gainDb: -33, envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.025 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 3200, q: 1.5 }] },
  ] }),
  halo: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.07, layers: [
    { id: 'ring', source: { type: 'oscillator', waveform: 'sine', frequency: 1046.5 }, gainDb: -29, envelope: { attack: 0.004, decay: 0.05, sustain: 0.1, release: 0.12 } },
    { id: 'overtone', source: { type: 'oscillator', waveform: 'sine', frequency: 2616 }, gainDb: -38, envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.06 } },
  ] }),
  pulse: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.18, layers: [
    { id: 'bloom', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 196], [0.18, 65.4]], curve: 'exponential' } }, gainDb: -22, envelope: { attack: 0.008, decay: 0.12, sustain: 0.1, release: 0.13 } },
    { id: 'aura', source: { type: 'oscillator', waveform: 'triangle', frequency: 523.25 }, gainDb: -32, envelope: { attack: 0.025, decay: 0.1, sustain: 0.1, release: 0.16 } },
  ] }),
  'enemy-hit': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.025, layers: [
    { id: 'tap', source: { type: 'oscillator', waveform: 'triangle', frequency: { random: [260, 310] } }, gainDb: -34, envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.025 } },
  ] }),
  'enemy-defeated': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.06, layers: [
    { id: 'dissolve', source: { type: 'noise', color: 'white' }, gainDb: -34, envelope: { attack: 0.004, decay: 0.045, sustain: 0, release: 0.07 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1200, q: 0.7 }] },
    { id: 'mote', source: { type: 'oscillator', waveform: 'sine', frequency: 659.25 }, gainDb: -35, envelope: { attack: 0.002, decay: 0.04, sustain: 0, release: 0.07 } },
  ] }),
  'player-hit': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.12, layers: [
    { id: 'wound', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 146.8], [0.12, 73.4]], curve: 'exponential' } }, gainDb: -19, envelope: { attack: 0.003, decay: 0.08, sustain: 0.15, release: 0.14 } },
    { id: 'crack', source: { type: 'noise', color: 'white' }, gainDb: -25, envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.035 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1300, q: 0.7 }] },
  ] }),
  pickup: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.045,
    parameters: { cluster: { min: 0, max: 1, default: 0, mode: 'play' } }, layers: [
      { id: 'gem', source: { type: 'oscillator', waveform: 'sine', frequency: { control: 'cluster', range: [1318.5, 1760], scale: 'exponential' } }, gainDb: -28, envelope: { attack: 0.002, decay: 0.03, sustain: 0.15, release: 0.075 } },
    ] }),
  upgrade: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.15, layers: [
    { id: 'root', source: { type: 'oscillator', waveform: 'sine', frequency: 523.25 }, gainDb: -22, envelope: { attack: 0.004, decay: 0.08, sustain: 0.25, release: 0.2 } },
    { id: 'third', source: { type: 'oscillator', waveform: 'sine', frequency: 659.25 }, gainDb: -26, envelope: { attack: 0.03, decay: 0.07, sustain: 0.3, release: 0.2 } },
    { id: 'fifth', source: { type: 'oscillator', waveform: 'sine', frequency: 784 }, gainDb: -26, envelope: { attack: 0.06, decay: 0.06, sustain: 0.3, release: 0.22 } },
  ], effects: [{ type: 'delay', time: 0.095, feedback: 0.12, mix: 0.15 }] }),
  evolution: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.35, layers: [
    { id: 'ascend', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 392], [0.16, 784], [0.3, 1568]], curve: 'exponential' } }, gainDb: -23, envelope: { attack: 0.015, decay: 0.2, sustain: 0.4, release: 0.28 } },
    { id: 'crown', source: { type: 'oscillator', waveform: 'sine', frequency: 1174.7 }, gainDb: -26, envelope: { attack: 0.12, decay: 0.15, sustain: 0.4, release: 0.3 } },
  ], effects: [{ type: 'delay', time: 0.12, feedback: 0.2, mix: 0.18 }] }),
  elite: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.4, layers: [
    { id: 'omen', source: { type: 'oscillator', waveform: 'triangle', frequency: 98 }, gainDb: -23, envelope: { attack: 0.035, decay: 0.18, sustain: 0.4, release: 0.22 } },
    { id: 'discord', source: { type: 'oscillator', waveform: 'sine', frequency: 207.65 }, gainDb: -28, envelope: { attack: 0.08, decay: 0.15, sustain: 0.3, release: 0.3 } },
  ] }),
  victory: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.55, layers: [
    { id: 'dawn', source: { type: 'oscillator', waveform: 'triangle', frequency: 523.25 }, gainDb: -25, envelope: { attack: 0.015, decay: 0.18, sustain: 0.45, release: 0.35 } },
    { id: 'light', source: { type: 'oscillator', waveform: 'sine', frequency: 659.25 }, gainDb: -24, envelope: { attack: 0.07, decay: 0.18, sustain: 0.4, release: 0.4 } },
    { id: 'sky', source: { type: 'oscillator', waveform: 'sine', frequency: 1046.5 }, gainDb: -27, envelope: { attack: 0.14, decay: 0.18, sustain: 0.4, release: 0.45 } },
  ], effects: [{ type: 'delay', time: 0.16, feedback: 0.18, mix: 0.15 }] }),
  defeat: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.45, layers: [
    { id: 'ember', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 293.66], [0.4, 146.83]], curve: 'exponential' } }, gainDb: -23, envelope: { attack: 0.01, decay: 0.25, sustain: 0.25, release: 0.35 } },
    { id: 'shadow', source: { type: 'oscillator', waveform: 'triangle', frequency: 174.61 }, gainDb: -29, envelope: { attack: 0.04, decay: 0.25, sustain: 0.2, release: 0.3 } },
  ] }),
};
