import { defineSound } from 'audiobits';

function air(heavy: boolean) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration: heavy ? .23 : .13, layers: [
    { id: 'silk', source: { type: 'noise', color: 'white' }, gainDb: heavy ? -29 : -33,
      envelope: { attack: heavy ? .025 : .012, decay: heavy ? .18 : .1, sustain: 0, release: .015 },
      effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, heavy ? 420 : 1200], [.12, heavy ? 1800 : 3400]], curve: 'exponential' }, q: .7 }] },
  ] });
}
function impact(heavy: boolean) {
  const duration = heavy ? .27 : .15;
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration,
    parameters: { strength: { min: 0, max: 1, default: .65, mode: 'play' } }, layers: [
      { id: 'body', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, heavy ? 135 : 210], [.035, heavy ? 62 : 95], [duration, 46]], curve: 'exponential' } },
        gainDb: { control: 'strength', range: [-30, heavy ? -20 : -23], scale: 'linear' }, envelope: { attack: .002, decay: duration * .88, sustain: 0, release: .025 } },
      { id: 'palm-crack', source: { type: 'noise', color: 'white' }, gainDb: { control: 'strength', range: [-34, -25], scale: 'linear' },
        envelope: { attack: .002, decay: heavy ? .06 : .035, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { random: heavy ? [850, 1100] : [1700, 2100] }, q: .65 }] },
      { id: 'stone-resonance', source: { type: 'oscillator', waveform: 'sine', frequency: heavy ? 307 : 587 }, gainDb: { control: 'strength', range: [-42, -34], scale: 'linear' },
        envelope: { attack: .002, decay: duration * .7, sustain: 0, release: .02 } },
    ] });
}
function gong(root: number, duration: number, gain = -27) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'bronze', source: { type: 'oscillator', waveform: 'sine', frequency: root }, gainDb: gain,
      envelope: { attack: .004, decay: duration * .9, sustain: .01, release: .06 } },
    { id: 'edge', source: { type: 'oscillator', waveform: 'sine', frequency: root * 1.483 }, gainDb: gain - 8,
      envelope: { attack: .003, decay: duration * .62, sustain: 0, release: .03 } },
    { id: 'hammer', source: { type: 'noise', color: 'white' }, gainDb: gain - 9,
      envelope: { attack: .002, decay: .035, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: root * 4.8, q: 1.8 }] },
  ] });
}
export const duelRecipes = {
  swing: air(false), heavySwing: air(true), hit: impact(false), heavyHit: impact(true),
  block: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .22, layers: [
    { id: 'obsidian-face', source: { type: 'oscillator', waveform: 'sine', frequency: { random: [1140, 1185] } }, gainDb: -27,
      envelope: { attack: .002, decay: .19, sustain: 0, release: .02 } },
    { id: 'stone-edge', source: { type: 'oscillator', waveform: 'sine', frequency: 2730 }, gainDb: -35,
      envelope: { attack: .002, decay: .07, sustain: 0, release: .015 } },
    { id: 'guard-contact', source: { type: 'noise', color: 'white' }, gainDb: -30,
      envelope: { attack: .002, decay: .027, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'highpass', frequency: 1900, q: .7 }] },
  ] }),
  knockdown: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .29, layers: [
    { id: 'floor', source: { type: 'noise', color: 'white' }, gainDb: -28,
      envelope: { attack: .009, decay: .25, sustain: 0, release: .02 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 650, q: .8 }] },
    { id: 'slab', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 95], [.16, 42]], curve: 'exponential' } }, gainDb: -28,
      envelope: { attack: .005, decay: .23, sustain: 0, release: .025 } },
  ] }),
  stormglass: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .38, layers: [
    { id: 'storm-thread', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 740], [.07, 1480], [.36, 370]], curve: 'exponential' } }, gainDb: -30,
      envelope: { attack: .012, decay: .33, sustain: 0, release: .03 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 2800, q: .8 }] },
    { id: 'glass', source: { type: 'oscillator', waveform: 'sine', frequency: 2218 }, gainDb: -34,
      envelope: { attack: .004, decay: .23, sustain: 0, release: .025 } },
    { id: 'ion-wake', source: { type: 'noise', color: 'white' }, gainDb: -33,
      envelope: { attack: .015, decay: .3, sustain: 0, release: .03 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 4200], [.37, 900]], curve: 'exponential' }, q: .9 }] },
  ] }),
  riftbreaker: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .46, layers: [
    { id: 'fault', source: { type: 'oscillator', waveform: 'sawtooth', frequency: { points: [[0, 110], [.045, 165], [.44, 41.2]], curve: 'exponential' } }, gainDb: -28,
      envelope: { attack: .008, decay: .4, sustain: 0, release: .03 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 1400], [.45, 200]], curve: 'exponential' }, q: .8 }] },
    { id: 'grinding-stone', source: { type: 'noise', color: 'white' }, gainDb: -27,
      envelope: { attack: .015, decay: .38, sustain: 0, release: .03 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 1250], [.45, 350]], curve: 'exponential' }, q: .75 }] },
    { id: 'rupture', source: { type: 'oscillator', waveform: 'sine', frequency: 58.27 }, gainDb: -26,
      envelope: { attack: .012, decay: .4, sustain: 0, release: .035 } },
  ] }),
  count: gong(440, .19, -31), fight: gong(220, .55, -24),
  ko: gong(73.42, .85, -24), timeout: gong(146.83, .6),
  victory: defineSound({ ...gong(293.66, 1.1, -24), effects: [{ type: 'delay', time: .183, feedback: .15, mix: .13 }] }),
  defeat: gong(110, .95),
};
