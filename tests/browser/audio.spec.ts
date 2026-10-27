import { test, expect } from '@playwright/test';

// Observe native resources/output while exercising the installed runtime, without production probes.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.audioProbe = { contexts: [], live: new Set(), starts: 0, peakSources: 0, held: [], hold: false, fail: false };
    const probe = w.audioProbe, Original = window.AudioContext;
    function track<T extends OscillatorNode | AudioBufferSourceNode>(source: T): T {
      const start = source.start.bind(source), disconnect = source.disconnect.bind(source);
      source.start = ((...args: any[]) => {
        probe.starts++; probe.live.add(source); probe.peakSources = Math.max(probe.peakSources, probe.live.size);
        (start as any)(...args);
      }) as typeof source.start;
      source.disconnect = (() => { probe.live.delete(source); disconnect(); }) as typeof source.disconnect;
      return source;
    }
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) { super(options); probe.contexts.push(this); }
      override createOscillator() { return track(super.createOscillator()); }
      override createBufferSource() { return track(super.createBufferSource()); }
      override resume() {
        if (probe.fail) { probe.fail = false; return Promise.reject(new Error('Blocked activation')); }
        const resumed = super.resume();
        return probe.hold ? resumed.then(() => new Promise<void>(resolve => probe.held.push(resolve))) : resumed;
      }
    };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination: any, ...args: any[]) {
      const result = (connect as any).call(this, destination, ...args);
      if (destination === this.context.destination) {
        const analyser = this.context.createAnalyser(); analyser.fftSize = 2048;
        (connect as any).call(this, analyser);
        probe.analyser = analyser;
      }
      return result;
    };
  });
});

async function fixture(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const ownerPath = '/src/browser/audio.ts', clearingPath = '/src/sound-recipes.ts', skyPath = '/src/skybreak/sound-recipes.ts', hollowPath = '/src/platformer/sound-recipes.ts', circuitPath = '/src/brawler/sound-recipes.ts', duelPath = '/src/fighter/sound-recipes.ts', blastPath = '/src/run-gun/sound-recipes.ts';
    const [{ createGameAudio }, { clearingRecipes }, { skybreakRecipes }, { hollowRecipes }, { circuitRecipes }, { duelRecipes }, { blastRecipes }] = await Promise.all([import(ownerPath), import(clearingPath), import(skyPath), import(hollowPath), import(circuitPath), import(duelPath), import(blastPath)]);
    const w = window as any;
    w.recipes = Object.fromEntries([
      ...Object.entries(clearingRecipes).map(([cue, recipe]) => [`clearing/${cue}`, recipe]),
      ...Object.entries(skybreakRecipes).map(([cue, recipe]) => [`skybreak/${cue}`, recipe]),
      ...Object.entries(hollowRecipes).map(([cue, recipe]) => [`hollow/${cue}`, recipe]),
      ...Object.entries(circuitRecipes).map(([cue, recipe]) => [`circuit/${cue}`, recipe]),
      ...Object.entries(duelRecipes).map(([cue, recipe]) => [`duel/${cue}`, recipe]),
      ...Object.entries(blastRecipes).map(([cue, recipe]) => [`blastline/${cue}`, recipe]),
    ]);
    w.messages = [];
    w.owner = createGameAudio(w.recipes, (message: string) => w.messages.push(message));
    for (const [label, action] of Object.entries({
      'Audio play': () => w.owner.activate(),
      'Audio retry': () => { w.owner.reset(); w.owner.activate(); },
    })) {
      const button = document.createElement('button'); button.textContent = label;
      button.addEventListener('click', action); document.body.append(button);
    }
  });
}

