import { test, expect } from '@playwright/test';
import { createRun } from '../../../src/games/point-and-click-adventure/game.ts';
import { SAVE_KEY, encode, snapshot } from '../../../src/games/point-and-click-adventure/save.ts';

// Protect the DOM/scene boundary and replaced-control focus in one bounded check.
// Pure rules cannot detect a swallowed tap, sticky item cursor or focusout pause.
test.use({ hasTouch: true });
test('direct scene actions and casebook choices retain usable focus', async ({ page }) => {
  const run = createRun();
  run.room = 'gallery';
  run.journal = [{ title: 'A conversation about the portrait', room: 'gallery', lines: [{ speaker: 'Wren', text: 'A physical draft behind the portrait.' }] }];
  run.facts = ['introduced', 'tubeOpen', 'mechanism'];
  run.inventory.brush = run.inventory.poker = 'consumed'; run.inventory.longBrush = 'inventory';
  await page.goto('/');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value: encode(snapshot(run), null) });
  await page.getByRole('button', { name: 'Open game: The Thirteenth Guest', exact: true }).click();
  await page.getByRole('button', { name: 'Continue saved adventure', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Inventory', exact: true })).toHaveText('Inventory (I)');
  await page.getByRole('button', { name: 'Inspect vent: Screaming portrait', exact: true }).focus();
  await page.keyboard.press('KeyI');
  await page.getByRole('button', { name: 'Spirit lantern', exact: true }).click();
  await page.getByRole('button', { name: 'Use Spirit lantern on Screaming portrait', exact: true }).tap();
  await expect(page.locator('.adventure-narration')).toContainText('No spectral outline');
  // Using an item returns to ordinary interaction without another mode switch.
  await page.getByRole('button', { name: 'Inspect vent: Screaming portrait', exact: true }).tap();
  await expect(page.locator('.adventure-narration')).toContainText('Evidence recorded');
  await page.keyboard.press('KeyB');
  // Reading text and pressing disabled controls must not focus the inert scene.
  await page.getByRole('heading', { name: 'Casebook', exact: true }).tap();
  await expect(page.locator('.adventure-game')).toHaveAttribute('data-screen', 'playing');
  await page.locator('.adventure-evidence p').first().tap();
  await page.getByRole('button', { name: 'Connect clues', exact: true }).click();
  const submit = page.getByRole('button', { name: 'Make deduction', exact: true });
  const bounds = await submit.boundingBox();
  await page.touchscreen.tap(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await expect(page.locator('.adventure-game')).toHaveAttribute('data-screen', 'playing');
  await page.getByRole('button', { name: 'A draft behind the scream', exact: true }).click();
  await page.getByRole('button', { name: 'A manufactured scream', exact: true }).click();
  await submit.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.adventure-conclusion')).toContainText('The portrait scare is manufactured');
  await expect(page.getByRole('button', { name: 'Connect clues', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search journal' });
  await search.pressSequentially('portrait');
  await expect(page.locator('.adventure-game')).toHaveAttribute('data-screen', 'playing');
  await expect(page.locator('.adventure-journal-entry')).toHaveCount(1);
  await page.locator('.adventure-journal-entry summary').tap();
  await expect(page.locator('.adventure-journal-entry p')).toContainText('A physical draft');
  await page.locator('.adventure-journal-entry p').tap();
  await expect(page.locator('.adventure-game')).toHaveAttribute('data-screen', 'playing');
  await search.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.play-surface')).toBeFocused();
});
