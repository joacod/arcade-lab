import { test, expect } from '@playwright/test';

test('Skybreak sortie controls, suspension, outcomes, and switching release each session', async ({ page }, info) => {
  const errors: string[] = [], graphicsRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/src\/(three|vgpu)\//.test(request.url())) graphicsRequests.push(request.url()); });
  // Observe real run construction without shipping a production debug API.
  await page.route(/\/src\/skybreak\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = () => { const run = original(); window.flightProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    const contexts: AudioContext[] = []; (window as any).flightContexts = contexts;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original { constructor(options?: AudioContextOptions) { super(options); contexts.push(this); } };
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.screenshot({ path: info.outputPath('selection-desktop.png') });
  await page.evaluate(() => {
    const pending = new Set<number>(); (window as any).flightFrames = pending;
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => { const id = request(now => { pending.delete(id); callback(now); }); pending.add(id); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  });
  await page.getByRole('button', { name: 'Play Skybreak', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Own the open sky.' })).toBeVisible();
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).flightProbe)));
  await page.keyboard.press('j'); await page.keyboard.press('d'); await page.keyboard.press('k'); await page.clock.runFor(100);
  expect((await state()).elapsed).toBe(0); // Menu keys cannot control the aircraft.
  await page.getByRole('button', { name: 'Take flight' }).click(); await page.clock.runFor(50);
  await page.keyboard.down('d'); await page.keyboard.down('w'); await page.keyboard.down('Space');
  const start = (await state()).player;
  await page.clock.runFor(250); await page.keyboard.up('d'); await page.keyboard.up('w');
  const moved = await state();
  // Fake-clock frame boundaries can add one 5-unit fixed step.
  expect(Math.abs(Math.hypot(moved.player.x - start.x, moved.player.y - start.y) - 75)).toBeLessThan(6);
  expect(moved.bullets.length).toBeGreaterThan(0);
  await page.keyboard.press('k'); await page.clock.runFor(50);
  expect((await state()).player.roll).toBeGreaterThan(0);
  await page.keyboard.up('Space'); await page.keyboard.press('Escape');
  const frozen = await state(); await page.clock.runFor(60000); expect(await state()).toEqual(frozen);
  await page.getByRole('button', { name: 'Resume flight' }).click(); await page.clock.runFor(100);
  expect((await state()).player.x).toBe(frozen.player.x);
  await page.keyboard.down('j'); await page.clock.runFor(2600); await page.keyboard.up('j');
  await page.screenshot({ path: info.outputPath('skybreak-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(100);
  await expect(page.getByRole('button', { name: 'Resume flight' })).toBeVisible();
  await page.getByRole('button', { name: 'Restart sortie' }).click(); await page.clock.runFor(50);
  expect((await state()).player.lives).toBe(3); expect((await state()).score).toBe(0);
  // Native touchscreen input, including a cancelled gesture and an independent roll tap.
  const touch = await page.context().newCDPSession(page);
  const box = (await page.locator('.skybreak-app .play-surface').boundingBox())!;
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 140, y: box.y + 400, id: 1 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 182, y: box.y + 400, id: 1 }] });
  await page.clock.runFor(200);
  const dragged = await state(); expect(dragged.player.x).toBeGreaterThan(280); expect(dragged.bullets.length).toBeGreaterThan(0);
  const rollBox = (await page.getByRole('button', { name: /Evasive roll/ }).boundingBox())!;
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { x: box.x + 182, y: box.y + 400, id: 1 }, { x: rollBox.x + 30, y: rollBox.y + 20, id: 2 },
  ] });
  await page.clock.runFor(50); expect((await state()).player.roll).toBeGreaterThan(0);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.evaluate(() => {
    const run = (window as any).flightProbe; run.player.recharge = 0; run.player.roll = 0;
    // A pointer's release click must not resubmit the press, even when roll is ready again.
    document.querySelector('.skybreak-evade')!.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
  });
  await page.clock.runFor(50); expect((await state()).player.roll).toBe(0);
  const released = (await state()).player.x; await page.clock.runFor(300);
  expect((await state()).player.x).toBe(released); expect((await state()).player.fireIn).toBe(0);
  await page.clock.runFor(1600);
  await page.screenshot({ path: info.outputPath('skybreak-narrow.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.keyboard.down('d'); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.clock.runFor(10000); const blurred = await state();
  await expect(page.getByRole('button', { name: 'Resume flight' })).toBeVisible();
  await page.keyboard.up('d'); await page.getByRole('button', { name: 'Resume flight' }).click(); await page.clock.runFor(100);
  expect((await state()).player.x).toBe(blurred.player.x);
  await page.evaluate(() => {
    const run = (window as any).flightProbe; run.player.health = 1; run.player.lives = 1; run.player.immunity = 0; run.player.roll = 0;
    run.bullets.push({ x: run.player.x, y: run.player.y - 40, vx: 0, vy: 6000, radius: 5, owner: 'enemy' });
  });
  await page.clock.runFor(50); await expect(page.getByRole('heading', { name: 'Lost over the blue.' })).toBeVisible();
  await page.getByRole('button', { name: 'Fly again', exact: true }).click(); await page.clock.runFor(50);
  expect((await state()).player.lives).toBe(3);
  await page.evaluate(() => {
    const run = (window as any).flightProbe;
    run.elapsed = 120; run.nextWave = 15; run.nextSupply = 9;
    run.pickups.push({ x: run.player.x, y: run.player.y, kind: 'power', age: 0 });
  });
  await page.clock.runFor(50);
  await expect(page.getByLabel('Aircraft weapons')).toContainText('GUN II');
  await expect(page.getByLabel('Iron Tempest hull')).toBeVisible();
  await page.evaluate(() => {
    const run = (window as any).flightProbe, boss = run.boss;
    boss.age = 4; boss.health = 1; boss.y = 150;
    run.bullets.push({ x: boss.x, y: 280, vx: 0, vy: -10000, radius: 3, owner: 'player' });
  });
  await page.clock.runFor(3000); await expect(page.getByRole('heading', { name: 'Clear skies. Welcome home.' })).toBeVisible();
  await expect(page.getByLabel('Flight results')).toContainText('survival bonus');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => ({ frames: (window as any).flightFrames.size, audio: (window as any).flightContexts.map((c: AudioContext) => c.state) })))
    .toEqual({ frames: 0, audio: ['closed'] });
  await page.getByRole('button', { name: 'Play Last Light Clearing', exact: true }).click();
  await expect(page.locator('.asset-status')).toBeHidden();
  await page.getByRole('button', { name: 'Enter the clearing' }).click(); await page.clock.runFor(100);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('.clearing-app')).toHaveCount(0); await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).flightFrames.size)).toBe(0);
  await page.getByRole('button', { name: 'Play Skybreak', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Own the open sky.' })).toBeVisible();
  expect((await state()).elapsed).toBe(0); expect((await state()).player.lives).toBe(3);
  expect(await page.evaluate(() => (window as any).flightFrames.size)).toBe(1);
  await page.evaluate(() => {
    window.AudioContext = class { constructor() { throw new Error('Audio unavailable'); } } as unknown as typeof AudioContext;
  });
  await page.getByRole('button', { name: 'Take flight' }).click(); await page.clock.runFor(100);
  expect((await state()).elapsed).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.skybreak-audio-status')).toContainText('Sound unavailable');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await page.evaluate(() => (window as any).flightFrames.size)).toBe(0);
  expect(await page.evaluate(() => (window as any).flightContexts.every((c: AudioContext) => c.state === 'closed'))).toBe(true);
  expect(graphicsRequests).toEqual([]); expect(errors).toEqual([]);
});