test('AudioBits recipes produce finite signal, bound burst resources and cancel tails on pause/mute/disposal', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await fixture(page);
  expect(await page.evaluate(() => (window as any).audioProbe.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Audio play', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).messages.at(-1))).toBe('');
  const signals = await page.evaluate(async () => {
    const w = window as any, result = [];
    for (const cue of Object.keys(w.recipes)) {
      const variants = cue === 'clearing/pickup' ? [{ cluster: 0 }, { cluster: 1 }] : cue === 'hollow/land' || /^circuit\/(hit|heavy|finisher|air|damage)$/.test(cue) ? [{ strength: 0 }, { strength: 1 }] : [undefined];
      for (const parameters of variants) {
        w.owner.reset();
        const played = w.owner.play(cue, { seed: 42, parameters });
        // Sample across onset: the shortest cues have already ended after 100ms.
        let peak = 0, finite = true;
        const samples = new Float32Array(2048);
        for (let i = 0; i < 8; i++) {
          await new Promise(resolve => setTimeout(resolve, 15));
          w.audioProbe.analyser.getFloatTimeDomainData(samples);
          finite &&= samples.every(Number.isFinite);
          peak = Math.max(peak, ...samples.map(Math.abs));
        }
        result.push({ cue, played, finite, peak });
      }
    }
    return result;
  });
  for (const result of signals) {
    expect(result.played, result.cue).toBe(true); expect(result.finite, result.cue).toBe(true);
    expect(result.peak, result.cue).toBeGreaterThan(0.000001); expect(result.peak, result.cue).toBeLessThan(1);
  }
  const burst = await page.evaluate(() => {
    const w = window as any; w.owner.reset(); w.audioProbe.peakSources = 0;
    const cues = Object.keys(w.recipes);
    for (let i = 0; i < 500; i++) w.owner.play(cues[i % cues.length], { seed: i });
    const peak = w.audioProbe.peakSources;
    w.owner.pause();
    const stopped = w.audioProbe.live.size;
    const before = w.audioProbe.starts;
    for (const cue of cues) w.owner.play(cue);
    return { peak, stopped, queued: w.audioProbe.starts - before };
  });
  expect(burst.peak).toBeLessThanOrEqual(36); expect(burst.peak).toBeGreaterThan(0);
  expect(burst.stopped).toBe(0); expect(burst.queued).toBe(0);
  await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.at(-1).state)).toBe('suspended');
  await page.getByRole('button', { name: 'Audio retry', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.at(-1).state)).toBe('running');
  expect(await page.evaluate(() => {
    const w = window as any, before = w.audioProbe.starts;
    w.owner.setVolume(0); w.owner.play('clearing/spark');
    return w.audioProbe.starts - before;
  })).toBe(0);
  await page.evaluate(() => { const w = window as any; w.owner.pause(); w.owner.setVolume(1); });
  await page.getByRole('button', { name: 'Audio retry', exact: true }).click();
  await page.evaluate(() => {
    const w = window as any; w.owner.play('clearing/evolution'); w.owner.setMuted(true); w.owner.play('skybreak/shot');
  });
  expect(await page.evaluate(() => (window as any).audioProbe.live.size)).toBe(0);
  await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.at(-1).state)).toBe('suspended');
  await page.evaluate(() => { const w = window as any; w.owner.dispose(); w.owner.dispose(); });
  await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.every((c: AudioContext) => c.state === 'closed'))).toBe(true);
  // Exercise the real adapters: one onset per frame, throttling, and milestone preemption.
  await page.evaluate(async () => {
    const clearingPath = '/src/sound.ts', skyPath = '/src/skybreak/sound.ts', hollowPath = '/src/platformer/sound.ts', circuitPath = '/src/brawler/sound.ts', duelPath = '/src/fighter/sound.ts', blastPath = '/src/run-gun/sound.ts';
    const [clearing, sky, hollow, circuit, duel, blast] = await Promise.all([import(clearingPath), import(skyPath), import(hollowPath), import(circuitPath), import(duelPath), import(blastPath)]);
    const w = window as any;
    w.cueAdapters = [clearing.createSound(() => {}), sky.createSound(() => {}), hollow.createSound(() => {}), circuit.createSound(() => {}), duel.createSound(() => {}), blast.createSound(() => {})];
    const button = document.createElement('button'); button.textContent = 'Activate adapters';
    button.onclick = () => w.cueAdapters.forEach((adapter: any) => adapter.activate()); document.body.append(button);
  });
  await page.getByRole('button', { name: 'Activate adapters' }).click();
  const coalescing = await page.evaluate(() => {
    const w = window as any;
    return w.cueAdapters.map((adapter: any, i: number) => {
      const event = i === 4 ? { type: 'hit', x: 400, z: 80, fighter: 1, strength: .8 } : i === 3 ? { type: 'hit', x: 100, lane: 90, strength: .8, attack: 'jab', player: false } : i === 2 ? { type: 'jump', x: 100, y: 650, strength: 1 } : i ? { type: 'shot', x: 240, y: 660 } : { type: 'shot', weapon: 'spark', x: 480, y: 320, at: 0 };
      const before = w.audioProbe.starts;
      adapter.consume(Array(200).fill(event), { x: 240 }); const first = w.audioProbe.starts - before;
      adapter.consume([event], { x: 240 }); const repeat = w.audioProbe.starts - before - first;
      adapter.consume([event, i === 4 ? { type: 'victory', x: 400, z: 80, fighter: 0, strength: 1 } : i === 3 ? { type: 'victory', x: 100, lane: 90, strength: 1, player: true } : i === 2 ? { type: 'complete', x: 4280, y: 610, strength: 1 } : i ? { type: 'victory', x: 240, y: 660 } : { type: 'outcome', outcome: 'victory', at: 0 }], { x: 240 });
      const milestoneSources = w.audioProbe.live.size;
      adapter.dispose(); return { first, repeat, milestoneSources };
    });
  });
  expect(coalescing).toEqual([...Array(3).fill({ first: 2, repeat: 0, milestoneSources: 3 }), { first: 3, repeat: 0, milestoneSources: 2 }, { first: 2, repeat: 0, milestoneSources: 2 }, { first: 2, repeat: 0, milestoneSources: 2 }]);
  await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.every((c: AudioContext) => c.state === 'closed'))).toBe(true);
  expect(errors).toEqual([]);
});

