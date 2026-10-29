import { openMenu, chooseOption } from '../../menu.ts';
import { test, expect } from '@playwright/test';

test('Obsidian Duel owns fighter selection, controls, rounds, interruptions and disposal', async ({ page }, info) => {
  const errors: string[] = [], unrelated: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/\/src\/games\/(last-light-clearing|midnight-circuit|skybreak|clockwork-hollow)\//.test(r.url()) && !r.url().includes('/art/')) unrelated.push(r.url()); });
  await page.route(/\/src\/games\/obsidian-duel\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createMatch; createMatch = (...args) => { const m = original(...args); window.duelProbe = m; return m; };` });
  });
  await page.addInitScript(() => {
    const contexts: AudioContext[] = []; (window as any).duelContexts = contexts;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original { constructor(options?: AudioContextOptions) { super(options); contexts.push(this); } };
  });
  await page.clock.install(); await page.goto('/'); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.evaluate(() => {
    const pending = new Set<number>(); (window as any).duelFrames = pending;
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => { const id = request(now => { pending.delete(id); cb(now); }); pending.add(id); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  });
  await expect(page.locator('[data-game]')).toHaveCount(6);
  await page.getByRole('button', { name: 'Open game: Obsidian Duel', exact: true }).click(); await page.clock.runFor(50);
  await expect(page.getByRole('heading', { name: 'Obsidian Duel' })).toBeVisible(); await page.clock.runFor(50);
  expect(await page.evaluate(() => (window as any).duelContexts.length)).toBe(0);
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).duelProbe)));
  await page.screenshot({ path: info.outputPath('obsidian-title.png') });
  await page.locator('[data-fighter="kael"]').click(); expect((await state()).fighters[0].kind).toBe('kael');
  await page.locator('[data-fighter="nera"]').click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.keyboard.press('j'); await page.clock.runFor(3100);
  expect((await state()).phase).toBe('fight'); expect((await state()).fighters[0].attack).toBe(null);
  await page.keyboard.down('d'); await page.clock.runFor(250); await page.keyboard.up('d');
  expect((await state()).fighters[0].x).toBeGreaterThan(390);
  await page.keyboard.down('j'); await page.clock.runFor(450); await page.keyboard.up('j');
  const swing = (await state()).fighters[0].attack;
  await page.clock.runFor(100); expect(swing).toBe(null); expect((await state()).fighters[0].attack).toBe(null);
  await page.screenshot({ path: info.outputPath('obsidian-duel.png') });
  await page.keyboard.press('Escape'); const paused = await state(); await page.clock.fastForward(30000); expect(await state()).toEqual(paused);
  // Replacing presentation must retain the live simulation, including mid-action state.
  await page.evaluate(() => { (window as any).appearanceRun = (window as any).duelProbe; });
  const skyPixel = () => page.locator('.duel-canvas').evaluate((canvas: HTMLCanvasElement) =>
    [...canvas.getContext('2d')!.getImageData(Math.floor(canvas.width / 2),
      Math.floor((canvas.height - Math.min(canvas.width / 1000, canvas.height / 560) * 560) / 2) + 8, 1, 1).data]);
  const beforeTheme = await skyPixel();
  await openMenu(page);
  await chooseOption(page.getByRole('combobox', { name: 'Theme', exact: true }), 'normal');
  await page.clock.runFor(50);
  await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'normal');
  expect(await skyPixel()).toEqual(beforeTheme);
  expect(await state()).toEqual(paused);
  expect(await page.evaluate(() => (window as any).appearanceRun === (window as any).duelProbe)).toBe(true);

  await page.getByRole('button', { name: 'Resume', exact: false }).click();
  await page.keyboard.down('d'); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.keyboard.up('d');
  await expect(page.getByRole('button', { name: 'Resume', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: false }).click();
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(50);
  await expect(page.getByRole('button', { name: 'Resume', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: false }).click(); await page.clock.runFor(3100);
  await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'normal');
  await page.evaluate(() => { const e = (window as any).duelProbe.fighters[1]; e.state = 'hitstun'; e.stateTime = 10; e.attack = null; });
  const touch = await page.context().newCDPSession(page);
  const point = async (name: string, id: number) => { const b = (await page.getByRole('button', { name, exact: true }).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2, id }; };
  const right = await point('Move right', 1), crouch = await point('Crouch', 2), block = await point('Block', 3);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right] }); await page.clock.runFor(150);
  expect((await state()).fighters[0].x).toBeGreaterThan(365);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right, crouch, block] }); await page.clock.runFor(100);
  expect((await state()).fighters[0].state).toBe('block'); expect((await state()).fighters[0].crouched).toBe(true);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await page.clock.runFor(100);
  expect(await page.locator('[data-held]').count()).toBe(0); const x = (await state()).fighters[0].x;
  await page.clock.runFor(150); expect((await state()).fighters[0].x).toBe(x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: info.outputPath('obsidian-phone.png') });
  // Held inputs cannot survive a timeout, a fresh round, or the match-result menu.
  await page.keyboard.down('d');
  await page.evaluate(() => { const m = (window as any).duelProbe; m.timer = .01; m.fighters[1].health = 50; });
  await page.clock.runFor(100); expect((await state()).phase).toBe('roundEnd'); expect(await page.locator('[data-held]').count()).toBe(0);
  await page.clock.runFor(5800); expect((await state()).round).toBe(2); expect((await state()).fighters[0].x).toBe(340);
  await page.keyboard.up('d');
  await page.evaluate(() => { const m = (window as any).duelProbe; m.timer = .01; m.fighters[1].health = 50; });
  await page.clock.runFor(2700); await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await expect(page.getByLabel('Match results', { exact: true })).toContainText('2 : 0');
  await page.getByRole('button', { name: 'Restart', exact: false }).click(); await page.clock.runFor(50);
  expect((await state()).round).toBe(1); expect((await state()).wins).toEqual([0,0]); expect((await state()).fighters[0].health).toBe(100);
  await expect.poll(() => page.evaluate(() => (window as any).duelContexts.at(-1).state)).toBe('running');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Game setup', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Obsidian Duel', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).duelContexts.at(-1).state)).toBe('suspended');
  await page.locator('[data-fighter="kael"]').click();
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(50);
  expect((await state()).fighters[0].kind).toBe('kael'); expect((await state()).wins).toEqual([0, 0]);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => ({ frames: (window as any).duelFrames.size, audio: (window as any).duelContexts.map((c: AudioContext) => c.state) }))).toEqual({ frames: 0, audio: ['closed'] });
  await page.getByRole('button', { name: 'Open game: Obsidian Duel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Obsidian Duel' })).toBeVisible(); await page.clock.runFor(50);
  expect((await state()).elapsed).toBe(0);
  await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'normal'); expect((await state()).fighters[0].kind).toBe('nera');
  expect(await page.evaluate(() => (window as any).duelFrames.size)).toBe(1);
  expect(unrelated).toEqual([]); expect(errors).toEqual([]);
});
