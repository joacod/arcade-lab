import type { Locator, Page } from '@playwright/test';

/** Reach the paused menu without changing the run or opening unrelated controls. */
export async function openMenu(page: Page) {
  if (await page.locator('[data-menu-owner]').getAttribute('data-screen') === 'playing') {
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  }
}

/** Select the same visible radio choices used by players; Normal is a separate development tool. */
export async function chooseTheme(control: Locator, value: string) {
  if (value === 'normal') {
    const development = control.locator('.menu-theme-development');
    if (!await development.evaluate(element => (element as HTMLDetailsElement).open)) await development.locator('summary').click();
  }
  await control.locator(`input[value="${value}"]`).click();
}

/** Isolate Normal-specific graphics/lifecycle fixtures; shared menu tests use the real Assets default. */
export async function useNormalBaseline(page: Page) {
  await page.route(/\/src\/common\/ui\/theme-choices\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(/(const initialTheme\s*=\s*)["']assets["']/, '$1"normal"') });
  });
}

export async function chooseRound(page: Page, value: string) {
  await page.locator(`input[name="clearing-round"][value="${value}"]`).check();
}
