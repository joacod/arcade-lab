import { useNormalBaseline } from '../../menu.ts';
import { chooseTheme } from '../../menu.ts';
import { test, expect, type Page } from '@playwright/test';


test.beforeEach(async ({ page }) => {
  await page.route(/\/src\/games\/last-light-clearing\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const originalRun = createRun;
      createRun = (...args) => { const run = originalRun(...args); window.appearanceRun = run; return run; };` });
  });
  await page.clock.install();
  await useNormalBaseline(page); await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
});

const theme = (page: Page) => page.getByRole('group', { name: 'Theme', exact: true });
const shell = (page: Page) => page.locator('.clearing-app');
const snapshot = (page: Page) => page.evaluate(() => JSON.stringify((window as any).appearanceRun,
  (_, value) => value instanceof Map ? [...value] : value));

test('menu geometry uses the game viewport across all three themes', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 620 });
  await page.clock.runFor(50);
  const geometry = () => page.locator('.game-menu').evaluate(menu => {
    const rect = menu.getBoundingClientRect(), actions = menu.querySelector('footer')!.getBoundingClientRect();
    const body = menu.querySelector('.game-menu-body')!;
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, actionsY: actions.y,
      scroll: body.scrollHeight - body.clientHeight };
  });

  const baseline = await geometry(), retained = await snapshot(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport({ ratio: 1 });
  for (const mode of ['assets', 'quality', 'normal']) {
    await chooseTheme(theme(page), mode);
    await expect(shell(page)).toHaveAttribute('data-theme', mode);
    await page.clock.runFor(50);
    const { scroll: _scroll, ...frame } = await geometry();
    const { scroll: _baselineScroll, ...baselineFrame } = baseline;
    expect(frame, `${mode} menu frame`).toEqual(baselineFrame);
    expect(await snapshot(page)).toBe(retained);
  }
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.clock.runFor(50);
  const fullscreen = await geometry();
  await chooseTheme(theme(page), 'assets');
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
