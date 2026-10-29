import { chooseOption } from '../../menu.ts';
import { test, expect, type Page } from '@playwright/test';

// Chromium's software WebGPU adapter exercises the real shaders without a hardware requirement.
test.use({ launchOptions: { args: ['--enable-unsafe-webgpu', '--use-angle=swiftshader'] } });

test.beforeEach(async ({ page }) => {
  await page.route(/\/src\/games\/last-light-clearing\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const originalRun = createRun;
      createRun = (...args) => { const run = originalRun(...args); window.bloomRun = run; return run; };` });
  });
  // Observe actual device ownership and control otherwise nondeterministic preparation awaits.
  await page.route(/\/src\/games\/last-light-clearing\/vgpu\/bloom\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    const body = (await response.text())
      .replace(/gpu = await init\(\{ powerPreference: ["']low-power["'] \}\);/, `
        gpu = await init({ powerPreference: 'low-power' });
        window.bloomDevices ??= []; window.bloomDevices.push(gpu);
        if (window.holdBloom === 'device') await new Promise(resolve => { window.releaseBloom = resolve; });`)
      .replace('await gpu.settled();', `
        if (window.holdBloom === 'compile') await new Promise(resolve => { window.releaseBloom = resolve; });
        await gpu.settled();`);
    await route.fulfill({ response, body });
  });
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
});

const theme = (page: Page) => page.getByRole('combobox', { name: 'Theme', exact: true });
const shell = (page: Page) => page.locator('.clearing-app');
const snapshot = (page: Page) => page.evaluate(() => JSON.stringify((window as any).bloomRun,
  (_, value) => value instanceof Map ? [...value] : value));
const deviceStates = (page: Page) => page.evaluate(() => ((window as any).bloomDevices ?? []).map((gpu: any) => gpu.disposed));

test('menu geometry uses the game viewport across all four themes', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 620 });
  await page.clock.runFor(50);
  const geometry = () => page.locator('.game-menu').evaluate(menu => {
    const rect = menu.getBoundingClientRect(), actions = menu.querySelector('footer')!.getBoundingClientRect();
    const body = menu.querySelector('.game-menu-body')!;
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, actionsY: actions.y,
      scroll: body.scrollHeight - body.clientHeight };
  });
  const baseline = await geometry(), retained = await snapshot(page);
  expect(baseline.scroll).toBe(0);
  for (const mode of ['assets', 'quality', 'custom', 'normal']) {
    await chooseOption(theme(page), mode);
    await expect(shell(page)).toHaveAttribute('data-theme', mode);
    await page.clock.runFor(50);
    expect(await geometry(), `${mode} menu geometry`).toEqual(baseline);
    expect(await snapshot(page)).toBe(retained);
  }
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.clock.runFor(50);
  const fullscreen = await geometry();
  await chooseOption(theme(page), 'assets');
  await expect(shell(page)).toHaveAttribute('data-theme', 'assets');
  await page.clock.runFor(50);
  expect(await geometry()).toEqual(fullscreen);
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.setViewportSize({ width: 390, height: 460 });
  await page.locator('.game-menu-controls summary').click();
  expect((await geometry()).scroll).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Mute sound', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toBeInViewport({ ratio: 1 });
});

test('Custom renders the living field and organisms, retains the run and recovers device loss', async ({ page }) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.keyboard.down('d'); await page.clock.runFor(1800); await page.keyboard.up('d');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { (window as any).retainedBloomRun = (window as any).bloomRun; });
  const retained = await snapshot(page);
  expect(requests.some(url => /\/vgpu\/|\/vgpu\.js/.test(url))).toBe(false);

  await chooseOption(theme(page), 'custom');
  await expect(shell(page)).toHaveAttribute('data-theme', 'custom');
  await expect(shell(page)).toHaveAttribute('data-skin', 'abyss');
  await expect(page.locator('.world-canvas')).toHaveAttribute('data-renderer', 'vgpu');
  expect(await snapshot(page)).toBe(retained);
  expect(await page.evaluate(() => (window as any).bloomRun === (window as any).retainedBloomRun)).toBe(true);
  await page.clock.runFor(60);

  // Switching away releases the GPU; switching back preserves the paused run.
  await chooseOption(theme(page), 'assets');
  await expect(shell(page)).toHaveAttribute('data-theme', 'assets');
  expect(await deviceStates(page)).toEqual([true]);
  await chooseOption(theme(page), 'custom');
  await expect(shell(page)).toHaveAttribute('data-theme', 'custom');
  expect(await snapshot(page)).toBe(retained);

  // Paused active time is stable; resuming advances the retained simulation.
  await page.clock.fastForward(60000);
  expect(await snapshot(page)).toBe(retained);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(500);
  await page.locator('.world-canvas').screenshot({ path: 'test-results/abyssal-bloom.png' });
  await page.keyboard.press('Escape');
  const progressed = await snapshot(page);
  expect(progressed).not.toBe(retained);
  await page.evaluate(() => (window as any).bloomDevices.at(-1).gpu.destroy());
  await expect(shell(page)).toHaveAttribute('data-theme', 'normal');
  await expect(page.locator('.asset-status')).toContainText('Restored Normal');
  expect(await snapshot(page)).toBe(progressed);
  expect(await deviceStates(page)).toEqual([true, true]);

  await chooseOption(theme(page), 'custom');
  await expect(shell(page)).toHaveAttribute('data-theme', 'custom');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.clock.runFor(40);
  await expect(shell(page)).toHaveAttribute('data-theme', 'custom');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await deviceStates(page)).toEqual([true, true, true]);
  expect(errors).toEqual([]);
});

test('unavailable WebGPU and failed surface preparation retain the working presentation', async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined }));
  await chooseOption(theme(page), 'custom');
  await expect(page.locator('.asset-status')).toContainText('WebGPU is unavailable');
  await expect(theme(page)).toHaveAttribute('value', 'normal');
  await expect(shell(page)).toHaveAttribute('data-theme', 'normal');
  expect(await deviceStates(page)).toEqual([]);
  const retained = await snapshot(page);
  await page.evaluate(() => {
    delete (navigator as any).gpu;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgpu') return null;
      return original.call(this, type, ...args);
    } as typeof original;
  });
  await chooseOption(theme(page), 'custom');
  await expect(page.locator('.asset-status')).toContainText('Keeping current appearance');
  await expect(theme(page)).toHaveAttribute('value', 'normal');
  expect(await snapshot(page)).toBe(retained);
  expect(await deviceStates(page)).toEqual([true]);
  await expect(page.locator('.play-surface canvas')).toHaveCount(2);
});

test('superseded compilation and late acquisition after unmount release their GPU resources', async ({ page }) => {
  await page.evaluate(() => { (window as any).holdBloom = 'compile'; });
  await chooseOption(theme(page), 'custom');
  await expect.poll(() => page.evaluate(() => typeof (window as any).releaseBloom)).toBe('function');
  await expect(shell(page)).toHaveAttribute('data-theme', 'normal');
  await chooseOption(theme(page), 'assets');
  await expect(shell(page)).toHaveAttribute('data-theme', 'assets');
  expect(await deviceStates(page)).toEqual([true]);
  await page.evaluate(() => { (window as any).releaseBloom(); delete (window as any).releaseBloom; });
  await expect(page.locator('.asset-status')).toBeHidden();

  await page.evaluate(() => { (window as any).holdBloom = 'device'; });
  await chooseOption(theme(page), 'custom');
  await expect.poll(() => page.evaluate(() => typeof (window as any).releaseBloom)).toBe('function');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await page.evaluate(() => (window as any).releaseBloom());
  await expect.poll(() => deviceStates(page)).toEqual([true, true]);
  await expect(page.locator('.clearing-app')).toHaveCount(0);
  await expect(page.locator('.world-canvas')).toHaveCount(0);
});
