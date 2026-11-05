import type { Locator, Page } from '@playwright/test';

/** Reach settings through the same paused menu used by players. */
export async function openMenu(page: Page) {
  if (await page.locator('[data-menu-owner]').getAttribute('data-screen') === 'playing') {
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  }
  await openSettings(page);
}

export async function openSettings(page: Page) {
  const settings = page.locator('.game-menu-preferences');
  await settings.waitFor({ state: 'visible' });
  if (!await settings.evaluate(element => (element as HTMLDetailsElement).open)) {
    await settings.locator('summary').click();
  }
}

/** Choose through the rendered listbox, including pointer and focus behavior. */
export async function chooseOption(control: Locator, value: string) {
  await openSettings(control.page());
  await control.click();
  const id = await control.getAttribute('aria-controls');
  await control.page().locator(`#${id} [role="option"][data-value="${value}"]`).click();
}

export async function chooseRound(page: Page, value: string) {
  await page.locator(`input[name="clearing-round"][value="${value}"]`).check();
}
