import { test, expect } from '@playwright/test';

for (const name of ['Last Light Clearing', 'Clockwork Hollow', 'Midnight Circuit', 'Obsidian Duel', 'Blastline', 'Skybreak']) {
  test(`${name} waits for required artwork and can retry without remounting`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    const artwork = /\/src\/games\/[^/]+\/art\/.*\.(svg|png|webp)(?:\?.*)?$/;
    await page.route(artwork, route => route.abort());
    await page.getByRole('button', { name: `Open game: ${name}`, exact: true }).click();
    await expect(page.locator('.game-menu-art-status')).toContainText('Artwork could not load');
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeEnabled();

    await expect(page.getByRole('radio', { name: /^Quality/ })).toBeEnabled();
    await page.unroute(artwork);
    await page.getByRole('button', { name: 'Retry artwork', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
    await expect(page.locator('.game-menu-art-status')).toBeHidden();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
