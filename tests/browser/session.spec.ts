import { test, expect, type Page } from '@playwright/test';

// Read the Keeper's body from actual Canvas output, in world units.
async function keeper(page: Page, screenSpace = false) {
  // A real ResizeObserver can run after a fake-clock batch. Wait for its next painted frame.
  for (let frame = 0; frame < 3; frame++) {
    const position = await page.locator('canvas').evaluate(async (canvas, screenSpace) => {
      const ctx = canvas.getContext('2d')!;
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let x = 0, y = 0, count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if ((Math.abs(pixels[i]! - 245) < 8 && Math.abs(pixels[i + 1]! - 213) < 8 && Math.abs(pixels[i + 2]! - 139) < 8)
          || (pixels[i]! > 247 && Math.abs(pixels[i + 1]! - 240) < 8 && Math.abs(pixels[i + 2]! - 192) < 8)) {
          const pixel = i / 4;
          x += pixel % canvas.width; y += Math.floor(pixel / canvas.width); count++;
        }
      }
      if (!count) return null;
      const rect = canvas.getBoundingClientRect();
      const ratio = canvas.width / rect.width;
      if (screenSpace) return { x: x / count / ratio, y: y / count / ratio };
      // Existing world-displacement checks deliberately choose Whole arena.
      const modulePath = '/src/view.ts';
      const { createViewport } = await import(modulePath);
      const view = createViewport({ width: 960, height: 640 }, rect, { x: 480, y: 320 }, 'arena');
      const scale = view.scale;
      return {
        x: (x / count / ratio - view.x) / scale,
        y: (y / count / ratio - view.y) / scale,
      };
    }, screenSpace);
    if (position) return position;
    await page.clock.runFor(20);
  }
  throw new Error('Keeper was not drawn');
}

