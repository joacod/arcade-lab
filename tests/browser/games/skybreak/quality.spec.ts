import { test, expect } from '@playwright/test';

async function probe(page: import('@playwright/test').Page) {
  await page.route(/\/src\/games\/skybreak\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = () => { const run = original(); window.flightProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (window as any).foundryContexts = [];
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
      const ctx = (original as any).call(this, type, ...args);
      if (type === 'webgl2' && ctx && !(window as any).foundryContexts.includes(ctx)) (window as any).foundryContexts.push(ctx);
      return ctx;
    } as any;
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Play Skybreak', exact: true }).click();
}

test('Quality preserves an ongoing sortie, freezes its output, survives restart and recovers from graphics loss', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await probe(page);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(2300);
  await page.keyboard.press('Escape');
  const state = () => page.evaluate(() => JSON.stringify((window as any).flightProbe));
  const frozen = await state();
  await theme.selectOption('quality'); await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'quality');
  expect(await state()).toBe(frozen);
  expect(await page.evaluate(() => (window as any).foundryContexts.length)).toBe(1);
  await page.clock.runFor(100);
  const surface = page.locator('.play-surface'); const picture = await surface.screenshot();
  await page.clock.runFor(1200); expect((await surface.screenshot()).equals(picture), 'paused presentation stays unchanged').toBe(true); expect(await state()).toBe(frozen);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(100);
  expect(await state()).not.toBe(frozen);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(50);
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'quality');
  expect(await page.evaluate(() => (window as any).flightProbe.elapsed)).toBeLessThan(0.1);
  // Loss while playing suspends the same run and supplies a working baseline.
  await page.evaluate(() => (window as any).foundryContexts[0].getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'normal');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.locator('.skybreak-asset-status')).toContainText('Your sortie is preserved');
  const recovered = await state(); await page.clock.runFor(500); expect(await state()).toBe(recovered);
  await theme.selectOption('quality'); await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'quality');
  await theme.selectOption('normal');
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'normal');
  expect(await page.evaluate(() => (window as any).foundryContexts.every((ctx: WebGL2RenderingContext) => ctx.isContextLost()))).toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0); expect(errors).toEqual([]);
});

test('Quality handles cancelled and failed backdrop preparation without replacing the working renderer', async ({ page }) => {
  await probe(page);
  let finish: (() => Promise<void>) | undefined;
  await page.route('**/orbital-foundry/backdrop.webp', route => new Promise<void>(resolve => {
    finish = async () => { await route.continue(); resolve(); };
  }));
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await theme.selectOption('quality'); await expect.poll(() => !!finish).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);
  await theme.selectOption('normal'); await finish!(); await page.clock.runFor(100);
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'normal');
  expect(await page.evaluate(() => (window as any).foundryContexts.length)).toBe(0);
  await page.unroute('**/orbital-foundry/backdrop.webp');
  await page.evaluate(async () => {
    const path = '/src/games/skybreak/themes.ts'; const { themes } = await import(path);
    themes.quality.quality.backdrop += '?failure';
  });
  await page.route('**/orbital-foundry/backdrop.webp?failure', route => route.abort());
  await theme.selectOption('quality'); await expect(page.locator('.skybreak-asset-status')).toContainText('Keeping Pacific Run');
  await expect(theme).toHaveValue('normal'); await expect(page.locator('canvas')).toHaveCount(1);
  await page.evaluate(async () => {
    const path = '/src/games/skybreak/themes.ts'; const { themes } = await import(path);
    themes.quality.quality.backdrop = themes.quality.quality.backdrop.replace('?failure', '?disposal');
  });
  finish = undefined;
  await page.route('**/orbital-foundry/backdrop.webp?disposal', route => new Promise<void>(resolve => {
    finish = async () => { await route.continue(); resolve(); };
  }));
  await theme.selectOption('quality'); await expect.poll(() => !!finish).toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await finish!(); await page.clock.runFor(100);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).foundryContexts.length)).toBe(0);
});

test('Quality construction failure and reduced motion keep the sortie readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await probe(page);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (window as any).restoreContext = () => { HTMLCanvasElement.prototype.getContext = original; };
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
      return type === 'webgl2' ? null : (original as any).call(this, type, ...args);
    } as any;
  });
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await theme.selectOption('quality'); await expect(page.locator('.skybreak-asset-status')).toContainText('Keeping Pacific Run');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.evaluate(() => (window as any).restoreContext());
  await theme.selectOption('quality'); await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'quality');
  const picture = await page.locator('.play-surface').screenshot();
  await page.clock.runFor(1800); expect((await page.locator('.play-surface').screenshot()).equals(picture), 'reduced-motion title stays unchanged').toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await page.evaluate(() => (window as any).foundryContexts.every((ctx: WebGL2RenderingContext) => ctx.isContextLost()))).toBe(true);
});
