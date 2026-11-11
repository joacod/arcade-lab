import { test, expect, type Page } from '@playwright/test';

// Native resume promises and node cleanup need a browser. Recipe validation stays in Node.
async function fixture(page: Page) {
  await page.addInitScript(() => {
    const probe = { contexts: [] as AudioContext[], live: new Set<AudioNode>(), starts: 0,
      held: [] as (() => void)[], hold: false, fail: false };
    (window as any).audioProbe = probe;
    const Original = window.AudioContext;
    function track<T extends OscillatorNode | AudioBufferSourceNode>(source: T): T {
      const start = source.start.bind(source), disconnect = source.disconnect.bind(source);
      source.start = ((...args: any[]) => {
        probe.starts++; probe.live.add(source); (start as any)(...args);
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
  });
  await page.goto('/');
  await page.evaluate(async () => {
    const ownerPath = '/src/engine/browser/audio.ts', recipesPath = '/src/games/skybreak/sound-recipes.ts';
    const [{ createGameAudio }, { skybreakRecipes }] = await Promise.all([import(ownerPath), import(recipesPath)]);
    const w = window as any;
    w.messages = [];
    w.owner = createGameAudio({ 'skybreak/shot': skybreakRecipes.shot, 'skybreak/victory': skybreakRecipes.victory }, (message: string) => w.messages.push(message));
    for (const [label, action] of Object.entries({
      'Audio play': () => w.owner.activate(),
      'Audio retry': () => { w.owner.reset(); w.owner.activate(); },
    })) {
      const button = document.createElement('button'); button.textContent = label;
      button.addEventListener('click', action); document.body.append(button);
    }
  });
}

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
  // Pause must cut the entire fanfare, including layers scheduled after this gesture.
  expect(await page.evaluate(() => {
    const w = window as any;
    w.owner.reset();
    const played = w.owner.play('skybreak/victory');
    const allocated = w.audioProbe.live.size > 0;
    w.owner.pause();
    return { played, allocated, live: w.audioProbe.live.size };
  })).toEqual({ played: true, allocated: true, live: 0 });
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
