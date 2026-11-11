import { defineSound } from 'audiobits';

// Struck porcelain has inharmonic modes, rather than a pitch sweep or a pure chord.
function bell(root: number, duration: number, gain: number) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'bowl', source: { type: 'oscillator', waveform: 'sine', frequency: root }, gainDb: gain,
      envelope: { attack: .003, decay: duration * .92, sustain: .015, release: .08 } },
    { id: 'rim', source: { type: 'oscillator', waveform: 'sine', frequency: root * 2.756 }, gainDb: gain - 10,
      envelope: { attack: .002, decay: duration * .45, sustain: 0, release: .025 } },
    { id: 'crown', source: { type: 'oscillator', waveform: 'sine', frequency: root * 5.404 }, gainDb: gain - 19,
      envelope: { attack: .002, decay: duration * .18, sustain: 0, release: .015 } },
  ] });
}

export const hollowRecipes = {
  jump: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .17, layers: [
    { id: 'wound-spring', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 320], [.045, 680], [.16, 430]], curve: 'exponential' } }, gainDb: -29,
      envelope: { attack: .004, decay: .15, sustain: 0, release: .02 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1600, q: .6 }] },
    { id: 'escapement', source: { type: 'noise', color: 'white' }, gainDb: -32,
      envelope: { attack: .002, decay: .018, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2300, q: 1.8 }] },
  ] }),
  land: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .12,
    parameters: { strength: { min: 0, max: 1, default: .5, mode: 'play' } }, layers: [
      { id: 'stone-contact', source: { type: 'noise', color: 'white' }, gainDb: { control: 'strength', range: [-42, -26], scale: 'linear' },
        envelope: { attack: .002, decay: .055, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { control: 'strength', range: [650, 1800], scale: 'exponential' }, q: .65 }] },
      { id: 'brass-feet', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 205], [.085, 95]], curve: 'exponential' } }, gainDb: { control: 'strength', range: [-42, -29], scale: 'linear' },
        envelope: { attack: .002, decay: .09, sustain: 0, release: .02 } },
      { id: 'ceramic-body', source: { type: 'oscillator', waveform: 'sine', frequency: 1460 }, gainDb: { control: 'strength', range: [-48, -36], scale: 'linear' },
        envelope: { attack: .002, decay: .04, sustain: 0, release: .015 } },
    ] }),
  damage: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .38, layers: [
    { id: 'loose-spring', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 610], [.06, 280], [.16, 360], [.36, 85]], curve: 'exponential' } }, gainDb: -26,
      envelope: { attack: .002, decay: .34, sustain: 0, release: .03 } },
    { id: 'porcelain-fracture', source: { type: 'noise', color: 'white' }, gainDb: -27,
      envelope: { attack: .002, decay: .065, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2450, q: 1.3 }] },
    { id: 'broken-rim', source: { type: 'oscillator', waveform: 'sine', frequency: 1735 }, gainDb: -35,
      envelope: { attack: .002, decay: .19, sustain: 0, release: .025 } },
  ] }),
  interaction: bell(1396.9, .22, -31),
  stomp: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .19, layers: [
    { id: 'beetle-shell', source: { type: 'oscillator', waveform: 'sine', frequency: 510 }, gainDb: -26,
      envelope: { attack: .002, decay: .12, sustain: 0, release: .02 } },
    { id: 'shell-mode', source: { type: 'oscillator', waveform: 'sine', frequency: 1377 }, gainDb: -34,
      envelope: { attack: .002, decay: .055, sustain: 0, release: .015 } },
    { id: 'gear-teeth', source: { type: 'noise', color: 'white' }, gainDb: -30,
      envelope: { attack: .002, decay: .04, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1800, q: 1.7 }] },
  ] }),
  vent: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .43, layers: [
    { id: 'pressure-release', source: { type: 'noise', color: 'white' }, gainDb: -31,
      envelope: { attack: .016, decay: .35, sustain: .025, release: .055 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 2400], [.08, 1600], [.42, 650]], curve: 'exponential' }, q: .65 }] },
    { id: 'pipe-resonance', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 780], [.4, 540]], curve: 'exponential' } }, gainDb: -40,
      envelope: { attack: .03, decay: .32, sustain: 0, release: .035 } },
  ] }),
  checkpoint: bell(698.46, .68, -25),
  level: defineSound({ ...bell(349.23, 1.05, -23), effects: [{ type: 'delay', time: .173, feedback: .13, mix: .12 }] }),
  complete: defineSound({ ...bell(523.25, 1.45, -23), effects: [{ type: 'delay', time: .217, feedback: .19, mix: .16 }] }),
};
