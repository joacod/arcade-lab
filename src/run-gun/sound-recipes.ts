import { defineSound, type Recipe } from 'audiobits';
// Short dry rifle transients leave space for the slower launch and explosion tails.
function crack(duration: number, frequency: number, bass: number, gain = -26): Recipe {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'mechanism', source: { type: 'noise', color: 'white' }, gainDb: gain,
      envelope: { attack: .001, decay: duration * .35, sustain: 0, release: duration * .6 },
      effects: [{ type: 'filter', filter: 'bandpass', frequency: { points: [[0, frequency], [duration, frequency * .4]], curve: 'exponential' }, q: .7 }] },
    { id: 'body', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, bass], [duration, 45]], curve: 'exponential' } }, gainDb: gain - 1,
      envelope: { attack: .001, decay: duration * .5, sustain: 0, release: duration * .45 } },
  ] });
}
function explosion(): Recipe {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .72, layers: [
    { id: 'pressure', source: { type: 'oscillator', waveform: 'sine', frequency: { points: [[0, 155], [.07, 65], [.65, 28]], curve: 'exponential' } }, gainDb: -18,
      envelope: { attack: .002, decay: .32, sustain: .04, release: .35 } },
    { id: 'fire', source: { type: 'noise', color: 'white' }, gainDb: -22,
      envelope: { attack: .003, decay: .25, sustain: .1, release: .4 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 4200], [.16, 1000], [.7, 180]], curve: 'exponential' }, q: .6 }] },
    { id: 'shrapnel', source: { type: 'noise', color: 'white' }, gainDb: -29,
      envelope: { attack: .025, decay: .13, sustain: 0, release: .2 }, effects: [{ type: 'filter', filter: 'highpass', frequency: 3400, q: .7 }] },
  ] });
}
function signal(notes: readonly [number, number, number], duration: number): Recipe {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'radio', source: { type: 'oscillator', waveform: 'square', frequency: { points: [[0, notes[0]], [duration * .28, notes[1]], [duration * .55, notes[2]]], curve: 'exponential' } }, gainDb: -31,
      envelope: { attack: .005, decay: duration * .5, sustain: .15, release: duration * .4 }, effects: [{ type: 'filter', filter: 'lowpass', frequency: 1800, q: .6 }] },
    { id: 'harmonic', source: { type: 'oscillator', waveform: 'sine', frequency: notes[2] * 1.5 }, gainDb: -35,
      envelope: { attack: .04, decay: duration * .5, sustain: .05, release: duration * .35 } },
  ], effects: [{ type: 'delay', time: .12, feedback: .12, mix: .1 }] });
}
export const blastRecipes = {
  shot: crack(.085, 2900, 190), launch: crack(.3, 750, 150, -23), throw: crack(.17, 1700, 310, -29),
  impact: crack(.07, 3400, 360, -31), terrain: crack(.22, 1200, 95, -30),
  explosion: explosion(), chain: crack(.23, 2500, 230, -28), hit: crack(.11, 1800, 220, -29), kill: crack(.28, 820, 180, -27),
  hurt: crack(.25, 1650, 140, -25), death: signal([220, 110, 55], .75),
  rescue: signal([330, 495, 660], .8), switch: signal([330, 440, 550], .22), checkpoint: signal([262, 330, 392], .45),
  alarm: signal([440, 330, 440], .8), extract: signal([330, 440, 660], .8), victory: signal([392, 587, 784], 1.1), defeat: signal([196, 147, 73.5], .9),
  jump: crack(.08, 600, 140, -36),
};
