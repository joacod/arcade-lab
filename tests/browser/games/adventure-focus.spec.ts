import { test, expect } from '@playwright/test';
import { createRun } from '../../../src/games/point-and-click-adventure/game.ts';
import { SAVE_KEY, encode, snapshot } from '../../../src/games/point-and-click-adventure/save.ts';

// Protect the DOM/scene boundary and replaced-control focus in one bounded check.
// Pure rules cannot detect a swallowed tap, sticky item cursor or focusout pause.
test.use({ hasTouch: true });
test('direct scene actions and casebook choices retain usable focus', async ({ page }) => {
  const run = createRun();
  run.room = 'gallery';
  run.facts = ['introduced', 'tubeOpen', 'mechanism'];
  run.inventory.brush = run.inventory.poker = 'consumed'; run.inventory.longBrush = 'inventory';
  await page.goto('/');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value: encode(snapshot(run), null) });
  await page.getByRole('button', { name: 'Open game: The Thirteenth Guest', exact: true }).click();
  await page.getByRole('button', { name: 'Continue saved adventure', exact: true }).click();
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  await page.getByRole('button', { name: 'Spirit lantern', exact: true }).click();
  await page.getByRole('button', { name: 'Use Spirit lantern on Screaming portrait', exact: true }).tap();
  await expect(page.locator('.adventure-narration')).toContainText('No spectral outline');
  // Using an item returns to ordinary interaction without another mode switch.
  await page.getByRole('button', { name: 'Inspect vent: Screaming portrait', exact: true }).tap();
  await expect(page.locator('.adventure-narration')).toContainText('Evidence recorded');
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
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.play-surface')).toBeFocused();
});
