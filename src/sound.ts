import type { GameEvent } from './game-state.ts';

export const MAX_VOICES = 12;
const cues = {
  shot: [620, 280, 0.07, 0.035, 'triangle'],
  pulse: [130, 55, 0.22, 0.08, 'sine'],
  'enemy-hit': [190, 85, 0.07, 0.025, 'triangle'],
  'player-hit': [95, 42, 0.2, 0.12, 'sawtooth'],
  pickup: [880, 1320, 0.09, 0.055, 'sine'],
  upgrade: [440, 880, 0.22, 0.09, 'triangle'],
  evolution: [660, 1760, 0.35, 0.08, 'sine'],
  victory: [523, 1046, 0.55, 0.1, 'triangle'],
  defeat: [220, 55, 0.5, 0.1, 'triangle'],
} as const;
type Cue = keyof typeof cues;

/** Presentation-only, immediate cues. No timers, music transport or event queue. */
export function createSound(onStatus: (message: string) => void) {
  let context: AudioContext | undefined, master: GainNode | undefined;
  let disposed = false, paused = true, muted = false, volume = 0.45;
  const voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();
  const audible = () => !disposed && !paused && !muted && volume > 0;
  function cancel() {
    if (!context) return;
    const now = context.currentTime;
    for (const voice of voices) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(0, now);
      voice.oscillator.onended = null;
      voice.oscillator.stop(now);
      voice.oscillator.disconnect(); voice.gain.disconnect();
    }
    // Suspended context time cannot finish a fade. Detach now so no old tail can resume.
    voices.clear();
  }
  function level() {
    if (!context || !master) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(audible() ? volume : 0, context.currentTime, 0.008);
  }
  function suspend() {
    if (!context || context.state === 'closed') return;
    const owned = context;
    void owned.suspend().then(() => {
      // A newer user gesture may have resumed while suspension was pending.
      if (audible() && owned.state === 'suspended') void owned.resume().catch(() => {});
    }).catch(() => {});
  }
  function activate() {
    if (disposed) return;
    paused = false;
    try {
      context ??= new AudioContext();
      if (!master) { master = context.createGain(); master.gain.value = 0; master.connect(context.destination); }
      // Called synchronously inside Start/Retry/Resume, before any loading or awaits.
      const owned = context;
      void owned.resume().then(() => {
        if (disposed) return;
        const running = owned.state === 'running';
        if (!audible()) suspend();
        onStatus(running ? '' : 'Sound unavailable. Play continues silently.');
      }).catch(() => onStatus(disposed ? '' : 'Sound unavailable. Play continues silently.'));
      level();
    } catch { onStatus('Sound unavailable. Play continues silently.'); }
  }
  function play(cue: Cue) {
    if (!audible() || !context || !master || context.state !== 'running' || voices.size >= MAX_VOICES) return;
    const [from, to, duration, amplitude, type] = cues[cue], now = context.currentTime;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(amplitude, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(master);
    const voice = { oscillator, gain }; voices.add(voice);
    oscillator.onended = () => { voices.delete(voice); oscillator.disconnect(); gain.disconnect(); oscillator.onended = null; };
    oscillator.start(now); oscillator.stop(now + duration + 0.01);
  }
  return {
    activate,
    reset: cancel,
    pause() { paused = true; level(); cancel(); suspend(); },
    setMuted(value: boolean) { muted = value; level(); if (muted) { cancel(); suspend(); } else if (!paused) activate(); },
    setVolume(value: number) { volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; level(); if (!volume) cancel(); },
    consume(events: readonly GameEvent[]) {
      // Coalesce simultaneous hits and four Shards. Discard silent events immediately.
      if (!audible()) return;
      const frame = new Set<Cue>();
      for (const event of events) {
        const cue = event.type === 'outcome' ? event.outcome : event.type;
        if (cue in cues) frame.add(cue as Cue);
      }
      for (const cue of ['victory', 'defeat', 'evolution', 'upgrade', 'player-hit', 'pickup', 'pulse', 'shot', 'enemy-hit'] as const) {
        if (frame.has(cue)) play(cue);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true; cancel();
      master?.disconnect();
      if (context && context.state !== 'closed') void context.close().catch(() => {});
    },
  };
}
