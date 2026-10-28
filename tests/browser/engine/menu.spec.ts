import { test, expect } from '@playwright/test';

test('shared menus fit compact screens and keep actions accessible across keyboard tabs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const games = ['Last Light Clearing', 'Skybreak', 'Clockwork Hollow', 'Midnight Circuit', 'Obsidian Duel', 'Blastline'];
  for (const title of games) {
    await page.getByRole('button', { name: `Play ${title}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('[data-control]:visible')).toHaveCount(0);
    const game = page.getByRole('tab', { name: 'Game', exact: true });
    await game.focus();
    for (const name of ['Options', 'Controls', 'Game']) {
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name, exact: true })).toBeFocused();
      await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
      expect(await page.locator('.game-menu-body').evaluate(body => body.scrollHeight <= body.clientHeight + 1)).toBe(true);
      expect(await page.locator('.game-menu').evaluate(menu => menu.scrollWidth <= menu.clientWidth + 1)).toBe(true);
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeInViewport({ ratio: 1 });
    }
    if (title === games[0]) {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.getByRole('tab', { name: 'Options', exact: true }).click();
      expect(await page.locator('.game-menu-body').evaluate(body => body.scrollHeight <= body.clientHeight + 1)).toBe(true);
      await expect(page.getByLabel('Appearance', { exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport({ ratio: 1 });
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Paused', exact: true })).toBeVisible();
    await expect(game).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Options', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
