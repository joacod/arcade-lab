import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/\/src\/common\/ui\/theme-choices\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replaceAll('import.meta.env.DEV', 'false') });
  });
});

test('a failed default Assets load gates Play and retries inside the mounted public menu', async ({ page }) => {
  const keeper = '**/art/bellgarden/keeper.svg';
  await page.route(keeper, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Clockwork Hollow', exact: true }).click();
  await expect(page.locator('.game-menu-art-status')).toContainText('Artwork could not load');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeEnabled();

  await expect(page.locator('.menu-theme-choices input')).toHaveCount(2);
  await expect(page.locator('.menu-theme-choices input:checked')).toHaveCount(0);
  await page.unroute(keeper);
  await page.getByRole('button', { name: 'Retry artwork', exact: true }).click();
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'assets');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await expect(page.locator('.game-menu-art-status')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
});

test('changing the initial theme follows the latest artwork request without a stale failure', async ({ page }) => {
  let releaseAssets!: () => void, releaseQuality!: () => void;
  const assets = new Promise<void>(resolve => { releaseAssets = resolve; });
  const quality = new Promise<void>(resolve => { releaseQuality = resolve; });
  let assetsRequested = false, qualityRequested = false;
  await page.route('**/art/bellgarden/keeper.svg', async route => {
    assetsRequested = true; await assets; await route.continue();
  });
  await page.route('**/art/lumen/keeper.png', async route => {
    qualityRequested = true; await quality; await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Clockwork Hollow', exact: true }).click();
  await expect.poll(() => assetsRequested).toBe(true);

  await page.locator('.menu-theme-choices input[value="quality"]').click();
  await expect.poll(() => qualityRequested).toBe(true);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(page.locator('.game-menu-art-status')).toHaveText('Preparing artwork…');
  releaseQuality();
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'quality');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  releaseAssets();
  await expect(page.locator('.game-menu-art-status')).toBeHidden();
  await expect(page.locator('.menu-theme-choices input[value="quality"]')).toBeChecked();
});
