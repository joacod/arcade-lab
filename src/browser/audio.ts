import { createAudio, type AudioEngine, type Recipe, type Sound, type PlayOptions } from 'audiobits';

export const MAX_VOICES = 12;
const unavailable = 'Sound unavailable. Play continues silently. Use Start, Retry or Resume to try again.';

/** One session owns one lazy AudioBits engine. No game events, recipes or scheduling live here. */
export function createGameAudio<Cue extends string>(recipes: Readonly<Record<Cue, Recipe>>, onStatus: (message: string) => void) {
  let engine: AudioEngine | undefined;
  const sounds = new Map<Cue, Sound>();
  let disposed = false, paused = true, muted = false, volume = 0.45, ready = false;
  let generation = 0, suspending: Promise<void> | undefined;
  const audible = () => !disposed && !paused && !muted && volume > 0;
  const gainDb = () => Math.max(-60, 20 * Math.log10(volume));

  function cancel() {
    // Sound.dispose cuts graphs immediately, even with a suspended clock or delay tails.
    for (const sound of sounds.values()) sound.dispose();
    sounds.clear();
  }
  function suspend() {
    const owned = engine;
    if (!owned || suspending || owned.state === 'closed') return;
    const token = generation;
    const pending = owned.suspend().catch(() => {
      if (!disposed && token === generation) onStatus(unavailable);
    }).finally(() => { if (suspending === pending) suspending = undefined; });
    suspending = pending;
  }
  function silence() {
    generation++; ready = false; cancel(); suspend();
  }
  function retire() {
    cancel();
    // AudioBits disconnects voices and initiates context.close synchronously.
    if (engine) void engine.dispose().catch(() => {});
    engine = undefined; suspending = undefined;
  }
  function activate() {
    if (disposed) return;
    paused = false;
    const token = ++generation;
    ready = false;
    if (!audible()) return;
    try {
      // A pending suspension/start cancellation cannot swallow the new gesture.
      // Ordinary pauses retain the engine; only a race or terminal context replaces it.
      if (suspending || engine?.state === 'closed') retire();
      engine ??= createAudio({ maxVoices: MAX_VOICES, maxVoicesPerSound: 3, masterGainDb: gainDb() });
      const owned = engine;
      // Must execute in the Start/Retry/Resume handler, before any await.
      void owned.start().then(() => {
        if (token !== generation || !audible() || engine !== owned) return;
        owned.master.setGainDb(gainDb());
        owned.setMuted(false); ready = true; onStatus('');
      }).catch(() => {
        if (!disposed && token === generation) { ready = false; onStatus(unavailable); }
      });
    } catch { if (!disposed && token === generation) onStatus(unavailable); }
  }
  return {
    activate,
    /** Cancel a previous run, including its pending readiness. Never queue events. */
    reset() {
      if (disposed) return;
      generation++; cancel();
      if (engine?.state === 'starting') { ready = false; suspend(); }
    },
    pause() { if (!disposed) { paused = true; silence(); } },
    setMuted(value: boolean) {
      if (disposed) return;
      muted = value;
      if (muted) silence(); else if (!paused) activate();
    },
    setVolume(value: number) {
      if (disposed) return;
      volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      if (!volume) silence();
      else if (ready && engine) engine.master.setGainDb(gainDb());
      else if (!paused) activate();
    },
    /** Audio time is presentation-only: adapters use it for cue throttling. */
    get time() { return ready && engine?.state === 'running' ? engine.native.context.currentTime : 0; },
    play(cue: Cue, options?: PlayOptions): boolean {
      if (!audible() || !ready || !engine || engine.state !== 'running') return false;
      // Include retiring/releasing voices. Drop excess instead of stealing an important cue.
      if (engine.counts.active + engine.counts.retiring >= MAX_VOICES) return false;
      try {
        let sound = sounds.get(cue);
        if (!sound) { sound = engine.sound(recipes[cue]); sounds.set(cue, sound); }
        sound.play(options); return true;
      } catch { silence(); onStatus(unavailable); return false; }
    },
    dispose() {
      if (disposed) return;
      disposed = true; generation++; ready = false; retire();
    },
  };
}
