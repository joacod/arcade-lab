import { test, expect } from '@playwright/test';
import { createRun } from '../../../src/games/point-and-click-adventure/game.ts';
import { SAVE_KEY, encode, snapshot } from '../../../src/games/point-and-click-adventure/save.ts';

// A completed choice becomes disabled while its DOM is replaced. Native focus
// must land on an enabled investigation control before deferred focusout settles.
test('supporting a deduction retains focus inside the playable casebook', async ({ page }) => {
  const run = createRun();
  run.facts = ['introduced', 'vent', 'tubeOpen', 'mechanism'];
  run.inventory.brush = run.inventory.poker = 'consumed'; run.inventory.longBrush = 'inventory';
  await page.goto('/');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value: encode(snapshot(run), null) });
  await page.getByRole('button', { name: 'Open game: The Thirteenth Guest', exact: true }).click();
  await page.getByRole('button', { name: 'Continue saved adventure', exact: true }).click();
  await page.getByRole('button', { name: 'Casebook', exact: true }).click();
  await page.getByRole('checkbox', { name: /A draft behind the scream/ }).check();
  await page.getByRole('checkbox', { name: /A manufactured scream/ }).check();
  const conclusion = page.getByRole('button', { name: 'Propose: The portrait scare is manufactured', exact: true });
  await conclusion.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '✓ The portrait scare is manufactured', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: /A draft behind the scream/ })).toBeFocused();
  // A browser event turn lets the real deferred focus policy settle without a timer guess.
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.locator('.adventure-game')).toHaveAttribute('data-screen', 'playing');
  await expect(page.getByRole('button', { name: 'Journal', exact: true })).toBeFocused();
});
