import { test, expect } from '@playwright/test';
import { gameInfo } from '../../../src/app/catalog-data.ts';
import { gamePath } from '../../../src/app/routes.ts';

// One smoke per catalog entry: reach its ready presentation, start, and stop testing.
for (const game of gameInfo) {
  const { title } = game;
  const presentation = 'Arcade';
  test(`${title} starts in ${presentation}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(gamePath(game));
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: new RegExp(`^${presentation}`), includeHidden: true })).toBeChecked();
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeEnabled();
    await expect(page.locator('.play-surface canvas').first()).toBeVisible();
    await play.click();
    await expect(page.locator('[data-menu-owner]')).toHaveAttribute('data-screen', 'playing');
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
