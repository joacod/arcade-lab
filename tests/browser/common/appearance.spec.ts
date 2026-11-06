import { test, expect } from '@playwright/test';

test('switching presentation preserves the paused run and Resume advances it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Observe identity and state without adding a production inspection API.
  await page.route(/\/src\/games\/skybreak\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun;
      createRun = (...args) => { const run = original(...args); window.presentationRun = run; return run; };` });
  });
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000); // Freeze before navigation, while there is no game loop.
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Skybreak', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(50);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  const frozen = await page.evaluate(() => {
    (window as any).retainedRun = (window as any).presentationRun;
    return JSON.stringify((window as any).presentationRun);
  });
  await page.getByRole('radio', { name: /^Deluxe/ }).click();
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'deluxe');
  await page.clock.runFor(32);
  expect(await page.evaluate(() => JSON.stringify((window as any).presentationRun))).toBe(frozen);
  expect(await page.evaluate(() => (window as any).presentationRun === (window as any).retainedRun)).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(50);
  expect(await page.evaluate(() => (window as any).presentationRun.elapsed)).toBeGreaterThan(JSON.parse(frozen).elapsed);
  expect(await page.evaluate(() => (window as any).presentationRun === (window as any).retainedRun)).toBe(true);
  expect(errors).toEqual([]);
});
