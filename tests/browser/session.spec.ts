import { test, expect, type Page } from '@playwright/test';

// Read the Keeper's body from actual Canvas output, in world units.
async function keeper(page: Page) {
  return page.locator('canvas').evaluate(canvas => {
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let x = 0, y = 0, count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if ((pixels[i] === 255 && pixels[i + 1] === 240 && pixels[i + 2] === 192)
        || (pixels[i] === 245 && pixels[i + 1] === 213 && pixels[i + 2] === 139)) {
        const pixel = i / 4;
        x += pixel % canvas.width; y += Math.floor(pixel / canvas.width); count++;
      }
    }
    if (!count) throw new Error('Keeper was not drawn');
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / rect.width;
    const scale = Math.min(rect.width / 1056, rect.height / 736);
    return {
      x: (x / count / ratio - (rect.width - 960 * scale) / 2) / scale,
      y: (y / count / ratio - (rect.height - 640 * scale) / 2) / scale,
    };
  });
}

test('movement, resize, pause, repeated restart, suspension and scoped keys', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await expect(page.getByRole('heading', { name: 'Keep the light alive.' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await page.clock.runFor(50);
  const start = await keeper(page);
  await page.keyboard.down('d');
  await page.clock.runFor(1000);
  await page.keyboard.up('d');
  const right = await keeper(page);
  expect(right.x - start.x).toBeCloseTo(150, -1);
  await page.keyboard.down('w'); await page.keyboard.down('d');
  await page.clock.runFor(1000);
  await page.keyboard.up('w'); await page.keyboard.up('d');
  const diagonal = await keeper(page);
  expect(Math.hypot(diagonal.x - right.x, diagonal.y - right.y)).toBeCloseTo(150, -1);

  await page.keyboard.press('Escape');
  const frozen = await keeper(page);
  const time = await page.locator('.timer').textContent();
  await page.clock.fastForward(60000);
  expect(await keeper(page)).toEqual(frozen);
  await expect(page.locator('.timer')).toHaveText(time!);
  await page.getByRole('button', { name: 'Resume surviving' }).click();
  await page.clock.runFor(50);
  expect(await keeper(page)).toEqual(frozen);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(100);
  const resized = await keeper(page);
  expect(Math.abs(resized.x - frozen.x)).toBeLessThan(5);
  await page.keyboard.down('s'); await page.clock.runFor(1000); await page.keyboard.up('s');
  expect((await keeper(page)).y - resized.y).toBeCloseTo(150, -1);
  await page.keyboard.down('s'); await page.keyboard.down('d');
  await page.clock.runFor(10000);
  await page.keyboard.up('s'); await page.keyboard.up('d');
  const edge = await keeper(page);
  expect(edge.x).toBeGreaterThan(944); expect(edge.x).toBeLessThan(956);
  expect(edge.y).toBeGreaterThan(624); expect(edge.y).toBeLessThan(636);

  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.clock.runFor(50);
    expect(Math.abs((await keeper(page)).x - 480)).toBeLessThan(5);
    await expect(page.locator('.timer')).toHaveText('00:00 / 03:00');
  }
  await page.keyboard.down('d');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.clock.fastForward(60000);
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
  await page.keyboard.up('d');
  await page.getByRole('button', { name: 'Resume surviving' }).click();
  await page.clock.runFor(500);
  const resumed = await keeper(page);
  expect(Math.abs(resumed.x - 480)).toBeLessThan(5);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(120000);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
  await page.getByRole('button', { name: 'Return to title' }).click();
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await page.clock.runFor(50);
  await page.locator('.brand').focus();
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
  const prevented = await page.locator('.brand').evaluate(link => !link.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true, cancelable: true })));
  expect(prevented).toBe(false);
  expect(errors).toEqual([]);
});

test('pointer mapping and cancellation, menu isolation, and complete session disposal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await page.clock.runFor(50);
  const canvas = page.locator('canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2);
  await page.clock.runFor(1000);
  expect((await keeper(page)).x).toBeGreaterThan(620);
  await canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  await page.mouse.up();
  const cancelled = await keeper(page);
  await page.clock.runFor(500);
  expect(await keeper(page)).toEqual(cancelled);

  // Real Chromium touch pointer/capture path via the DevTools protocol.
  const cdp = await page.context().newCDPSession(page);
  const center = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x, y: center.y + 90, id: 0 }] });
  await page.clock.runFor(600);
  expect((await keeper(page)).y).toBeGreaterThan(cancelled.y + 80);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  const touchCancelled = await keeper(page);
  await page.clock.runFor(500);
  expect(await keeper(page)).toEqual(touchCancelled);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 90, center.y);
  await canvas.dispatchEvent('lostpointercapture', { pointerId: 1 });
  await page.mouse.up();
  await page.clock.runFor(500);
  expect(await keeper(page)).toEqual(touchCancelled);
  await page.getByRole('button', { name: 'Pause', exact: false }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.clock.runFor(500);
  expect(Math.abs((await keeper(page)).x - 480)).toBeLessThan(5);

  const cleanup = await page.evaluate(async () => {
    const modulePath = '/src/app.ts';
    const { mountClearing } = await import(modulePath);
    const container = document.createElement('div');
    document.body.append(container);
    const originalRequest = window.requestAnimationFrame;
    const originalCancel = window.cancelAnimationFrame;
    const scheduled = new Set<number>();
    window.requestAnimationFrame = callback => {
      const id = originalRequest.call(window, callback); scheduled.add(id); return id;
    };
    window.cancelAnimationFrame = id => { scheduled.delete(id); originalCancel.call(window, id); };
    const signals: AbortSignal[] = [];
    const originalAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (typeof options === 'object' && options.signal) signals.push(options.signal);
      return originalAdd.call(this, type, listener, options);
    };
    try {
      for (let i = 0; i < 5; i++) {
        const session = mountClearing(container);
        session.dispose(); session.dispose();
      }
      return { remainingFrames: scheduled.size, children: container.childElementCount,
        listenersAborted: signals.length > 0 && signals.every(signal => signal.aborted) };
    } finally {
      window.requestAnimationFrame = originalRequest;
      window.cancelAnimationFrame = originalCancel;
      EventTarget.prototype.addEventListener = originalAdd;
      container.remove();
    }
  });
  expect(cleanup).toEqual({ remainingFrames: 0, children: 0, listenersAborted: true });
  expect(errors).toEqual([]);
});
