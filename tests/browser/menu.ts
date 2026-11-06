import type { Locator, Page } from '@playwright/test';

/** Reach the paused menu without changing the run or opening unrelated controls. */
export async function openMenu(page: Page) {
  if (await page.locator('[data-menu-owner]').getAttribute('data-screen') === 'playing') {
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  }
}

/** Select the same visible radio choices used by players. */
export async function chooseTheme(control: Locator, value: string) {
  await control.locator(`input[value="${value}"]`).click();
}

export async function chooseRound(page: Page, value: string) {
  await page.locator(`input[name="clearing-round"][value="${value}"]`).check();
}
