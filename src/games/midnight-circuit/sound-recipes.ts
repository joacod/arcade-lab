import { defineSound } from 'audiobits';

// Cloth on a miss, a short skin snap on contact, chest weight only on committed blows.
function swing(heavy: boolean) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration: heavy ? .22 : .13, layers: [
    { id: 'sleeve', source: { type: 'noise', color: 'white' }, gainDb: heavy ? -29 : -33,
      envelope: { attack: heavy ? .025 : .012, decay: heavy ? .17 : .1, sustain: 0, release: .015 },
      effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, heavy ? 500 : 1100], [.1, heavy ? 1800 : 2600]], curve: 'exponential' }, q: .65 }] },
  ] });
}
function contact(bass: number, duration: number, snap: number) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration,
    parameters: { strength: { min: 0, max: 1, default: .65, mode: 'play' } }, layers: [
      { id: 'chest', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, bass], [.027, bass * .52], [duration, 48]], curve: 'exponential' } },
        gainDb: { control: 'strength', range: [-31, -21], scale: 'linear' }, envelope: { attack: .002, decay: duration * .85, sustain: 0, release: .025 } },
      { id: 'skin-snap', source: { type: 'noise', color: 'white' }, gainDb: { control: 'strength', range: [-33, -23], scale: 'linear' },
        envelope: { attack: .002, decay: .04, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: { random: [snap * .92, snap * 1.08] }, q: .6 }] },
      { id: 'clothing', source: { type: 'noise', color: 'white' }, gainDb: { control: 'strength', range: [-40, -32], scale: 'linear' },
        envelope: { attack: .004, decay: duration * .65, sustain: 0, release: .02 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 680, q: .6 }] },
    ] });
}
// Power-grid signals use clean electronic intervals, never the timbre of a landed punch.
function relay(root: number, duration: number, ratio = 1.5) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'indicator', source: { type: 'oscillator', waveform: 'triangle', frequency: root }, gainDb: -29,
      envelope: { attack: .006, decay: duration * .8, sustain: .025, release: .06 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1800, q: .6 }] },
    { id: 'voltage', source: { type: 'oscillator', waveform: 'sine', frequency: root * ratio }, gainDb: -33,
      envelope: { attack: duration * .12, decay: duration * .75, sustain: .025, release: .06 } },
  ], effects: [{ type: 'delay', time: .093, feedback: .1, mix: .09 }] });
}
export const circuitRecipes = {
  swing: swing(false), heavySwing: swing(true),
  hit: contact(185, .13, 1700), heavy: contact(112, .26, 950),
  finisher: contact(145, .22, 2300), air: contact(205, .18, 1450),
  damage: contact(125, .27, 1250),
  ko: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .34, layers: [
    { id: 'road-contact', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 100], [.07, 48]], curve: 'exponential' } }, gainDb: -25,
      envelope: { attack: .005, decay: .23, sustain: 0, release: .025 } },
    { id: 'asphalt', source: { type: 'noise', color: 'white' }, gainDb: -29,
      envelope: { attack: .008, decay: .3, sustain: 0, release: .025 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 1200], [.32, 280]], curve: 'exponential' }, q: .7 }] },
  ] }),
  jump: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .12, layers: [
    { id: 'shoe-scuff', source: { type: 'noise', color: 'white' }, gainDb: -35,
      envelope: { attack: .006, decay: .09, sustain: 0, release: .015 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 1600, q: .7 }] },
  ] }),
  boss: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .48, layers: [
    { id: 'transformer', source: { type: 'oscillator', waveform: 'sawtooth', frequency: { points: [[0, 65.4], [.46, 130.8]], curve: 'exponential' } }, gainDb: -31,
      envelope: { attack: .025, decay: .4, sustain: .04, release: .045 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 250], [.45, 1200]], curve: 'exponential' }, q: 1.1 }] },
    { id: 'arcing-relay', source: { type: 'noise', color: 'white' }, gainDb: -34,
      envelope: { attack: .02, decay: .36, sustain: 0, release: .03 }, effects: [{ type: 'filter', filter: 'bandpass', frequency: 2200, q: 1.6 }] },
  ] }),
  encounter: relay(164.81, .22, 1.06), clear: relay(329.63, .38),
  pickup: relay(659.25, .3, 1.25), respawn: relay(261.63, .6, 2),
  stage: relay(220, .68), victory: relay(329.63, 1.05, 2), gameover: relay(110, .85, 1.1892),
};
