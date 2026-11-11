import { test, expect } from '@playwright/test';

test('a game host suspends its single loop and releases it on collection navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\/src\/engine\/browser\/host\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createHost;
      createHost = (...args) => { const host = original(...args); window.lifecycleHost = host; return host; };` });
  });
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000); // Freeze before navigation, while there is no game loop.
  await page.goto('/');
  await page.evaluate(() => {
    const pending = new Set<number>(); (window as any).pendingFrames = pending;
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      const id = request(now => { pending.delete(id); callback(now); });
      pending.add(id); return id;
    };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  });
  await page.getByRole('button', { name: 'Open game: Skybreak', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await page.clock.runFor(32);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('[data-menu-owner]')).toHaveAttribute('data-screen', 'playing');
  const frames = () => page.evaluate(() => (window as any).pendingFrames.size);
  expect(await frames()).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await frames()).toBe(0);
  await expect(page.locator('[data-menu-owner]')).toHaveAttribute('data-screen', 'paused');
  await page.evaluate(() => {
    delete (document as any).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await frames()).toBe(1);
  await expect(page.locator('[data-menu-owner]')).toHaveAttribute('data-screen', 'paused');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => {
    const host = (window as any).lifecycleHost;
    host.dispose(); // Cleanup is idempotent; later display events cannot revive it.
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('resize'));
    return { aborted: host.signal.aborted, attached: host.root.isConnected, frames: (window as any).pendingFrames.size };
  })).toEqual({ aborted: true, attached: false, frames: 0 });
  await expect(page.getByRole('button', { name: 'Open game: Skybreak', exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});

test('collection keeps its initial layout and previews, restores navigation and ignores cancelled loads', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/src\/games\/skybreak\/app\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch(); await gate; await route.fulfill({ response });
  });
  let start!: () => void;
  const startup = new Promise<void>(resolve => { start = resolve; });
  await page.route(/\/src\/app\/main\.ts(?:\?.*)?$/, async route => {
    await startup; await route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'commit' });
  // The real landing must be styled before JavaScript, then retain its image nodes.
  await expect(page.getByRole('heading', { name: 'Press Play', exact: true })).toBeVisible();
  await expect(page.locator('.arcade-games')).toHaveCSS('display', 'grid');
  await expect(page.locator('body')).toHaveCSS('margin', '0px');
  await expect(page.getByRole('button', { name: 'Open game: Skybreak', exact: true })).toBeDisabled();
  const initialCover = await page.locator('.arcade-cover img').first().elementHandle();
  const initialBounds = await initialCover!.boundingBox();
  start();
  await page.waitForLoadState('load');
  expect(await initialCover!.evaluate(image => image.isConnected)).toBe(true);
  expect(await initialCover!.boundingBox()).toEqual(initialBounds);
  // Covers must keep their artwork visible when the catalog needs another row.
  const covers = await page.locator('.arcade-cover').evaluateAll(elements => elements.map(element => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height };
  }));
  for (const cover of covers) expect(cover.height).toBeGreaterThan(cover.width / 2);
  await expect(page.locator('.arcade-game:focus')).toHaveCount(0);
  // A fresh landing has no focused descendant to bubble keyboard shortcuts through.
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('app');
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  const selected = page.getByRole('button', { name: 'Open game: Blastline', exact: true });
  await selected.scrollIntoViewIfNeeded();
  const scrollTop = await page.locator('.arcade-selection').evaluate(root => root.scrollTop);
  await selected.click();
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(selected).toBeFocused();
  expect(await page.locator('.arcade-selection').evaluate(root => root.scrollTop)).toBeCloseTo(scrollTop, 0);
  await page.getByRole('button', { name: 'Open game: Skybreak', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Loading Skybreak…');
  await expect(page.getByRole('button', { name: 'Cancel loading', exact: true })).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Cancel loading', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open game: Skybreak', exact: true })).toBeFocused();
  release();
  // Await that exact import rather than relying on a timeout for the stale completion.
  await page.evaluate(async () => { const path = '/src/games/skybreak/app.ts'; await import(path); });
  await expect(page.locator('.arcade-selection')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open game: Skybreak', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Skybreak', exact: true })).toBeVisible();
});
