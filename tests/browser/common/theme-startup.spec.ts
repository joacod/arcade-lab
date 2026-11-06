import { test, expect } from '@playwright/test';

test('a failed default Arcade load gates Play and retries inside the mounted public menu', async ({ page }) => {
  const keeper = '**/art/bellgarden/keeper.svg';
  await page.route(keeper, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Clockwork Hollow', exact: true }).click();
  await expect(page.locator('.game-menu-art-status')).toContainText('Artwork could not load');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeEnabled();

  await expect(page.locator('.menu-theme-choices input')).toHaveCount(2);
  await expect(page.locator('.menu-theme-choices input:checked')).toHaveCount(1);
  await page.unroute(keeper);
  await page.getByRole('button', { name: 'Retry artwork', exact: true }).click();
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'arcade');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await expect(page.locator('.game-menu-art-status')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
});

test('changing the initial theme follows the latest artwork request without a stale failure', async ({ page }) => {
  let releaseArcade!: () => void, releaseDeluxe!: () => void;
  const arcade = new Promise<void>(resolve => { releaseArcade = resolve; });
  const deluxe = new Promise<void>(resolve => { releaseDeluxe = resolve; });
  let arcadeRequested = false, deluxeRequested = false;
  await page.route('**/art/bellgarden/keeper.svg', async route => {
    arcadeRequested = true; await arcade; await route.continue();
  });
  await page.route('**/art/lumen/keeper.png', async route => {
    deluxeRequested = true; await deluxe; await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Clockwork Hollow', exact: true }).click();
  await expect.poll(() => arcadeRequested).toBe(true);

  await page.locator('.menu-theme-choices input[value="deluxe"]').click();
  await expect.poll(() => deluxeRequested).toBe(true);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(page.locator('.game-menu-art-status')).toHaveText('Preparing artwork…');
  releaseDeluxe();
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'deluxe');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  releaseArcade();
  await expect(page.locator('.game-menu-art-status')).toBeHidden();
  await expect(page.locator('.menu-theme-choices input[value="deluxe"]')).toBeChecked();
});
