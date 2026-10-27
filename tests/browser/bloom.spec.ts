import { test, expect } from '@playwright/test';

test('Abyss switching and native device loss preserve the current run', async ({ page }) => {
  await page.route(/\/src\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      clearing.initialEnemy.x = 500; clearing.progression.firstCost = 5;
      const original = createRun; createRun = (...args) => { const run = original(...args); window.runProbe = run; return run; };` });
  });
  await page.route(/\/src\/vgpu\/bloom\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('const output = surface',
      'window.devices ??= []; window.devices.push(gpu); const output = surface') });
  });
  await page.clock.install(); await page.goto('/');
  await page.getByRole('button', { name: 'Play Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await expect(page.locator('.asset-status')).toBeHidden();
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await page.clock.runFor(1700);
  await page.getByRole('button', { name: /Halo · Rank 1/ }).click(); await page.clock.runFor(50);
  await page.keyboard.down('d'); await page.clock.runFor(350); await page.keyboard.up('d');
  await page.keyboard.press('Escape');
  const snapshot = () => page.evaluate(() => JSON.stringify((window as any).runProbe, (_, v) => v instanceof Map ? [...v] : v));
  const retained = await snapshot();
  const supported = await page.evaluate(async () => Boolean(await navigator.gpu?.requestAdapter()));
  if (supported) {
    await page.evaluate(() => {
      const original = GPUDevice.prototype.createRenderPipelineAsync;
      (window as any).restorePipeline = () => { GPUDevice.prototype.createRenderPipelineAsync = original; };
      GPUDevice.prototype.createRenderPipelineAsync = () => Promise.reject(new Error('shader preparation probe'));
    });
    await page.getByLabel('Appearance', { exact: true }).selectOption('abyss');
    await expect(page.locator('.asset-status')).toContainText('pipeline compilation failed');
    expect(await snapshot()).toBe(retained);
    expect(await page.evaluate(() => (window as any).devices.every((gpu: any) => gpu.disposed))).toBe(true);
    await page.evaluate(() => (window as any).restorePipeline());
    // Supersede an acquisition still pending in the native API.
    await page.evaluate(() => {
      const original = navigator.gpu.requestAdapter.bind(navigator.gpu);
      (window as any).restoreAdapter = () => { navigator.gpu.requestAdapter = original; };
      navigator.gpu.requestAdapter = () => new Promise(resolve => { (window as any).releaseAdapter = () => resolve(null); });
    });
    await page.getByLabel('Appearance', { exact: true }).selectOption('abyss');
    await expect(page.locator('.asset-status')).toContainText('Preparing Abyssal Bloom');
    await page.getByLabel('Appearance', { exact: true }).selectOption('moonglass');
    await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', 'moonglass');
    await page.evaluate(() => { (window as any).releaseAdapter(); (window as any).restoreAdapter(); });
    expect(await snapshot()).toBe(retained);
  }
  await page.getByLabel('Appearance', { exact: true }).selectOption('abyss');
  await expect(page.getByRole('button', { name: 'Resume surviving' })).toBeEnabled();
  if (!supported) {
    await expect(page.locator('.asset-status')).toContainText('Keeping current appearance');
    expect(await snapshot()).toBe(retained);
    test.skip(true, 'No WebGPU adapter; initialization failure retention verified. Run headed for the GPU path.');
  }
  await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', 'abyss');
  await expect(page.locator('.world-canvas')).toHaveAttribute('data-renderer', 'vgpu');
  await expect(page.locator('.clearing-app')).toHaveAttribute('data-skin', 'abyss');
  await page.getByLabel('Interface', { exact: true }).selectOption('rune');
  for (const appearance of ['prism', 'abyss', 'woodland', 'abyss']) {
    await page.getByLabel('Appearance', { exact: true }).selectOption(appearance);
    await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', appearance);
    await expect(page.locator('.clearing-app')).toHaveAttribute('data-skin', 'rune');
    expect(await snapshot()).toBe(retained); expect(await page.locator('.world-canvas').count()).toBe(1);
  }
  expect(await page.evaluate(() => (window as any).devices.slice(0, -1).every((gpu: any) => gpu.disposed))).toBe(true);
  await page.getByRole('button', { name: 'Resume surviving' }).click(); await page.clock.runFor(500);
  expect(await snapshot()).not.toBe(retained);
  await page.evaluate(() => (window as any).devices.at(-1).gpu.destroy());
  await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', 'woodland');
  await expect(page.locator('.clearing-app')).toHaveAttribute('data-screen', 'paused');
  await expect(page.locator('.asset-status')).toContainText('Your run is safe');
  const frozen = await snapshot(); await page.clock.runFor(500); expect(await snapshot()).toBe(frozen);
  expect(await page.evaluate(() => (window as any).devices.every((gpu: any) => gpu.disposed))).toBe(true);
  await page.getByRole('button', { name: 'Resume surviving' }).click(); await page.clock.runFor(200);
  expect(await snapshot()).not.toBe(frozen);
});

test('Three materials and smooth atlas UVs follow the selected definition', async ({ page }) => {
  await page.route(/\/src\/three\/garden\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('renderer.render(scene, camera);', `
      renderer.render(scene, camera);
      window.materialProbe = { colors: [keeperMat, enemyMat, eliteMat, spark.material, shards.material, halo.material, gems.material].map(m => m.color.getHexString()),
        linear: [...atlas.values()].every(t => t.magFilter === THREE.LinearFilter && !t.generateMipmaps), uv: [...keeper.card.geometry.getAttribute('uv').array] };`) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Last Light Clearing', exact: true }).click();
  const result = await page.evaluate(async () => {
    const paths = ['/src/three/garden.ts', '/src/themes.ts', '/src/assets.ts', '/src/game.ts'];
    const [{ createGarden }, { themes }, { prepareAssets }, { createRun }] = await Promise.all(paths.map(p => import(p)));
    const base = themes['ember-garden'], palette = { ...base.palette };
    const keys = ['light', 'enemy', 'elite', 'spark', 'shard', 'halo', 'gem'];
    keys.forEach((key, i) => { palette[key] = '#' + (0x123456 + i * 0x111111).toString(16); });
    const bundle = await prepareAssets(base.art, new AbortController().signal);
    const renderer = createGarden({ ...base, palette, art: { ...base.art, sampling: 'smooth' } }, bundle.images, () => {});
    try {
      const run = createRun(); renderer.reset(run); renderer.resize({ width: 960, height: 640, ratio: 1 }); renderer.draw(run, { x: 0, y: 0, scale: 1 });
      return { probe: (window as any).materialProbe, expected: keys.map(key => palette[key].slice(1)) };
    } finally { renderer.dispose(); bundle.dispose(); }
  });
  expect(result.probe.colors).toEqual(result.expected); expect(result.probe.linear).toBe(true);
  expect(result.probe.uv[2] - result.probe.uv[0]).toBeCloseTo(15 / 512, 7);
  expect(result.probe.uv[1] - result.probe.uv[5]).toBeCloseTo(27 / 512, 7);
});