test('cancelled activation cannot play or report late, and a failed gesture can retry', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await fixture(page);
  await page.evaluate(() => { (window as any).audioProbe.hold = true; });
  await page.getByRole('button', { name: 'Audio play', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).audioProbe.held.length)).toBe(1);
  await page.evaluate(() => {
    const w = window as any;
    w.owner.play('skybreak/shot'); w.owner.pause();
    w.audioProbe.hold = false; w.audioProbe.held.splice(0).forEach((resolve: () => void) => resolve());
  });
  await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts[0].state)).toBe('suspended');
  expect(await page.evaluate(() => ({ messages: (window as any).messages, starts: (window as any).audioProbe.starts }))).toEqual({ messages: [], starts: 0 });
  await page.evaluate(() => { (window as any).audioProbe.fail = true; });
  await page.getByRole('button', { name: 'Audio retry', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).messages.at(-1))).toContain('Sound unavailable');
  await page.getByRole('button', { name: 'Audio retry', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).messages.at(-1))).toBe('');
  expect(await page.evaluate(() => (window as any).owner.play('skybreak/shot'))).toBe(true);
  // A reset followed by a new activation in the same gesture must survive an old cancellation.
  await page.evaluate(() => {
    const w = window as any; w.owner.pause(); w.audioProbe.hold = true;
    const button = document.createElement('button'); button.textContent = 'Race restart';
    button.onclick = () => { w.owner.activate(); w.owner.reset(); w.audioProbe.hold = false; w.owner.activate(); };
    document.body.append(button);
  });
  await page.getByRole('button', { name: 'Race restart' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).owner.play('skybreak/shot'))).toBe(true);
  await page.evaluate(() => {
    const w = window as any;
    w.owner.pause(); w.audioProbe.hold = true; w.owner.activate(); w.owner.dispose();
    w.audioProbe.held.splice(0).forEach((resolve: () => void) => resolve());
  });
  await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.every((c: AudioContext) => c.state === 'closed'))).toBe(true);
  expect(await page.evaluate(() => (window as any).audioProbe.live.size)).toBe(0);
  expect(errors).toEqual([]);
});

test('game sessions suspend for cached pagehide and dispose on final page exit', async ({ page }) => {
  for (const game of ['Last Light Clearing', 'Skybreak', 'Clockwork Hollow']) {
    await page.goto('/');
    await page.getByRole('button', { name: `Play ${game}`, exact: true }).click();
    await page.getByRole('button', { name: game === 'Clockwork Hollow' ? 'Enter the hollow' : game === 'Skybreak' ? 'Take flight' : 'Enter the clearing' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.at(-1)?.state)).toBe('running');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.at(-1).state)).toBe('suspended');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    expect(await page.evaluate(() => (window as any).audioProbe.live.size)).toBe(0);
    await page.getByRole('button', { name: game === 'Clockwork Hollow' ? 'Resume journey' : game === 'Skybreak' ? 'Resume flight' : 'Resume surviving' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.at(-1).state)).toBe('running');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as any).audioProbe.contexts.every((c: AudioContext) => c.state === 'closed'))).toBe(true);
  }
});
