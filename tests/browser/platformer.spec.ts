import { test, expect } from '@playwright/test';

test('Clockwork Hollow movement, touch, outcomes and switching respect session lifetimes', async ({ page }, info) => {
  const errors: string[] = [], foreignRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/src\/(three|vgpu|skybreak)\//.test(request.url())) foreignRequests.push(request.url()); });
  await page.route(/\/src\/platformer\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = (...args) => { const run = original(...args); window.hollowProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    const contexts: AudioContext[] = []; (window as any).hollowContexts = contexts;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original { constructor(options?: AudioContextOptions) { super(options); contexts.push(this); } };
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.evaluate(() => {
    const pending = new Set<number>(); (window as any).hollowFrames = pending;
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => { const id = request(now => { pending.delete(id); callback(now); }); pending.add(id); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  });
  await page.screenshot({ path: info.outputPath('collection.png') });
  await page.getByRole('button', { name: 'Play Clockwork Hollow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Something still ticks.' })).toBeVisible();
  await page.clock.runFor(50);
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).hollowProbe)));
  await page.keyboard.press('d'); await page.clock.runFor(100); expect((await state()).elapsed).toBe(0);
  expect(await page.evaluate(() => (window as any).hollowContexts.length)).toBe(0);
  await page.screenshot({ path: info.outputPath('hollow-title.png') });
  await page.getByRole('button', { name: 'Enter the hollow', exact: false }).click(); await page.clock.runFor(50);
  await page.keyboard.down('d'); await page.clock.runFor(250); await page.keyboard.up('d');
  expect((await state()).player.x).toBeGreaterThan(160);
  await page.clock.runFor(150); const stopped = (await state()).player.x;
  await page.clock.runFor(100); expect((await state()).player.x).toBe(stopped);
  await page.keyboard.down('Space'); await page.clock.runFor(150); const rising = await state();
  expect(rising.player.y).toBeLessThan(580); expect(rising.player.vy).toBeLessThan(-300);
  await page.keyboard.up('Space'); await page.clock.runFor(50); expect((await state()).player.vy).toBeGreaterThan(-150);
  await page.keyboard.press('Escape'); const frozen = await state(); await page.clock.fastForward(60000); expect(await state()).toEqual(frozen);
  await page.getByRole('button', { name: 'Resume journey', exact: false }).click(); await page.clock.runFor(700);
  expect((await state()).player.grounded).toBe(true);
  await page.screenshot({ path: info.outputPath('hollow-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(50);
  await expect(page.getByRole('button', { name: 'Resume journey', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Restart journey', exact: true }).click(); await page.clock.runFor(50);
  expect((await state()).player.x).toBe(110); expect((await state()).collected.some(Boolean)).toBe(false);
  const touch = await page.context().newCDPSession(page);
  const right = (await page.getByRole('button', { name: 'Move right', exact: true }).boundingBox())!;
  const jump = (await page.getByRole('button', { name: 'Jump', exact: true }).boundingBox())!;
  const r = { x: right.x + right.width / 2, y: right.y + right.height / 2, id: 1 };
  const j = { x: jump.x + jump.width / 2, y: jump.y + jump.height / 2, id: 2 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [r] }); await page.clock.runFor(120);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [r, j] }); await page.clock.runFor(180);
  const airborne = await state(); expect(airborne.player.x).toBeGreaterThan(150); expect(airborne.player.y).toBeLessThan(575);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await page.clock.runFor(800);
  const released = await state(); expect(released.player.vx).toBe(0); expect(released.player.grounded).toBe(true);
  await page.clock.runFor(100); expect((await state()).player.x).toBe(released.player.x);
  await page.screenshot({ path: info.outputPath('hollow-narrow.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.keyboard.down('d'); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.clock.runFor(1000);
  await expect(page.getByRole('button', { name: 'Resume journey', exact: false })).toBeVisible();
  const blurred = await state(); await page.keyboard.up('d');
  await page.getByRole('button', { name: 'Resume journey', exact: false }).click(); await page.clock.runFor(100);
  expect((await state()).player.x).toBe(blurred.player.x);
  // Focused outcome fixtures exercise composition; the invariant suite traverses the entire authored route.
  await page.evaluate(() => { const p = (window as any).hollowProbe.player; p.x = 1930; p.y = 650; });
  await page.clock.runFor(50); await expect(page.getByRole('heading', { name: 'A spring out of step.' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again', exact: true }).click(); await page.clock.runFor(50);
  expect((await state()).player.x).toBe(110);
  // Reach a lantern through the rule owner, die, and return without erasing discoveries.
  await page.evaluate(() => { const run = (window as any).hollowProbe; const mote = run.level.motes[0]; run.player.x = mote.x - 13; run.player.y = mote.y - 20; });
  await page.clock.runFor(50); expect((await state()).collected[0]).toBe(true);
  await page.evaluate(() => { const run = (window as any).hollowProbe; Object.assign(run.player, run.level.checkpoints[0], { vx: 0, vy: 0 }); });
  await page.clock.runFor(50); expect((await state()).checkpoint).toBe(0);
  await expect(page.getByLabel('Checkpoint', { exact: true })).toContainText('Moss lantern saved');
  await page.evaluate(() => { const run = (window as any).hollowProbe; run.player.y = run.level.height + 100; });
  await page.clock.runFor(50); const beforeRetry = await state();
  await page.getByRole('button', { name: 'Return to lantern', exact: false }).click(); await page.clock.runFor(50);
  expect((await state()).player.x).toBe(3690); expect((await state()).deaths).toBe(beforeRetry.deaths);
  expect((await state()).elapsed).toBeGreaterThanOrEqual(beforeRetry.elapsed); expect((await state()).collected[0]).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 }); await page.clock.runFor(50);
  await page.getByRole('button', { name: 'Resume journey', exact: false }).click();
  for (let level = 0; level < 3; level++) {
    await page.evaluate(() => { const run = (window as any).hollowProbe; Object.assign(run.player, { x: run.level.goal.x, y: run.level.goal.y + 60, vx: 0, vy: 0 }); });
    await page.clock.runFor(50);
    await page.screenshot({ path: info.outputPath(`hollow-result-${level + 1}.png`) });
    if (level < 2) {
      await expect(page.locator('.hollow-app')).toHaveAttribute('data-screen', 'interlude');
      const interlude = await state(); await page.clock.runFor(5000); expect(await state()).toEqual(interlude);
      await page.getByRole('button', { name: level === 0 ? 'Enter The Emberworks' : 'Enter The Starlit Belfry', exact: false }).click();
      await page.clock.runFor(50); expect((await state()).levelIndex).toBe(level + 1); expect((await state()).checkpoint).toBe(-1);
      expect((await state()).player.x).toBe(110);
      await page.evaluate(() => { const run = (window as any).hollowProbe; Object.assign(run.player, run.level.checkpoints[1], { vx: 0, vy: 0 }); });
      await page.clock.runFor(1500);
      await page.screenshot({ path: info.outputPath(`hollow-level-${level + 2}.png`) });
    }
  }
  await expect(page.getByRole('heading', { name: 'The hollow is awake.' })).toBeVisible();
  await expect(page.getByLabel('Adventure results')).toContainText('3 / 3 bells awakened');
  await expect(page.getByLabel('Adventure results')).toContainText('wind-up motes');
  await page.getByRole('button', { name: 'Walk it again', exact: true }).click(); await page.clock.runFor(50);
  expect((await state()).levelIndex).toBe(0); expect((await state()).deaths).toBe(0); expect((await state()).completed).toBe(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => ({ frames: (window as any).hollowFrames.size, audio: (window as any).hollowContexts.map((c: AudioContext) => c.state) })))
    .toEqual({ frames: 0, audio: ['closed'] });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Play Clockwork Hollow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Something still ticks.' })).toBeVisible();
  expect((await state()).elapsed).toBe(0); expect((await state()).player.x).toBe(110);
  expect(await page.evaluate(() => (window as any).hollowFrames.size)).toBe(1);
  await page.evaluate(() => { window.AudioContext = class { constructor() { throw new Error('Unavailable'); } } as unknown as typeof AudioContext; });
  await page.getByRole('button', { name: 'Enter the hollow', exact: false }).click(); await page.clock.runFor(100);
  expect((await state()).elapsed).toBeGreaterThan(0);
  await page.keyboard.press('Escape'); await expect(page.locator('.hollow-audio-status')).toContainText('Sound unavailable');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await page.evaluate(() => (window as any).hollowFrames.size)).toBe(0);
  expect(foreignRequests).toEqual([]); expect(errors).toEqual([]);
});
