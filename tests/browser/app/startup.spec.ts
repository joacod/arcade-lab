import { test, expect } from '@playwright/test';
import { gameInfo } from '../../../src/app/catalog-data.ts';

// One smoke per catalog entry: reach ready Arcade, start, and stop testing.
for (const { title } of gameInfo) {
  test(`${title} starts in Arcade`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: `Open game: ${title}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Arcade/, includeHidden: true })).toBeChecked();
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeEnabled();
    await expect(page.locator('.play-surface canvas').first()).toBeVisible();
    await play.click();
    await expect(page.locator('[data-menu-owner]')).toHaveAttribute('data-screen', 'playing');
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
