import { openMenu, chooseOption } from '../../menu.ts';
import { test, expect } from '@playwright/test';

test('Blastline mounts lazily, owns simultaneous controls, interrupts safely and disposes its session', async ({ page }, info) => {
  const errors: string[] = [], foreign: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/\/src\/games\/(obsidian-duel|midnight-circuit|clockwork-hollow|skybreak|last-light-clearing)\//.test(r.url()) && !r.url().includes('/art/')) foreign.push(r.url()); });
  await page.route(/\/src\/games\/blastline\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = (...args) => { const run = original(...args); window.blastProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    const contexts: AudioContext[] = []; (window as any).blastContexts = contexts;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original { constructor(options?: AudioContextOptions) { super(options); contexts.push(this); } };
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.evaluate(() => {
    const pending = new Set<number>(); (window as any).blastFrames = pending;
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => { const id = request(now => { pending.delete(id); callback(now); }); pending.add(id); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  });
  await page.getByRole('button', { name: 'Open game: Blastline', exact: true }).click(); await page.clock.runFor(50);
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).blastProbe)));
  await expect(page.locator('.blast-app')).toHaveAttribute('data-screen', 'title');
  expect(await page.evaluate(() => (window as any).blastContexts.length)).toBe(0);
  await page.keyboard.press('j'); await page.clock.runFor(100); expect((await state()).elapsed).toBe(0);
  await page.screenshot({ path: info.outputPath('blastline-title.png') });
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(50);
  // A complete press/release between steps must survive the end of weapon recovery.
  await page.evaluate(() => { (window as any).blastProbe.player.cooldown = .08; });
  await page.keyboard.press('j'); await page.clock.runFor(20);
  expect((await state()).player.fireBuffer).toBeGreaterThan(0);
  expect((await state()).projectiles.length).toBe(0);
  await page.clock.runFor(100);
  expect((await state()).projectiles.length).toBe(1);
  expect((await state()).player.fireBuffer).toBe(0);
  await page.keyboard.down('d'); await page.keyboard.down('j'); await page.clock.runFor(1200);
  await page.keyboard.up('d'); await page.keyboard.up('j'); await page.clock.runFor(100);
  expect((await state()).player.x).toBeGreaterThan(300); expect((await state()).projectiles.length).toBeGreaterThan(0);
  await page.keyboard.down('Space'); await page.clock.runFor(100); expect((await state()).player.vy).toBeLessThan(-200);
  await page.keyboard.up('Space'); await page.clock.runFor(100); expect((await state()).player.vy).toBeGreaterThan(-180);
  await page.keyboard.press('k'); await page.clock.runFor(50); expect((await state()).grenades).toBe(3);
  await page.keyboard.press('Escape'); const frozen = await state(); await page.clock.fastForward(60000); expect(await state()).toEqual(frozen);
  // Replacing presentation must retain the live simulation, including mid-action state.
  await page.evaluate(() => { (window as any).appearanceRun = (window as any).blastProbe; });
  const skyPixel = () => page.locator('.blast-canvas').evaluate((canvas: HTMLCanvasElement) =>
    [...canvas.getContext('2d')!.getImageData(Math.floor(canvas.width / 2), 8, 1, 1).data]);
  const beforeTheme = await skyPixel();
  await openMenu(page);
  await chooseOption(page.getByRole('combobox', { name: 'Theme', exact: true }), 'normal');
  await page.clock.runFor(50);
  await expect(page.locator('.blast-app')).toHaveAttribute('data-appearance', 'normal');
  expect(await skyPixel()).toEqual(beforeTheme);
  expect(await state()).toEqual(frozen);
  expect(await page.evaluate(() => (window as any).appearanceRun === (window as any).blastProbe)).toBe(true);

  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(50);
  await expect(page.locator('.blast-app')).toHaveAttribute('data-appearance', 'normal');
  expect((await state()).player.x).toBe(99); expect((await state()).destroyed).toBe(0); expect((await state()).grenades).toBe(4);
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(50);
  await expect(page.locator('.blast-app')).toHaveAttribute('data-screen', 'paused');
  await page.getByRole('button', { name: 'Resume', exact: false }).click(); await page.clock.runFor(50);
  const cdp = await page.context().newCDPSession(page);
  const point = async (name: string, id: number) => { const r = (await page.getByRole('button', { name, exact: true }).boundingBox())!; return { x: r.x + r.width / 2, y: r.y + r.height / 2, id }; };
  const right = await point('Move right', 1), fire = await point('Fire', 2), jump = await point('Jump', 3);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right, fire] }); await page.clock.runFor(200);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right, fire, jump] }); await page.clock.runFor(180);
  const airborne = await state(); expect(airborne.player.x).toBeGreaterThan(150); expect(airborne.player.y).toBeLessThan(600); expect(airborne.projectiles.length).toBeGreaterThan(0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await page.clock.runFor(800);
  const released = await state(); expect(released.player.vx).toBe(0); expect(released.player.grounded).toBe(true);
  await page.evaluate(() => { const r = (window as any).blastProbe; r.player.cooldown = .08; r.projectiles = []; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [fire] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.clock.runFor(20);
  expect((await state()).player.fireBuffer).toBeGreaterThan(0);
  await page.clock.runFor(100);
  expect((await state()).projectiles.length).toBe(1);
  expect((await state()).player.fireBuffer).toBe(0);
  await page.screenshot({ path: info.outputPath('blastline-touch.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.keyboard.down('d'); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.clock.runFor(1000);
  await expect(page.locator('.blast-app')).toHaveAttribute('data-screen', 'paused'); await page.keyboard.up('d');
  const blurred = await state(); await page.getByRole('button', { name: 'Resume', exact: false }).click(); await page.clock.runFor(100);
  expect((await state()).player.x).toBe(blurred.player.x);
  // Outcome fixtures exercise session composition. The invariant suite traverses authored routes with real actions.
  await page.evaluate(() => { const r = (window as any).blastProbe; Object.assign(r.player, r.mission.rescue, { vx: 0, vy: 0 }); });
  await page.clock.runFor(50); expect((await state()).rescued).toBe(true); expect((await state()).player.operator).toBe('bolt');
  await page.keyboard.press('q'); await page.clock.runFor(50); expect((await state()).player.operator).toBe('nova');
  for (let mission = 0; mission < 2; mission++) {
    await page.evaluate(() => { const r = (window as any).blastProbe; r.relays.forEach((p: any) => p.health = 0); r.enemies.forEach((e: any) => e.health = 0); Object.assign(r.player, { x: r.mission.exit.x + 20, y: 618, vx: 0, vy: 0 }); });
    await page.clock.runFor(3200);
    await expect(page.locator('.blast-app')).toHaveAttribute('data-screen', mission ? 'victory' : 'interlude');
    const result = await state(); await page.clock.runFor(1000); expect(await state()).toEqual(result);
    if (!mission) { await page.getByRole('button', { name: 'Continue', exact: false }).click(); await page.clock.runFor(50); expect((await state()).missionIndex).toBe(1); }
  }
  await expect(page.getByLabel('Operation results', { exact: true })).toContainText('OPERATION COMPLETE');
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(50);
  expect((await state()).missionIndex).toBe(0); expect((await state()).rescued).toBe(false);
  await page.evaluate(() => { const r = (window as any).blastProbe; r.lives = 1; r.player.immune = 0; r.player.y = 1000; });
  await page.clock.runFor(50); await expect(page.locator('.blast-app')).toHaveAttribute('data-screen', 'defeat');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click(); await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => ({ frames: (window as any).blastFrames.size, audio: (window as any).blastContexts.map((c: AudioContext) => c.state) })))
    .toEqual({ frames: 0, audio: ['closed'] });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Open game: Blastline', exact: true }).click(); await expect(page.locator('.blast-app')).toHaveAttribute('data-screen', 'title'); await page.clock.runFor(50); expect((await state()).elapsed).toBe(0);
  await expect(page.locator('.blast-app')).toHaveAttribute('data-appearance', 'normal');
  await page.evaluate(() => { window.AudioContext = class { constructor() { throw new Error('Unavailable'); } } as unknown as typeof AudioContext; });
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(100);
  expect((await state()).elapsed).toBeGreaterThan(0); await page.keyboard.press('Escape');
  await expect(page.locator('.game-menu-sound-status')).toContainText('Sound unavailable');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await page.evaluate(() => (window as any).blastFrames.size)).toBe(0); expect(errors).toEqual([]); expect(foreign).toEqual([]);
});