test('movement, resize, pause, repeated restart, suspension and scoped keys', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByLabel('View', { exact: true }).selectOption('arena');
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
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume surviving' }).click();
  await page.clock.runFor(50);
  const resized = await keeper(page);
  expect(Math.abs(resized.x - frozen.x)).toBeLessThan(5);
  await page.keyboard.down('s'); await page.clock.runFor(1000); await page.keyboard.up('s');
  // Tiny rasterized sprites change centroid with facing; allow under three CSS pixels here.
  expect(Math.abs((await keeper(page)).y - resized.y - 150)).toBeLessThan(8);
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
  await page.getByLabel('View', { exact: true }).selectOption('arena');
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
  // A half-strength drag stays 21 CSS pixels on a narrow viewport too.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(100);
  await page.getByRole('button', { name: 'Resume surviving' }).click();
  await page.clock.runFor(50);
  const narrow = (await canvas.boundingBox())!, beforeDrag = await keeper(page);
  await page.mouse.move(narrow.x + narrow.width / 2, narrow.y + narrow.height / 2);
  await page.mouse.down();
  await page.mouse.move(narrow.x + narrow.width / 2 + 21, narrow.y + narrow.height / 2);
  await page.clock.runFor(1000); await page.mouse.up();
  expect(Math.abs((await keeper(page)).x - beforeDrag.x - 75)).toBeLessThan(8);
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

// Exercise real composition with shortened authored deadlines, without rendering full rounds.
// Simulation invariants cover the production profiles and complete three-minute combat route.
test('themes, both configurations, upgrade confirmation, outcomes, retry and asset fallback', async ({ page }) => {
  let lethal = false;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const evidence = { created: 0, gestures: [] as boolean[], contexts: [] as AudioContext[] };
    (window as unknown as { audioEvidence: typeof evidence }).audioEvidence = evidence;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) { super(options); evidence.created++; evidence.contexts.push(this); }
      override resume() { evidence.gestures.push(navigator.userActivation.isActive); return super.resume(); }
    };
  });
  await page.route('**/src/content.ts', async route => {
    const response = await route.fetch();
    const body = `${await response.text()}
      clearing.round.duration = 4; clearing.round.eliteAt = 2.5;
      clearing.round.phases = [{ start: 0, interval: 1 }];
      clearing.initialEnemy.x = 500; clearing.progression.firstCost = 5;
      configurations.dusk.round.duration = 3; configurations.dusk.round.eliteAt = 2;
      configurations.dusk.round.phases = [{ start: 0, interval: 1.3 }];
      ${lethal ? 'clearing.keeper.maxHealth = 10;' : ''}
    `;
    await route.fulfill({ response, body });
  });
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByLabel('View', { exact: true }).selectOption('arena');
  await expect(page.locator('.asset-status')).toBeHidden();
  for (const [configuration, theme] of [['clearing', 'woodland'], ['dusk', 'moonglass']]) {
    await page.getByLabel('Round configuration').selectOption(configuration!);
    await page.getByLabel('Visual theme').selectOption(theme!);
    await expect(page.locator('.asset-status')).toBeHidden();
    await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', theme!);
    await page.getByRole('button', { name: 'Enter the clearing' }).click();
    await page.clock.runFor(1700);
    await expect(page.locator('.clearing-app')).toHaveAttribute('data-screen', 'choosing');
    const time = await page.locator('.timer').textContent();
    await page.locator('.upgrade-choices button').first().focus();
    await page.keyboard.down('Enter');
    await page.clock.runFor(500);
    await expect(page.locator('.timer')).toHaveText(time!);
    await expect(page.locator('.loadout')).toHaveText('Spark 1 · Halo 1');
    if (configuration === 'clearing') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.keyboard.up('Enter');
    await page.clock.runFor(50);
    if (configuration === 'clearing') {
      await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
      await page.getByRole('button', { name: 'Resume surviving' }).click();
    }
    for (let i = 0; i < 12 && await page.locator('.clearing-app').getAttribute('data-screen') !== 'victory'; i++) {
      if (await page.locator('.clearing-app').getAttribute('data-screen') === 'choosing') await page.locator('.upgrade-choices button').first().click();
      await page.clock.runFor(500);
    }
    await expect(page.getByRole('heading', { name: 'Dawn finds you standing.' })).toBeVisible();
    const result = await page.locator('.menu-description').textContent();
    await page.clock.runFor(2000);
    await expect(page.locator('.menu-description')).toHaveText(result!);
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.clock.runFor(50);
    await expect(page.locator('.progress')).toHaveText('Level 1 · XP 0 / 5');
    await expect(page.locator('.loadout')).toHaveText('Spark 1');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Mute', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Unmute' }).click();
    await page.getByRole('button', { name: 'Resume surviving' }).click();
    await page.clock.runFor(100);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Return to title' }).click();
  }
  const audio = await page.evaluate(() => {
    const value = (window as unknown as { audioEvidence: { created: number; gestures: boolean[]; contexts: AudioContext[] } }).audioEvidence;
    return { created: value.created, firstGesture: value.gestures[0] };
  });
  expect(audio).toEqual({ created: 1, firstGesture: true });

  const closed = await page.evaluate(async () => {
    const path = '/src/app.ts';
    const { mountClearing } = await import(path);
    const container = document.createElement('div'); document.body.append(container);
    const session = mountClearing(container);
    container.querySelector<HTMLButtonElement>('[data-action="start"]')!.click();
    session.dispose(); session.dispose();
    const contexts = (window as unknown as { audioEvidence: { contexts: AudioContext[] } }).audioEvidence.contexts;
    container.remove(); return contexts.at(-1)!.state;
  });
  expect(closed).toBe('closed');

  lethal = true;
  await page.reload();
  for (const configuration of ['clearing', 'dusk']) {
    await page.getByLabel('Round configuration').selectOption(configuration);
    await page.getByRole('button', { name: 'Enter the clearing' }).click();
    await page.clock.runFor(100);
    await expect(page.getByRole('heading', { name: 'Your light fades.' })).toBeVisible();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Return to title' }).click();
  }

  lethal = false;
  // Vite may inline the sheets, so replace the source with a failed local reference.
  await page.route('**/src/themes.ts', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nthemes.woodland.source = '/missing-art.svg';` });
  });
  await page.route('**/missing-art.svg', route => route.abort());
  await page.addInitScript(() => {
    window.AudioContext = class { constructor() { throw new Error('Audio unavailable for this check'); } } as unknown as typeof AudioContext;
  });
  await page.reload();
  await page.getByLabel('View', { exact: true }).selectOption('arena');
  await expect(page.locator('.asset-status')).toContainText('Using clear shape silhouettes');
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await page.clock.runFor(50);
  await expect(page.locator('.sound-status')).toContainText('Sound unavailable');
  expect(Math.abs((await keeper(page)).x - 480)).toBeLessThan(5);
  expect(errors).toEqual([]);
});

test('Close camera preserves a held CSS drag; layout and fullscreen require deliberate resume', async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await expect(page.getByLabel('View', { exact: true })).toHaveValue('close');
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await page.clock.runFor(50);
  const canvas = page.locator('canvas'), box = (await canvas.boundingBox())!;
  const start = await keeper(page, true);
  await page.mouse.move(box.x + 100, box.y + 150); await page.mouse.down();
  await page.mouse.move(box.x + 121, box.y + 150);
  await page.clock.runFor(1000);
  // Following the player keeps its screen X fixed while the world moves.
  expect(Math.abs((await keeper(page, true)).x - start.x)).toBeLessThan(3);
  await page.mouse.up();
  await page.keyboard.press('Escape');
  await page.getByLabel('View', { exact: true }).selectOption('arena');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume surviving' }).click();
  await page.clock.runFor(50);
  expect(Math.abs((await keeper(page)).x - 555)).toBeLessThan(8);

  const surface = (await canvas.boundingBox())!;
  await page.mouse.move(surface.x + 100, surface.y + 150); await page.mouse.down();
  await page.mouse.move(surface.x + 121, surface.y + 150);
  await page.clock.runFor(300);
  await page.setViewportSize({ width: 480, height: 740 });
  await page.clock.runFor(100);
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
  const resizedFrozen = await keeper(page);
  await page.mouse.move(surface.x + 180, surface.y + 150); await page.mouse.up();
  await page.getByRole('button', { name: 'Resume surviving' }).click();
  await page.clock.runFor(500);
  expect(await keeper(page)).toEqual(resizedFrozen);

  // A rejected browser request leaves the viewport playable and reports the failure.
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.clearing-app')!;
    root.requestFullscreen = () => Promise.reject(new Error('Fullscreen denied for this check'));
  });
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect(page.locator('.display-status')).toContainText('Fullscreen could not open');
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
  await page.evaluate(() => { delete (document.querySelector('.clearing-app') as unknown as { requestFullscreen?: unknown }).requestFullscreen; });
  await page.getByRole('button', { name: 'Resume surviving' }).click();
  await page.clock.runFor(50);

  // Real native fullscreen, including the HUD/menu container and fullscreenchange state.
  await page.keyboard.down('d');
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await page.keyboard.up('d');
  await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement?.className)).toBe('clearing-app');
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
  await page.evaluate(() => document.exitFullscreen());
  await page.clock.runFor(100);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeVisible();
  const fullscreenFrozen = await keeper(page);
  await page.getByRole('button', { name: 'Resume surviving' }).click();
  await page.clock.runFor(500);
  expect(await keeper(page)).toEqual(fullscreenFrozen);

  await page.keyboard.press('Escape');
  await page.getByLabel('View', { exact: true }).selectOption('close');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.clock.runFor(50);
  expect(Math.abs((await keeper(page, true)).x - 240)).toBeLessThan(3);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Return to title' }).click();
  await expect(page.getByLabel('View', { exact: true })).toHaveValue('close');
});
