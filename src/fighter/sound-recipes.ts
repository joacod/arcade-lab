import { defineSound, type Recipe } from 'audiobits';
// Dry air is audible on a miss; only confirmed contact adds weight. Guard has a bright stone ring.
function air(heavy: boolean): Recipe {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration: heavy ? .23 : .13, layers: [
    { id: 'silk', source: { type: 'noise', color: 'white' }, gainDb: heavy ? -26 : -29,
      envelope: { attack: .025, decay: .065, sustain: 0, release: .07 },
      effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, heavy ? 520 : 1300], [.12, heavy ? 2100 : 3800]], curve: 'exponential' }, q: .7 }] },
  ] });
}
function impact(heavy: boolean): Recipe {
  const length = heavy ? .28 : .16, bass = heavy ? 125 : 195;
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration: length, layers: [
    { id: 'body', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, bass], [.05, bass * .45], [length, 45]], curve: 'exponential' } },
      gainDb: heavy ? -19 : -23, envelope: { attack: .002, decay: length * .55, sustain: .05, release: .09 } },
    { id: 'crack', source: { type: 'noise', color: 'white' }, gainDb: -24, envelope: { attack: .001, decay: .035, sustain: 0, release: .045 },
      effects: [{ type: 'filter', filter: 'bandpass', frequency: heavy ? 1100 : 1850, q: .6 }] },
  ] });
}
function chime(notes: readonly [number,number,number], duration: number): Recipe {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'bronze', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0,notes[0]],[duration*.3,notes[1]],[duration*.6,notes[2]]], curve: 'exponential' } }, gainDb: -25,
      envelope: { attack: .005, decay: duration*.6, sustain: .05, release: duration*.3 } },
    { id: 'air', source: { type: 'oscillator', waveform: 'sine', frequency: notes[2]*1.5 }, gainDb: -34,
      envelope: { attack: .04, decay: duration*.55, sustain: .05, release: duration*.3 } },
  ], effects: [{ type: 'delay', time: .13, feedback: .16, mix: .13 }] });
}
export const duelRecipes = {
  swing: air(false), heavySwing: air(true), hit: impact(false), heavyHit: impact(true),
  block: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .2, layers: [
    { id: 'stone', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0,1320],[.18,850]], curve: 'exponential' } }, gainDb: -25, envelope: { attack: .001, decay: .07, sustain: 0, release: .09 } },
    { id: 'grit', source: { type: 'noise', color: 'white' }, gainDb: -31, envelope: { attack: .001, decay: .025, sustain: 0, release: .05 }, effects: [{ type: 'filter', filter: 'highpass', frequency: 2400, q: .7 }] },
  ] }),
  knockdown: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .34, layers: [
    { id: 'floor', source: { type: 'noise', color: 'white' }, gainDb: -26, envelope: { attack: .012, decay: .14, sustain: 0, release: .14 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 440, q: .8 }] },
  ] }),
  special: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .43, layers: [
    { id: 'storm', source: { type: 'oscillator', waveform: 'sawtooth', frequency: { points: [[0,270],[.13,680],[.4,110]], curve: 'exponential' } }, gainDb: -28,
      envelope: { attack: .02, decay: .20, sustain: .1, release: .15 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1800, q: 1.4 }] },
    { id: 'wake', source: { type: 'noise', color: 'white' }, gainDb: -32, envelope: { attack: .04, decay: .17, sustain: 0, release: .15 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2200, q: .7 }] },
  ] }),
  count: chime([330,330,330],.18), fight: chime([220,330,440],.4),
  ko: chime([147,110,55],.8), timeout: chime([294,220,147],.65),
  victory: chime([294,440,587],1.1), defeat: chime([220,165,110],1.0),
};
