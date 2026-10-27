import { test, expect } from '@playwright/test';

test('Midnight Circuit controls, interruption, restart, finale and switching own one clean session', async ({ page }, info) => {
  const errors: string[] = [], unrelated: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/src\/(three|vgpu|skybreak|platformer)\//.test(request.url())) unrelated.push(request.url()); });
  await page.route(/\/src\/brawler\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = (...args) => { const run = original(...args); window.circuitProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    const contexts: AudioContext[] = []; (window as any).circuitContexts = contexts;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original { constructor(options?: AudioContextOptions) { super(options); contexts.push(this); } };
  });
  await page.clock.install(); await page.goto('/'); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.evaluate(() => {
    const frames = new Set<number>(); (window as any).circuitFrames = frames;
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => { const id = request(now => { frames.delete(id); callback(now); }); frames.add(id); return id; };
    window.cancelAnimationFrame = id => { frames.delete(id); cancel(id); };
  });
  await page.getByRole('button', { name: 'Play Midnight Circuit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'MIDNIGHT CIRCUIT', exact: true })).toBeVisible(); await page.clock.runFor(50);
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).circuitProbe)));
  await page.screenshot({ path: info.outputPath('midnight-title.png') });
  expect((await state()).elapsed).toBe(0); expect(await page.evaluate(() => (window as any).circuitContexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Hit the streets', exact: false }).click(); await page.clock.runFor(50);
  await page.keyboard.down('d'); await page.clock.runFor(1150); await page.keyboard.up('d');
  expect((await state()).gated).toBe(true); expect((await state()).enemies.length).toBe(2);
  await page.keyboard.down('j'); await page.clock.runFor(400); await page.keyboard.up('j');
  const firstSwing = (await state()).nextSwing; await page.clock.runFor(250); expect((await state()).nextSwing).toBe(firstSwing);
  await page.keyboard.down('Space'); await page.keyboard.down('j'); await page.clock.runFor(150);
  expect((await state()).player.elevation).toBeGreaterThan(20); expect((await state()).player.attack.kind).toBe('air');
  await page.keyboard.up('Space'); await page.keyboard.up('j');
  await page.keyboard.press('Escape'); const paused = await state(); await page.clock.fastForward(60000); expect(await state()).toEqual(paused);
  await page.getByRole('button', { name: 'Resume fight', exact: false }).click(); await page.clock.runFor(700);
  await page.screenshot({ path: info.outputPath('midnight-street.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(50);
  await expect(page.getByRole('button', { name: 'Resume fight', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Restart run', exact: true }).click(); await page.clock.runFor(50);
  expect((await state()).player.x).toBe(130); expect((await state()).score).toBe(0); expect((await state()).lives).toBe(3);
  const touch = await page.context().newCDPSession(page);
  const point = async (name: string, id: number) => { const b = (await page.getByRole('button', { name, exact: true }).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2, id }; };
  const right = await point('Move right', 1), light = await point('Light attack', 2), up = await point('Move up lane', 3);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right, up] }); await page.clock.runFor(200);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right, up, light] }); await page.clock.runFor(100);
  expect((await state()).player.x).toBeGreaterThan(150); expect((await state()).player.lane).toBeLessThan(80);
  expect((await state()).player.attack.kind).toBe('jab');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await page.clock.runFor(500);
  const stopped = await state(); await page.clock.runFor(150); expect((await state()).player.x).toBe(stopped.player.x); expect((await state()).player.lane).toBe(stopped.player.lane);
  expect(await page.locator('[data-held]').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: info.outputPath('midnight-phone.png') });
  // Keyboard activation of a focused touch button must survive the focus-clear binding.
  await page.getByRole('button', { name: 'Jump', exact: true }).focus(); await page.keyboard.press('Space');
  await page.clock.runFor(150); expect((await state()).player.elevation).toBeGreaterThan(20);
  await page.clock.runFor(700);
  await page.keyboard.down('d'); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.clock.runFor(1000); await page.keyboard.up('d');
  await expect(page.getByRole('button', { name: 'Resume fight', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Resume fight', exact: false }).click(); const resumed = await state(); await page.clock.runFor(100);
  expect((await state()).player.x).toBe(resumed.player.x);
  // One outcome fixture exercises the real boss kill and composition; invariants traverse the complete campaign.
  await page.setViewportSize({ width: 1280, height: 900 }); await page.clock.runFor(50);
  await page.getByRole('button', { name: 'Resume fight', exact: false }).click();
  await page.evaluate(() => { const r = (window as any).circuitProbe; r.stageIndex = 1; r.encounter = 2; r.gated = false; r.enemies = []; r.player.x = 2380; r.player.lane = 95; });
  await page.clock.runFor(1000); await expect(page.getByLabel('Circuit Warden health', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('midnight-station.png') });
  await page.evaluate(() => { const r = (window as any).circuitProbe, b = r.enemies[0]; b.health = 1; b.cooldown = 999; b.attack = null; r.player.x = b.x - 50; r.player.lane = b.lane; r.player.facing = 1; r.player.immune = 10; r.player.stun = 0; });
  await page.keyboard.press('k'); await page.clock.runFor(3100);
  await expect(page.getByRole('heading', { name: 'LET THERE BE LIGHT.' })).toBeVisible();
  await expect(page.getByLabel('Run results', { exact: true })).toContainText('CITY GRID: ONLINE');
  await page.getByRole('button', { name: 'Restart run', exact: true }).click(); await page.clock.runFor(50);
  expect((await state()).stageIndex).toBe(0); expect((await state()).hits).toBe(0);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => ({ frames: (window as any).circuitFrames.size, audio: (window as any).circuitContexts.map((c: AudioContext) => c.state) }))).toEqual({ frames: 0, audio: ['closed'] });
  await page.getByRole('button', { name: 'Play Midnight Circuit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'MIDNIGHT CIRCUIT', exact: true })).toBeVisible(); await page.clock.runFor(50);
  expect((await state()).elapsed).toBe(0); expect(await page.evaluate(() => (window as any).circuitFrames.size)).toBe(1);
  await page.evaluate(() => { window.AudioContext = class { constructor() { throw new Error('Unavailable'); } } as unknown as typeof AudioContext; });
  await page.getByRole('button', { name: 'Hit the streets', exact: false }).click(); await page.clock.runFor(100);
  expect((await state()).elapsed).toBeGreaterThan(0); await page.keyboard.press('Escape');
  await expect(page.locator('.circuit-sound-status')).toContainText('Sound unavailable');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await page.evaluate(() => (window as any).circuitFrames.size)).toBe(0);
  expect(unrelated).toEqual([]); expect(errors).toEqual([]);
});
