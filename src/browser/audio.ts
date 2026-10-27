export const MAX_VOICES = 12;
export type CueDefinition = readonly [number, number, number, number, OscillatorType];

/** Presentation-only, immediate cues. No timers, music transport or event queue. */
export function createAudio<Cue extends string>(cues: Record<Cue, CueDefinition>, priority: readonly Cue[], onStatus: (message: string) => void) {
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
    consume(events: readonly Cue[]) {
      if (!audible()) return;
      const frame = new Set(events);
      try {
        for (const cue of priority) if (frame.has(cue)) play(cue);
      } catch {
        paused = true; level(); cancel(); suspend();
        onStatus('Sound unavailable. Play continues silently.');
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
