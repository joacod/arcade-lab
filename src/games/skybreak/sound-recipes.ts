import { defineSound } from 'audiobits';

// Aircraft guns are light and dry; armor pings and hull failure occupy different registers.
function detonation(duration: number, gain: number) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'pressure-front', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 120], [.04, 58], [duration, 32]], curve: 'exponential' } }, gainDb: gain,
      envelope: { attack: .003, decay: duration * .87, sustain: 0, release: .035 } },
    { id: 'burning-fuel', source: { type: 'noise', color: 'white' }, gainDb: gain - 2,
      envelope: { attack: .003, decay: duration * .9, sustain: 0, release: .035 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 3200], [duration * .3, 1100], [duration, 180]], curve: 'exponential' }, q: .65 }] },
    { id: 'torn-skin', source: { type: 'noise', color: 'white' }, gainDb: gain - 10,
      envelope: { attack: .012, decay: duration * .35, sustain: 0, release: .02 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2600, q: .9 }] },
  ] });
}
function cockpit(root: number, duration: number, ratio: number) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'instrument', source: { type: 'oscillator', waveform: 'sine', frequency: root }, gainDb: -29,
      envelope: { attack: .004, decay: duration * .83, sustain: .02, release: .025 } },
    { id: 'indicator', source: { type: 'oscillator', waveform: 'triangle', frequency: root * ratio }, gainDb: -36,
      envelope: { attack: .012, decay: duration * .75, sustain: .02, release: .03 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 2200, q: .7 }] },
  ] });
}
export const skybreakRecipes = {
  shot: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .055, layers: [
    { id: 'gun-port', source: { type: 'noise', color: 'white' }, gainDb: -33,
      envelope: { attack: .002, decay: .025, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { random: [2100, 2550] }, q: .7 }] },
    { id: 'mechanism', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 310], [.04, 145]], curve: 'exponential' } }, gainDb: -36,
      envelope: { attack: .002, decay: .04, sustain: 0, release: .01 } },
  ] }),
  hit: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .08, layers: [
    { id: 'thin-metal', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, { random: [1850, 2250] }], [.07, 1250]], curve: 'exponential' } }, gainDb: -35,
      envelope: { attack: .002, decay: .065, sustain: 0, release: .01 } },
    { id: 'sparks', source: { type: 'noise', color: 'white' }, gainDb: -36,
      envelope: { attack: .002, decay: .025, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'highpass', frequency: 2200, q: .7 }] },
  ] }),
  'boss-hit': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .12, layers: [
    { id: 'armor-plate', source: { type: 'oscillator', waveform: 'sine', frequency: { random: [340, 370] } }, gainDb: -31,
      envelope: { attack: .002, decay: .1, sustain: 0, release: .015 } },
    { id: 'plate-mode', source: { type: 'oscillator', waveform: 'sine', frequency: 973 }, gainDb: -37,
      envelope: { attack: .002, decay: .05, sustain: 0, release: .01 } },
    { id: 'ricochet', source: { type: 'noise', color: 'white' }, gainDb: -34,
      envelope: { attack: .002, decay: .025, sustain: 0, release: .01 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2900, q: 1.2 }] },
  ] }),
  explosion: detonation(.27, -27),
  damage: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .28, layers: [
    { id: 'buckled-hull', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 185], [.045, 78], [.27, 52]], curve: 'exponential' } }, gainDb: -24,
      envelope: { attack: .002, decay: .24, sustain: 0, release: .025 } },
    { id: 'fracture', source: { type: 'noise', color: 'white' }, gainDb: -24,
      envelope: { attack: .002, decay: .085, sustain: 0, release: .02 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 950, q: .7 }] },
    { id: 'strained-metal', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 740], [.25, 510]], curve: 'exponential' } }, gainDb: -34,
      envelope: { attack: .003, decay: .23, sustain: 0, release: .02 } },
  ] }),
  evade: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .38, layers: [
    { id: 'slipstream', source: { type: 'noise', color: 'white' }, gainDb: -29,
      envelope: { attack: .035, decay: .31, sustain: 0, release: .025 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, 420], [.11, 2900], [.37, 550]], curve: 'exponential' }, q: 1.1 }] },
    { id: 'airframe', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 145], [.1, 220], [.37, 110]], curve: 'exponential' } }, gainDb: -36,
      envelope: { attack: .035, decay: .3, sustain: 0, release: .025 } },
  ] }),
  warning: cockpit(880, .085, 2),
  life: defineSound({ ...detonation(.52, -24), effects: [{ type: 'filter', filter: 'lowpass', frequency: 1800, q: .7 }] }),
  pickup: cockpit(1174.66, .2, 1.5),
  'boss-warning': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .48, layers: [
    { id: 'target-lock', source: { type: 'oscillator', waveform: 'square', frequency: { points: [[0, 220], [.46, 440]], curve: 'exponential' } }, gainDb: -32,
      envelope: { attack: .008, decay: .15, sustain: .45, release: .04 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1400, q: .8 }] },
    { id: 'danger-interval', source: { type: 'oscillator', waveform: 'sine', frequency: 622.25 }, gainDb: -31,
      envelope: { attack: .012, decay: .4, sustain: .02, release: .04 } },
  ] }),
  'boss-shot': defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .19, layers: [
    { id: 'cannon', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 185], [.035, 70], [.18, 40]], curve: 'exponential' } }, gainDb: -26,
      envelope: { attack: .002, decay: .16, sustain: 0, release: .02 } },
    { id: 'muzzle-pressure', source: { type: 'noise', color: 'white' }, gainDb: -29,
      envelope: { attack: .003, decay: .13, sustain: 0, release: .025 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 2400], [.18, 500]], curve: 'exponential' }, q: .7 }] },
  ] }),
  'boss-break': detonation(.95, -23),
  victory: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .85, layers: [
    { id: 'brass', source: { type: 'oscillator', waveform: 'sawtooth', frequency: 523.25 }, gainDb: -31,
      envelope: { attack: .025, decay: .65, sustain: .05, release: .1 } },
    { id: 'fifth', source: { type: 'oscillator', waveform: 'square', frequency: 783.99 }, gainDb: -36,
      envelope: { attack: .04, decay: .65, sustain: .05, release: .1 } },
    { id: 'octave', source: { type: 'oscillator', waveform: 'triangle', frequency: 1046.5 }, gainDb: -33,
      envelope: { attack: .055, decay: .65, sustain: .025, release: .08 } },
  ], effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 1100], [.09, 2600], [.8, 900]], curve: 'exponential' }, q: .6 }] }),
  defeat: cockpit(164.81, .8, 1.1892),
};
