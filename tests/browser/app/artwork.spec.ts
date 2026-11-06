import { test, expect } from '@playwright/test';

test('required artwork failure gates Play and retries in the same session', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const keeper = '**/art/bellgarden/keeper.svg';
  await page.route(keeper, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Clockwork Hollow', exact: true }).click();
  const surface = await page.locator('.play-surface').elementHandle();
  await expect(page.locator('.game-menu-art-status')).toContainText('Artwork could not load');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeEnabled();
  await page.unroute(keeper);
  await page.getByRole('button', { name: 'Retry artwork', exact: true }).click();
  await expect(page.locator('.game-menu-art-status')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  expect(await surface!.evaluate(element => element === document.querySelector('.play-surface'))).toBe(true);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('[data-menu-owner]')).toHaveAttribute('data-screen', 'playing');
  expect(errors).toEqual([]);
});
