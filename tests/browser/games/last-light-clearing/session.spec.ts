import { openMenu } from '../../menu.ts';
import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/\/src\/games\/last-light-clearing\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const originalPositionRun = createRun; createRun = (...args) => { const run = originalPositionRun(...args); window.positionProbe = run; return run; };` });
  });
});

// Read the Keeper's body from actual Canvas output, in world units.
async function keeper(page: Page, screenSpace = false) {
  // A real ResizeObserver can run after a fake-clock batch. Wait for its next painted frame.
  for (let frame = 0; frame < 3; frame++) {
    const position = await page.locator('.world-canvas').evaluate(async (canvas, screenSpace) => {
      const rect = canvas.getBoundingClientRect();
      if (Math.abs(canvas.width / rect.width - canvas.height / rect.height) > 0.02) return null;
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
      const ratio = canvas.width / rect.width;
      if (screenSpace) return { x: x / count / ratio, y: y / count / ratio };
      // Invert the active following camera using test-only simulation observations.
      const modulePath = '/src/games/last-light-clearing/view.ts';
      const { createViewport } = await import(modulePath);
      const player = ((window as any).runEvidence ?? (window as any).positionProbe).player;
      const view = createViewport({ width: 960, height: 640 }, rect, player, 'close');
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

function expectStationary(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  // Active sprite frames change the raster centroid slightly, even at a fixed world position.
  // One world unit is well below a single full-strength movement step (2.5 units).
  expect(Math.hypot(actual.x - expected.x, actual.y - expected.y)).toBeLessThan(1);
}

test('opening guidance, shield layout, evolution feedback and dawn preserve session timing', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(50);
  await expect(page.locator('.field-message')).toContainText('Follow the green gems');
  await page.keyboard.down('d'); await page.clock.runFor(400); await page.keyboard.up('d');
  await page.clock.runFor(400);
  await expect(page.locator('.health-value')).toHaveText('100 / 100 HP');
  await expect(page.locator('.progress')).toContainText('XP 3 / 10');
  const surfaceBefore = await page.locator('.play-surface').boundingBox();
  // Feed the actual presentation the same semantic event and state produced by progression.
  // Rule-level acquisition order and damage are covered by simulation invariants.
  await page.evaluate(() => {
    const run = (window as any).positionProbe;
    run.player.shield = 20;
    run.loadout[0].id = 'arc_spark'; run.loadout[0].rank = 3; run.modifiers.lens = true;
    run.events.push({ type: 'evolution', at: run.elapsed });
  });
  await page.clock.runFor(40);
  await expect(page.locator('.shield-value')).toHaveText('+20 shield');
  await expect(page.locator('.evolution-progress')).toHaveText('Arc Spark · chain lightning');
  await expect(page.getByLabel('Equipped weapons', { exact: true })).toHaveText('ϟ Arc Spark 3');
  await expect(page.locator('.field-message')).toContainText('Arc Spark awakened');
  expect(await page.locator('.play-surface').boundingBox()).toEqual(surfaceBefore);
  await expect(page.locator('.clearing-app')).toHaveAttribute('data-screen', 'playing');
  await page.keyboard.press('Escape');
  const frozen = await page.evaluate(() => (window as any).positionProbe.elapsed);
  await page.clock.runFor(4000);
  expect(await page.evaluate(() => (window as any).positionProbe.elapsed)).toBe(frozen);
  await page.getByLabel('Theme', { exact: true }).selectOption('quality');
  await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', 'quality');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.evaluate(async () => {
    const run = (window as any).positionProbe;
    const path = '/src/games/last-light-clearing/encounters.ts';
    const { prepareAttack } = await import(path);
    const charger = { id: 1, kind: 'charger', x: run.player.x - 110, y: run.player.y, health: 32, entryDelay: 0 };
    prepareAttack(charger);
    (charger as any).attack.phase = 'windup'; (charger as any).attack.remaining = 0.9;
    run.enemies = [charger];
  });
  await page.clock.runFor(80);
  await expect(page.locator('.field-message')).toContainText('Arc Spark awakened');
  expect(await page.locator('.screen-overlay').evaluate(canvas => {
    const ctx = canvas.getContext('2d')!;
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('clearing-feedback.png') });
  await page.evaluate(() => {
    const run = (window as any).positionProbe;
    run.elapsed = run.round.duration - 0.5; run.enemies = []; run.gems = []; run.nextSpawn = Infinity; run.eliteSpawned = true;
  });
  await page.clock.runFor(650);
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible();
  await expect(page.locator('.game-menu-description')).toContainText('first light');
  const outcome = await page.evaluate(() => JSON.stringify((window as any).positionProbe, (_, value) => value instanceof Map ? [...value] : value));
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => JSON.stringify((window as any).positionProbe, (_, value) => value instanceof Map ? [...value] : value))).toBe(outcome);
});

test('movement, resize, pause, repeated restart, suspension and scoped keys', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));

  await expect(page.getByRole('heading', { name: 'Last Light Clearing' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
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
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(50);
  expectStationary(await keeper(page), frozen);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(100);
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
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
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.keyboard.up('d');
  await page.getByRole('button', { name: 'Resume' }).click();
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
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Game setup' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(50);
  await page.locator('[data-action="pause"]').focus();
  await page.clock.runFor(1); // Focus suspension waits for the native focus transition to settle.
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const prevented = await page.getByRole('button', { name: 'Resume', exact: true }).evaluate(link => !link.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true, cancelable: true })));
  expect(prevented).toBe(false);
  expect(errors).toEqual([]);
});

test('pointer mapping and cancellation, menu isolation, and complete session disposal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(50);
  const canvas = page.locator('.play-surface');
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
  expectStationary(await keeper(page), cancelled);

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
  expectStationary(await keeper(page), touchCancelled);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 90, center.y);
  await canvas.dispatchEvent('lostpointercapture', { pointerId: 1 });
  await page.mouse.up();
  await page.clock.runFor(500);
  expectStationary(await keeper(page), touchCancelled);
  // A half-strength drag stays 21 CSS pixels on a narrow viewport too.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(100);
  await page.getByRole('button', { name: 'Resume' }).click();
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
    const modulePath = '/src/games/last-light-clearing/app.ts';
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
        const session = mountClearing(container, () => {});
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
  await page.route(/\/src\/games\/last-light-clearing\/content\.ts(?:\?.*)?$/, async route => {
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
  const fetched: string[] = [];
  page.on('request', request => fetched.push(request.url()));
  // Observe the actual camera, atlas UVs and GPU lifetime without a production debug API.
  await page.route(/\/src\/games\/last-light-clearing\/three\/garden\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    const body = (await response.text())
      .replace('const scene = new THREE.Scene();', `
        window.gardenLifetimes ??= { created: 0, disposed: 0, resources: 0, released: 0 };
        const scene = new THREE.Scene();`)
      .replaceAll('geometries.add(value);', "geometries.add(value); window.gardenLifetimes.resources++; value.addEventListener('dispose', () => window.gardenLifetimes.released++);")
      .replaceAll('materials.add(value);', "materials.add(value); window.gardenLifetimes.resources++; value.addEventListener('dispose', () => window.gardenLifetimes.released++);")
      .replaceAll('textures.add(value);', "textures.add(value); window.gardenLifetimes.resources++; value.addEventListener('dispose', () => window.gardenLifetimes.released++);")
      .replace("renderer.outputColorSpace =", "window.gardenLifetimes.created++; renderer.outputColorSpace =")
      .replace('renderer?.dispose();', 'if (renderer) window.gardenLifetimes.disposed++; renderer?.dispose();')
      .replace('renderer.render(scene, camera);', `
        renderer.render(scene, camera);
        const projected = new THREE.Vector3(run.player.x, -run.player.y, 0).project(camera);
        window.gardenEvidence = {
          projected: { x: (projected.x + 1) * size.width / 2, y: (1 - projected.y) * size.height / 2 },
          expected: { x: view.x + run.player.x * view.scale, y: view.y + run.player.y * view.scale },
          geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
          calls: renderer.info.render.calls,
          probes: [[0, 0], [960, 640], [123, 456]].map(([x, y]) => {
            const p = new THREE.Vector3(x, -y, 0).project(camera);
            return { actual: [(p.x + 1) * size.width / 2, (1 - p.y) * size.height / 2], expected: [view.x + x * view.scale, view.y + y * view.scale] };
          }),
        };`);
    await route.fulfill({ response, body });
  });
  // Test-only access to the actual run, without a production debug API.
  await page.route(/\/src\/games\/last-light-clearing\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const originalCreateRun = createRun;
      createRun = (...args) => { const run = originalCreateRun(...args); window.runEvidence = run; return run; };
    ` });
  });
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));

  await expect(page.locator('.asset-status')).toBeHidden();
  for (const [configuration, theme] of [['clearing', 'normal'], ['dusk', 'normal']]) {
    await page.getByLabel('Round configuration').selectOption(configuration!);
    await openMenu(page); await page.getByLabel('Theme', { exact: true }).selectOption(theme!);
    await expect(page.locator('.asset-status')).toBeHidden();
    await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', theme!);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.clock.runFor(1700);
    await expect(page.locator('.clearing-app')).toHaveAttribute('data-screen', 'choosing');
    const time = await page.locator('.timer').textContent();
    const firstChoice = page.locator('.upgrade-choices button').first();
    await expect(firstChoice.locator('.choice-category')).toHaveText('New weapon');
    await expect(firstChoice.locator('strong')).toHaveText('Halo');
    await expect(page.locator('.choice-context')).toContainText('Equipped: Spark 1');
    await expect(page.locator('.run-details')).toBeHidden();
    await firstChoice.focus();
    await page.keyboard.down('Enter');
    await page.clock.runFor(500);
    await expect(page.locator('.timer')).toHaveText(time!);
    await expect(page.locator('.loadout')).toHaveText('Spark 1 · Halo 1');
    await expect(firstChoice).toBeFocused();
    await expect(firstChoice).toHaveAttribute('data-confirmed', 'true');
    await expect(firstChoice.locator('.choice-category')).toHaveText('✓ Applied');
    await expect(firstChoice).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('.game-menu-description')).toHaveText('Upgrade applied. Release to continue.');
    if (configuration === 'clearing') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.keyboard.up('Enter');
    await page.clock.runFor(50);
    if (configuration === 'clearing') {
      await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
      const snapshot = () => page.evaluate(() => {
        const run = (window as unknown as { runEvidence: unknown }).runEvidence;
        return JSON.stringify(run, (_, value) => value instanceof Map ? [...value] : value);
      });
      await page.evaluate(() => {
        const w = window as unknown as { runEvidence: unknown; retainedRun: unknown };
        w.retainedRun = w.runEvidence;
      });
      const retained = await snapshot();
      const surfaceIdentity = await page.locator('.play-surface').evaluate(surface => {
        (window as unknown as { retainedSurface: Element }).retainedSurface = surface; return true;
      });
      expect(surfaceIdentity).toBe(true);
      await page.evaluate(() => {
        const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
        const pending = new Set<number>();
        (window as unknown as { pendingFrames: () => number }).pendingFrames = () => pending.size;
        window.requestAnimationFrame = callback => {
          const id = request(now => { pending.delete(id); callback(now); });
          pending.add(id); return id;
        };
        window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
      });
      expect(fetched.some(url => ['/three/', '/three.js', '/vgpu/', '/vgpu.js'].some(path => url.includes(path)))).toBe(false);
      const shell = page.locator('.clearing-app');
      await openMenu(page); await page.getByLabel('Theme', { exact: true }).selectOption('assets');
      await expect(shell).toHaveAttribute('data-theme', 'assets');
      await expect(shell).toHaveAttribute('data-skin', 'rune');
      await openMenu(page); await page.getByLabel('Theme', { exact: true }).selectOption('quality');
      await expect(shell).toHaveAttribute('data-theme', 'quality');
      await page.clock.runFor(20);
      expect(await snapshot()).toBe(retained);
      await expect(shell).toHaveAttribute('data-skin', 'glass');
      await expect(page.locator('.world-canvas')).toHaveAttribute('data-renderer', 'garden');
      const projection = await page.evaluate(() => (window as unknown as { gardenEvidence: { projected: { x: number; y: number }; expected: { x: number; y: number }; calls: number } }).gardenEvidence);
      expect(projection.calls).toBeGreaterThan(0);
      expect(projection.calls).toBeLessThan(100);
      expect(projection.projected.x).toBeCloseTo(projection.expected.x, 8);
      expect(projection.projected.y).toBeCloseTo(projection.expected.y, 8);

      await page.setViewportSize({ width: 780, height: 900 });
      await page.clock.runFor(60);
      const probes = await page.evaluate(() => (window as unknown as { gardenEvidence: { probes: { actual: number[]; expected: number[] }[] } }).gardenEvidence.probes);
      for (const probe of probes) for (let i = 0; i < 2; i++) expect(probe.actual[i]).toBeCloseTo(probe.expected[i]!, 8);

      await page.setViewportSize({ width: 1280, height: 1000 });
      await page.clock.runFor(60);
      await page.getByRole('button', { name: 'Resume' }).click();
      await page.keyboard.down('d'); await page.clock.runFor(150); await page.keyboard.up('d');
      await page.keyboard.press('Escape');
      const progressed = await snapshot();
      expect(progressed).not.toBe(retained);
      // Real GPU loss restores a separate 2D canvas and preserves the paused run.
      await page.locator('.world-canvas').evaluate(canvas => canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
      await expect(shell).toHaveAttribute('data-theme', 'normal');
      await expect(page.locator('.asset-status')).toContainText('Restored Normal');
      expect(await snapshot()).toBe(progressed);
      await expect(shell).toHaveAttribute('data-screen', 'paused');
      // A renderer construction failure keeps the working Canvas presentation in place.
      await page.evaluate(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        (window as unknown as { restoreContext: () => void }).restoreContext = () => { HTMLCanvasElement.prototype.getContext = original; };
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          if (type === 'webgl2') return null;
          return original.call(this, type, ...args);
        } as typeof original;
      });
      await openMenu(page); await page.getByLabel('Theme', { exact: true }).selectOption('quality');
      await expect(page.locator('.asset-status')).toContainText('Keeping current appearance');
      await page.evaluate(() => (window as unknown as { restoreContext: () => void }).restoreContext());
      await expect(page.locator('.world-canvas')).toHaveAttribute('data-renderer', 'canvas');
      expect(await snapshot()).toBe(progressed);
      // Supersede an in-flight lazy appearance without committing or retaining its resources.
      await openMenu(page); await page.getByLabel('Theme', { exact: true }).evaluate(select => {
        for (const value of ['quality', 'assets']) { select.value = value; select.dispatchEvent(new Event('change')); }
      });
      await expect(shell).toHaveAttribute('data-theme', 'assets');
      await expect(page.locator('.play-surface canvas')).toHaveCount(2);
      expect(await page.locator('.play-surface').evaluate(surface => surface === (window as unknown as { retainedSurface: Element }).retainedSurface)).toBe(true);
      const lifetimes = await page.evaluate(() => (window as unknown as { gardenLifetimes: { created: number; disposed: number; resources: number; released: number } }).gardenLifetimes);
      expect(lifetimes.created).toBe(lifetimes.disposed);
      expect(lifetimes.resources).toBe(lifetimes.released);
      await page.clock.runFor(40);
      expect(await page.evaluate(() => (window as unknown as { pendingFrames: () => number }).pendingFrames())).toBe(1);
      await openMenu(page); await page.getByLabel('Theme', { exact: true }).selectOption('normal');
      await expect(shell).toHaveAttribute('data-theme', 'normal');
      await openMenu(page); await page.getByLabel('Theme', { exact: true }).selectOption('assets');
      await expect(shell).toHaveAttribute('data-theme', 'assets');
      await expect(shell).toHaveAttribute('data-skin', 'rune');
      await page.clock.fastForward(60000);
      expect(await snapshot()).toBe(progressed);
      expect(await page.evaluate(() => {
        const w = window as unknown as { runEvidence: unknown; retainedRun: unknown };
        return w.runEvidence === w.retainedRun;
      })).toBe(true);
      await expect(shell).toHaveAttribute('data-screen', 'paused');
      await page.getByRole('button', { name: 'Resume' }).click();
    }
    for (let i = 0; i < 12 && await page.locator('.clearing-app').getAttribute('data-screen') !== 'victory'; i++) {
      if (await page.locator('.clearing-app').getAttribute('data-screen') === 'choosing') await page.locator('.upgrade-choices button').first().click();
      await page.clock.runFor(500);
    }
    await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
    const result = await page.locator('.game-menu-description').textContent();
    await page.clock.runFor(2000);
    await expect(page.locator('.game-menu-description')).toHaveText(result!);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.clock.runFor(50);
    await expect(page.locator('.progress')).toHaveText('Level 1 · XP 0 / 5');
    await expect(page.locator('.loadout')).toHaveText('Spark 1');
    if (configuration === 'clearing') {
      await page.keyboard.press('Escape');
      await openMenu(page); await page.getByLabel('Theme', { exact: true }).selectOption('quality');
      await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', 'quality');
      await page.clock.runFor(20);
      await openMenu(page); await page.getByLabel('Theme', { exact: true }).selectOption('normal');
      await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', 'normal');
      await expect(page.locator('.play-surface canvas')).toHaveCount(2);
      await page.getByRole('button', { name: 'Resume' }).click();
    }
    await page.keyboard.press('Escape');
    await openMenu(page); await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Unmute sound' })).toHaveAttribute('aria-pressed', 'true');
    await openMenu(page); await page.getByRole('button', { name: 'Unmute sound' }).click();
    await page.getByRole('button', { name: 'Resume' }).click();
    await page.clock.runFor(100);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Game setup' }).click();
  }
  const audio = await page.evaluate(() => {
    const value = (window as unknown as { audioEvidence: { created: number; gestures: boolean[]; contexts: AudioContext[] } }).audioEvidence;
    return { created: value.created, firstGesture: value.gestures[0] };
  });
  expect(audio).toEqual({ created: 1, firstGesture: true });

  const closed = await page.evaluate(async () => {
    const path = '/src/games/last-light-clearing/app.ts';
    const { mountClearing } = await import(path);
    const container = document.createElement('div'); document.body.append(container);
    const session = mountClearing(container, () => {});
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    // Initial preparation uses detached images, so wait for its status mutation.
    await new Promise<void>(resolve => {
      if (!container.querySelector<HTMLButtonElement>('[data-menu-action="start"]')!.disabled) { resolve(); return; }
      const observer = new MutationObserver(() => {
        if (!container.querySelector<HTMLButtonElement>('[data-menu-action="start"]')!.disabled) { observer.disconnect(); resolve(); }
      });
      observer.observe(container, { attributes: true, subtree: true });
    });
    container.querySelector<HTMLButtonElement>('[data-menu-action="start"]')!.click();
    session.dispose(); session.dispose();
    const contexts = (window as unknown as { audioEvidence: { contexts: AudioContext[] } }).audioEvidence.contexts;
    container.remove(); return contexts.at(-1)!.state;
  });
  expect(closed).toBe('closed');

  lethal = true;
  await page.reload();
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  for (const configuration of ['clearing', 'dusk']) {
    await page.getByLabel('Round configuration').selectOption(configuration);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.clock.runFor(100);
    await expect(page.getByRole('heading', { name: 'Defeat' })).toBeVisible();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Game setup' }).click();
  }

  lethal = false;
  // Vite may inline the sheets, so replace the source with a failed local reference.
  await page.route(/\/src\/games\/last-light-clearing\/themes\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nthemes.assets.art.images = Object.fromEntries(Object.keys(themes.assets.art.images).map(key => [key, '/missing-art.svg']));` });
  });
  await page.route('**/missing-art.svg', route => route.abort());
  await page.addInitScript(() => {
    window.AudioContext = class { constructor() { throw new Error('Audio unavailable for this check'); } } as unknown as typeof AudioContext;
  });
  await page.reload();
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();

  await page.getByLabel('Theme', { exact: true }).selectOption('assets');
  await expect(page.locator('.asset-status')).toContainText('Keeping current appearance');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(50);
  await expect(page.locator('.game-menu-sound-status')).toContainText('Sound unavailable');
  expect(Math.abs((await keeper(page)).x - 480)).toBeLessThan(5);
  expect(errors).toEqual([]);
});

test('Close camera preserves a held CSS drag; layout and fullscreen require deliberate resume', async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(50);
  const canvas = page.locator('.play-surface'), box = (await canvas.boundingBox())!;
  const start = await keeper(page, true);
  await page.mouse.move(box.x + 100, box.y + 150); await page.mouse.down();
  await page.mouse.move(box.x + 121, box.y + 150);
  await page.clock.runFor(1000);
  // Following the player keeps its screen X fixed while the world moves.
  expect(Math.abs((await keeper(page, true)).x - start.x)).toBeLessThan(3);
  await page.mouse.up();
  await page.keyboard.press('Escape');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(50);
  expect(Math.abs((await keeper(page)).x - 555)).toBeLessThan(8);

  const surface = (await canvas.boundingBox())!;
  await page.mouse.move(surface.x + 100, surface.y + 150); await page.mouse.down();
  await page.mouse.move(surface.x + 121, surface.y + 150);
  await page.clock.runFor(300);
  await page.setViewportSize({ width: 480, height: 740 });
  await page.clock.runFor(100);
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const resizedFrozen = await keeper(page);
  await page.mouse.move(surface.x + 180, surface.y + 150); await page.mouse.up();
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(500);
  expectStationary(await keeper(page), resizedFrozen);

  // A rejected browser request leaves the viewport playable and reports the failure.
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.clearing-app')!;
    root.requestFullscreen = () => Promise.reject(new Error('Fullscreen denied for this check'));
  });
  await openMenu(page); await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect(page.locator('.game-menu-display-status')).toContainText('Fullscreen could not open');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.evaluate(() => { delete (document.querySelector('.clearing-app') as unknown as { requestFullscreen?: unknown }).requestFullscreen; });
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(50);

  // Real native fullscreen, including the HUD/menu container and fullscreenchange state.
  await page.keyboard.down('d');
  await openMenu(page); await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await page.keyboard.up('d');
  await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement?.className)).toBe('clearing-app');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.evaluate(() => document.exitFullscreen());
  await page.clock.runFor(100);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const fullscreenFrozen = await keeper(page);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(500);
  expectStationary(await keeper(page), fullscreenFrozen);

  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.clock.runFor(50);
  expect(Math.abs((await keeper(page, true)).x - 240)).toBeLessThan(3);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Game setup' }).click();
});


test('compact upgrade choices explain roles and acknowledge one keyboard decision', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.evaluate(async () => {
    const path = '/src/games/last-light-clearing/progression.ts';
    const { grantXP } = await import(path);
    const run = (window as any).positionProbe;
    run.player.health = 60;
    grantXP(run, 10);
  });
  await page.clock.runFor(40);
  const choices = page.locator('.upgrade-choices button');
  await expect(choices).toHaveCount(3);
  await expect(choices.nth(0).locator('.choice-category')).toHaveText('Recovery');
  await expect(choices.nth(1).locator('.choice-category')).toHaveText('New weapon');
  await expect(choices.nth(2).locator('.choice-category')).toHaveText('Weapon · rank 1 → 2');
  await expect(page.locator('.choice-context')).toContainText('Lens needed');
  await choices.last().scrollIntoViewIfNeeded();
  await expect(choices.last()).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeInViewport({ ratio: 1 });
  expect(await page.locator('.game-menu').evaluate(menu => menu.scrollWidth <= menu.clientWidth)).toBe(true);
  await choices.first().focus();
  await page.screenshot({ path: testInfo.outputPath('upgrade-menu.png') });
  await page.keyboard.press('ArrowDown');
  await expect(choices.nth(1)).toBeFocused();
  await page.keyboard.down('Enter');
  await page.clock.runFor(200);
  await expect(choices.nth(1)).toHaveAttribute('data-confirmed', 'true');
  await expect(choices.nth(1).locator('.choice-category')).toHaveText('✓ Applied');
  expect(await page.evaluate(() => (window as any).positionProbe.stats.upgrades)).toBe(1);
  await page.keyboard.up('Enter');
  await page.clock.runFor(40);
  await expect(page.locator('.clearing-app')).toHaveAttribute('data-screen', 'playing');
  await expect(page.locator('.loadout')).toHaveText('Spark 1 · Halo 1');
});
