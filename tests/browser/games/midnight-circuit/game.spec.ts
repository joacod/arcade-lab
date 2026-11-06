import { chooseTheme } from '../../menu.ts';
import { test, expect } from '@playwright/test';

test('keyboard layouts update hints, retain the paused run and survive restart', async ({ page }) => {
  await page.route(/\/src\/games\/midnight-circuit\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = (...args) => { const run = original(...args); window.circuitProbe = run; return run; };` });
  });
  await page.clock.install(); await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Midnight Circuit', exact: true }).click();
  const layout = page.getByRole('group', { name: 'Keyboard layout', exact: true });
  const arrows = layout.getByRole('radio', { name: /Arrows/ }), wasd = layout.getByRole('radio', { name: /WASD/ });
  await expect(arrows).toBeChecked();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(50);
  await page.keyboard.down('x'); await page.clock.runFor(50); await page.keyboard.up('x');
  expect(await page.evaluate(() => (window as any).circuitProbe.player.attack.kind)).toBe('heavy');
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(100); await page.keyboard.press('Escape');
  const frozen = await page.evaluate(() => { (window as any).retainedCircuitRun = (window as any).circuitProbe; return JSON.stringify((window as any).circuitProbe); });
  await arrows.focus(); await page.keyboard.press('ArrowRight');
  await expect(wasd).toBeChecked();
  await page.locator('.game-menu-controls summary').click();
  await expect(page.locator('.game-menu-instructions')).toContainText('J / K IN AIR');
  await expect(page.locator('.circuit-hint')).toContainText('WASD');
  await expect(page.locator('.play-surface')).toHaveAttribute('aria-label', /J light combo, K heavy/);
  expect(await page.evaluate(() => JSON.stringify((window as any).circuitProbe))).toBe(frozen);
  expect(await page.evaluate(() => (window as any).retainedCircuitRun === (window as any).circuitProbe)).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(100);
  expect(await page.evaluate(() => (window as any).circuitProbe.player.x)).toBe(JSON.parse(frozen).player.x);
  await page.keyboard.up('ArrowRight'); await page.keyboard.press('z');
  await page.clock.runFor(600);
  const x = await page.evaluate(() => (window as any).circuitProbe.player.x);
  await page.keyboard.down('d'); await page.clock.runFor(200); await page.keyboard.up('d');
  expect(await page.evaluate(() => (window as any).circuitProbe.player.x)).toBeGreaterThan(x);
  await page.keyboard.press('j'); await page.clock.runFor(32);
  expect(await page.evaluate(() => (window as any).circuitProbe.player.attack.kind)).toBe('jab');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(wasd).toBeChecked();
  await wasd.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.clock.runFor(50);
  await expect(page.locator('[data-control="light"] [data-key]')).toHaveText('J');
  await page.keyboard.press('Escape'); await expect(wasd).toBeChecked();
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await page.getByRole('button', { name: 'Open game: Midnight Circuit', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Arrows/ })).toBeChecked();
});

test('Midnight Circuit controls, interruption, restart, finale and switching own one clean session', async ({ page }, info) => {
  const errors: string[] = [], unrelated: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/src\/games\/(last-light-clearing|skybreak|clockwork-hollow)\//.test(request.url()) && !request.url().includes('/art/')) unrelated.push(request.url()); });
  await page.route(/\/src\/games\/midnight-circuit\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = (...args) => { const run = original(...args); window.circuitProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    const contexts: AudioContext[] = []; (window as any).circuitContexts = contexts;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original { constructor(options?: AudioContextOptions) { super(options); contexts.push(this); } };
  });
  await page.addInitScript(() => {
    (window as any).circuitPoses = new Set<number>();
    (window as any).circuitLabels = new Set<string>();
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof fillText>) {
      (window as any).circuitLabels.add(args[0]);
      return fillText.apply(this, args);
    };
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      const result = (original as any).apply(this, args);
      if (args.length === 9 && args[0] instanceof HTMLImageElement && args[0].src.includes('fighters') && args[2] === 0) {
        (window as any).circuitPoses.add(args[1] / args[3]);
      }
      return result;
    } as typeof original;
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install(); await page.goto('/'); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.evaluate(() => {
    const frames = new Set<number>(); (window as any).circuitFrames = frames;
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => { const id = request(now => { frames.delete(id); callback(now); }); frames.add(id); return id; };
    window.cancelAnimationFrame = id => { frames.delete(id); cancel(id); };
  });
  await page.getByRole('button', { name: 'Open game: Midnight Circuit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Midnight Circuit', exact: true })).toBeVisible(); await page.clock.runFor(50);
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).circuitProbe)));
  await page.screenshot({ path: info.outputPath('midnight-title.png') });
  expect((await state()).elapsed).toBe(0); expect(await page.evaluate(() => (window as any).circuitContexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(50);
  await expect(page.getByLabel('Combat tip', { exact: true })).toContainText('MOVE RIGHT');
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(1150); await page.keyboard.up('ArrowRight');
  expect((await state()).gated).toBe(true); expect((await state()).enemies.length).toBe(2);
  expect(await page.evaluate(() => [...(window as any).circuitLabels])).not.toContain('LOCK');
  expect(await page.evaluate(() => [...(window as any).circuitPoses].filter((frame: number) => frame >= 1 && frame <= 4).sort())).toEqual([1, 2, 3, 4]);
  await page.keyboard.down('z'); await page.clock.runFor(400); await page.keyboard.up('z');
  const firstSwing = (await state()).nextSwing; await page.clock.runFor(250); expect((await state()).nextSwing).toBe(firstSwing);
  await page.evaluate(() => (window as any).circuitPoses.clear());
  await page.keyboard.down('Space'); await page.clock.runFor(150);
  expect((await state()).player.attack).toBeNull();
  expect(await page.evaluate(() => [...(window as any).circuitPoses])).toContain(8);
  expect(await page.evaluate(() => [...(window as any).circuitPoses])).not.toContain(7);
  await page.keyboard.down('z'); await page.clock.runFor(150);
  expect(await page.evaluate(() => [...(window as any).circuitPoses])).toContain(7);
  expect((await state()).player.elevation).toBeGreaterThan(20); expect((await state()).player.attack.kind).toBe('air');
  await page.keyboard.up('Space'); await page.keyboard.up('z');
  await page.keyboard.press('Escape'); const paused = await state(); await page.clock.fastForward(60000); expect(await state()).toEqual(paused);
  await expect(page.getByLabel('Combat tip', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Resume', exact: false }).click(); await page.clock.runFor(700);
  // Exercise Arcade through movement, combat, mobile layout, the station and restart.
  await page.keyboard.press('Escape');

  await chooseTheme(page.getByLabel('Theme', { exact: true }), 'arcade');
  await expect(page.locator('canvas[data-renderer="arcade"]')).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(250);
  await page.evaluate(() => { (window as any).circuitPoses.clear(); (window as any).circuitProbe.player.immune = 10; });
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(800); await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => [...(window as any).circuitPoses].filter((frame: number) => [1, 12, 2, 13, 3, 14, 4, 15].includes(frame)).sort((a: number, b: number) => a - b))).toEqual([1, 2, 3, 4, 12, 13, 14, 15]);
  await page.screenshot({ path: info.outputPath('midnight-street.png') });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(50);
  await expect(page.getByRole('button', { name: 'Resume', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(50);
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
  await page.keyboard.down('ArrowRight'); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.clock.runFor(1000); await page.keyboard.up('ArrowRight');
  await expect(page.getByRole('button', { name: 'Resume', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: false }).click(); const resumed = await state(); await page.clock.runFor(100);
  expect((await state()).player.x).toBe(resumed.player.x);
  // One outcome fixture exercises the real boss kill and composition; invariants traverse the complete campaign.
  await page.setViewportSize({ width: 1280, height: 900 }); await page.clock.runFor(50);
  await page.getByRole('button', { name: 'Resume', exact: false }).click();
  await page.evaluate(() => { const r = (window as any).circuitProbe; r.stageIndex = 1; r.encounter = 2; r.gated = false; r.enemies = []; r.player.x = 2380; r.player.lane = 95; });
  await page.clock.runFor(1000); await expect(page.getByLabel('Circuit Warden health', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('midnight-station.png') });
  await page.evaluate(() => {
    const r = (window as any).circuitProbe, boss = r.enemies[0];
    r.player.x = boss.x - 110; r.player.lane = boss.lane; r.player.immune = 10;
    boss.attack = { id: r.nextSwing++, kind: 'quake', time: .2, hits: [], sounded: false };
  });
  await page.clock.runFor(50);
  await expect(page.locator('.circuit-boss small')).toHaveText('JUMP / LEAVE THE RING');
  await expect(page.getByLabel('Combat tip', { exact: true })).toBeHidden();
  await page.screenshot({ path: info.outputPath('midnight-warning.png') });
  await page.evaluate(() => { const r = (window as any).circuitProbe, b = r.enemies[0]; b.health = 1; b.cooldown = 999; b.attack = null; r.player.x = b.x - 50; r.player.lane = b.lane; r.player.facing = 1; r.player.immune = 10; r.player.stun = 0; });
  await page.keyboard.press('x'); await page.clock.runFor(3100);
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await expect(page.getByLabel('Run results', { exact: true })).toContainText('CITY GRID: ONLINE');
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(50);
  expect((await state()).stageIndex).toBe(0); expect((await state()).hits).toBe(0);
  await page.evaluate(() => {
    const run = (window as any).circuitProbe;
    run.encounter = 1; run.gated = false; run.cleared = 1; run.player.x = 1100; run.enemies = [];
  });
  await page.clock.runFor(50);
  expect(await page.evaluate(() => [...(window as any).circuitLabels])).toContain('GO →');
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => ({ frames: (window as any).circuitFrames.size, audio: (window as any).circuitContexts.map((c: AudioContext) => c.state) }))).toEqual({ frames: 0, audio: ['closed'] });
  await page.getByRole('button', { name: 'Open game: Midnight Circuit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Midnight Circuit', exact: true })).toBeVisible(); await page.clock.runFor(50);
  expect((await state()).elapsed).toBe(0); expect(await page.evaluate(() => (window as any).circuitFrames.size)).toBe(1);
  await page.evaluate(() => { window.AudioContext = class { constructor() { throw new Error('Unavailable'); } } as unknown as typeof AudioContext; });
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(100);
  expect((await state()).elapsed).toBeGreaterThan(0); await page.keyboard.press('Escape');
  await expect(page.locator('.game-menu-sound-status')).toContainText('Sound unavailable');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await page.evaluate(() => (window as any).circuitFrames.size)).toBe(0);
  expect(unrelated).toEqual([]); expect(errors).toEqual([]);
});

test('Midnight Circuit appearances retain a paused run and recover from drawing and image failures', async ({ page }, info) => {
  const errors: string[] = [], deluxeRequests: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', request => { if (/midnight-circuit\/(deluxe\.ts|art\/afterglow\/)/.test(request.url())) deluxeRequests.push(request.url()); });
  await page.route(/\/src\/games\/midnight-circuit\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nconst original = createRun; createRun = (...args) => { const run = original(...args); window.circuitProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    (window as any).circuitPoses = new Set<number>();
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      if (args.length === 9 && args[0] instanceof HTMLImageElement && args[0].src.includes('/afterglow/fighters/') && args[2] === 0) {
        (window as any).circuitPoses.add(args[1] / args[3]);
      }
      return (drawImage as any).apply(this, args);
    } as typeof drawImage;
    const Original = window.Image;
    (window as any).circuitImages = [];
    let sequence = 0;
    window.Image = class extends Original {
      constructor() { super(); (window as any).circuitImages.push(this); }
      // Exercise network failure/cancellation even after a successful decoded-image cache hit.
      set src(value: string) { super.src = value.includes('/afterglow/') ? `${value}?probe=${sequence++}` : value; }
      get src() { return super.src; }
    };
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Open game: Midnight Circuit', exact: true }).click();
  expect(deluxeRequests).toEqual([]);
  await chooseTheme(page.getByLabel('Theme', { exact: true }), 'deluxe');
  await expect(page.locator('canvas[data-renderer="deluxe"]')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(800); await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => [...(window as any).circuitPoses].filter((frame: number) => [1, 12, 2, 13, 3, 14, 4, 15].includes(frame)).sort((a: number, b: number) => a - b))).toEqual([1, 2, 3, 4, 12, 13, 14, 15]);
  await page.keyboard.press('Escape');
  const state = () => page.evaluate(() => JSON.stringify((window as any).circuitProbe));
  let paused = await state();
  await page.clock.runFor(32);
  const picture = await page.locator('canvas').screenshot();
  await page.clock.fastForward(1000);
  expect((await page.locator('canvas').screenshot()).equals(picture), 'paused Deluxe output stays unchanged').toBe(true);
  expect(await state()).toBe(paused);
  // All appearances retain the exact run and produce visibly different artwork.
  for (const mode of ['arcade', 'deluxe']) {
    await chooseTheme(page.getByLabel('Theme', { exact: true }), mode);
    await expect(page.locator(`canvas[data-renderer="${mode}"]`)).toBeVisible();
    expect(await state()).toBe(paused);
    if (mode !== 'deluxe') expect((await page.locator('canvas').screenshot()).equals(picture)).toBe(false);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(32);
  const still = await page.locator('canvas').screenshot();
  await page.clock.fastForward(1000);
  expect((await page.locator('canvas').screenshot()).equals(still)).toBe(true);
  expect(await state()).toBe(paused);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.clock.runFor(32);
  // An active drawing failure pauses and restores Arcade without resetting the run.
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.evaluate(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      if (args[0] instanceof HTMLImageElement && args[0].src.includes('/afterglow/')) {
        CanvasRenderingContext2D.prototype.drawImage = original;
        (window as any).circuitFailureState = JSON.stringify({ ...(window as any).circuitProbe, status: 'paused' });
        throw new Error('Drawing unavailable');
      }
      return (original as any).apply(this, args);
    } as typeof original;
  });
  await page.clock.runFor(32);
  await expect(page.locator('.circuit-app')).toHaveAttribute('data-screen', 'paused');
  await expect(page.locator('canvas[data-renderer="arcade"]')).toBeVisible();
  await expect(page.getByLabel('Theme', { exact: true }).locator('input[value="arcade"]')).toBeChecked();
  expect(await state()).toBe(await page.evaluate(() => (window as any).circuitFailureState));
  await chooseTheme(page.getByLabel('Theme', { exact: true }), 'deluxe');
  await expect(page.locator('canvas[data-renderer="deluxe"]')).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.screenshot({ path: info.outputPath('midnight-afterglow.png') });
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.locator('canvas[data-renderer="deluxe"]')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(JSON.parse(await state()).score).toBe(0);
  await expect(page.getByLabel('Theme', { exact: true }).locator('input[value="deluxe"]')).toBeChecked();
  await chooseTheme(page.getByLabel('Theme', { exact: true }), 'arcade');
  paused = await state();
  await page.route(/\/afterglow\/streets\.webp(?:\?.*)?$/, route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
  await chooseTheme(page.getByLabel('Theme', { exact: true }), 'deluxe');
  await expect(page.locator('.game-menu-display-status')).toContainText('Deluxe unavailable. Arcade retained.');
  expect(await state()).toBe(paused);
  await page.unroute(/\/afterglow\/streets\.webp(?:\?.*)?$/);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  const released = () => page.evaluate(() => (window as any).circuitImages.every((image: HTMLImageElement) => image.getAttribute('src') === null));
  expect(await released()).toBe(true);
  // An image finishing after departure cannot attach a late renderer or retain its sources.
  let release!: () => void, arrived!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  const requested = new Promise<void>(resolve => { arrived = resolve; });
  await page.route(/\/afterglow\/streets\.webp(?:\?.*)?$/, async route => { arrived(); await delayed; await route.continue().catch(() => {}); });
  await page.getByRole('button', { name: 'Open game: Midnight Circuit', exact: true }).click();
  await chooseTheme(page.getByLabel('Theme', { exact: true }), 'deluxe'); await requested;
  await expect(page.locator('canvas[data-renderer="arcade"]')).toBeVisible();
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  release(); await page.unroute(/\/afterglow\/streets\.webp(?:\?.*)?$/);
  await page.waitForTimeout(100);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await released()).toBe(true); expect(errors).toEqual([]);
});
