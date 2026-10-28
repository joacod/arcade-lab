import type { Page } from '@playwright/test';

/** Reach settings through the same paused menu used by players. */
export async function openMenu(page: Page) {
  if (await page.locator('[data-menu-owner]').getAttribute('data-screen') === 'playing') {
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  }

}
