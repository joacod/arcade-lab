import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

// One representative integration covers native multi-touch capture, focus and
// ResizeObserver delivery; simulation/unit checks cannot exercise these together.
test('touch steering survives control focus and pickup HUD wrapping without pausing', async ({ page, context }) => {
  await page.route(/\/src\/games\/skybreak\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun;
      createRun = (...args) => { const run = original(...args); window.mobileRun = run; return run; };` });
  });
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Skybreak', exact: true }).tap();
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.clock.runFor(32);
  const root = page.locator('.skybreak-app'), surface = root.locator('.play-surface');
  const pad = root.locator('.touch-direction-pad'), fire = root.locator('[data-control="fire"]');
  const box = (await pad.boundingBox())!, fireBox = (await fire.boundingBox())!;
  const touch = await context.newCDPSession(page);
  const stick = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const trigger = { id: 2, x: fireBox.x + fireBox.width / 2, y: fireBox.y + fireBox.height / 2 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [stick, trigger] });
  await expect(fire).toHaveAttribute('data-held', '');
  await expect(surface).toBeFocused();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...stick, x: stick.x + 42, y: stick.y - 42 }, trigger] });
  await expect(pad.locator('[data-control="up"]')).toHaveAttribute('data-held', '');
  await expect(pad.locator('[data-control="right"]')).toHaveAttribute('data-held', '');
  // Moving focus between playable controls must not cancel either captured thumb.
  await fire.focus(); await page.clock.runFor(16);
  await expect(fire).toHaveAttribute('data-held', '');
  await expect(pad.locator('[data-control="up"]')).toHaveAttribute('data-held', '');
  await surface.focus(); await page.clock.runFor(16);
  const before = (await surface.boundingBox())!.height;
  await page.evaluate(() => {
    const run = (window as any).mobileRun;
    run.player.power = 2;
    run.pickups.push({ x: run.player.x, y: run.player.y, kind: 'spread', age: 0 });
  });
  await page.clock.runFor(64);
  await expect(root.getByLabel('Aircraft weapons')).toContainText('+ SPREAD');
  await expect.poll(async () => (await surface.boundingBox())!.height).toBeLessThan(before);
  await page.clock.runFor(32);
  await expect(root).toHaveAttribute('data-screen', 'playing');
  await expect(fire).toHaveAttribute('data-held', '');
  expect(await page.evaluate(() => (window as any).mobileRun.stats.pickups)).toBe(1);

  // Capture keeps steering alive outside the circle; cancelling releases both thumbs.
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...stick, x: stick.x + box.width, y: stick.y }, trigger] });
  await expect(pad.locator('[data-control="up"]')).not.toHaveAttribute('data-held');
  await expect(pad.locator('[data-control="right"]')).toHaveAttribute('data-held', '');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(root.locator('[data-held]')).toHaveCount(0);
  await expect(pad).not.toHaveAttribute('data-engaged');

  for (const target of [surface, fire, root.locator('.skybreak-hud')]) {
    expect(await target.evaluate(element => ({
      selection: getComputedStyle(element).userSelect,
      contextMenu: element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })),
      selectionStart: element.dispatchEvent(new Event('selectstart', { bubbles: true, cancelable: true })),
    }))).toEqual({ selection: 'none', contextMenu: false, selectionStart: false });
  }
  await surface.tap(); await page.clock.runFor(32);
  await expect(root).toHaveAttribute('data-screen', 'playing');
  const padAfter = (await pad.boundingBox())!, fireAfter = (await fire.boundingBox())!;
  await page.touchscreen.tap((padAfter.x + padAfter.width + fireAfter.x) / 2, padAfter.y + padAfter.height / 2);
  await page.clock.runFor(32);
  await expect(surface).toBeFocused();
  await expect(root).toHaveAttribute('data-screen', 'playing');
  // Real interruptions retain the intentional pause policy.
  await page.evaluate(() => {
    const outside = document.createElement('button'); document.body.append(outside); outside.focus();
  });
  await page.clock.runFor(16);
  await expect(root).toHaveAttribute('data-screen', 'paused');
  await root.getByRole('button', { name: 'Resume', exact: true }).tap();
  await page.setViewportSize({ width: 800, height: 360 });
  await expect(root).toHaveAttribute('data-screen', 'paused');
});
