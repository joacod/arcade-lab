import { test, expect } from '@playwright/test';

test('shared menus fit compact screens and keep actions accessible across keyboard tabs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const games = ['Last Light Clearing', 'Skybreak', 'Clockwork Hollow', 'Midnight Circuit', 'Obsidian Duel', 'Blastline'];
  for (const title of games) {
    await page.getByRole('button', { name: `Play ${title}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('[data-control]:visible')).toHaveCount(0);
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await play.hover();
    const contrast = await play.evaluate(button => {
      const style = getComputedStyle(button);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      function luminance(color: string) {
        // CSS color-mix serializes as color(srgb ...), not necessarily rgb(0..255).
        context.fillStyle = color; context.fillRect(0, 0, 1, 1);
        const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(channel => {
          const value = channel / 255;
          return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        });
        return .2126 * r! + .7152 * g! + .0722 * b!;
      }
      const foreground = luminance(style.color), background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    });
    expect(contrast, `${title} primary action remains readable on hover`).toBeGreaterThanOrEqual(4.5);
    const game = page.getByRole('tab', { name: 'Game', exact: true });
    await game.focus();
    for (const name of ['Options', 'Controls', 'Game']) {
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name, exact: true })).toBeFocused();
      await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
      expect(await page.locator('.game-menu-body').evaluate(body => body.scrollHeight <= body.clientHeight + 1)).toBe(true);
      expect(await page.locator('.game-menu').evaluate(menu => menu.scrollWidth <= menu.clientWidth + 1)).toBe(true);
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeInViewport({ ratio: 1 });
    }
    if (title === games[0]) {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.getByRole('tab', { name: 'Options', exact: true }).click();
      expect(await page.locator('.game-menu-body').evaluate(body => body.scrollHeight <= body.clientHeight + 1)).toBe(true);
      await expect(page.getByLabel('Appearance', { exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport({ ratio: 1 });
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Paused', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
    // A frozen run must not rewrite HUD/readout attributes or text on every draw.
    const mutations = await page.locator('[data-menu-owner]').evaluate(async root => {
      await new Promise(requestAnimationFrame);
      let count = 0;
      const recording = new MutationObserver(records => { count += records.length; });
      recording.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
      for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
      count += recording.takeRecords().length; recording.disconnect();
      return count;
    });
    expect(mutations, `${title} leaves unchanged UI untouched`).toBe(0);
    await expect(game).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Options', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Play ${title}`, exact: true })).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('composed menu fields retain native labels, values and session-owned listeners', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/engine/browser/menu-components.ts';
    const { createSelectField, createRangeField, createMenuReadout } = await import(path);
    const menuPath = '/src/engine/browser/menu.ts';
    const { createGameMenu } = await import(menuPath);
    const lifetime = new AbortController(), events: (string | number)[] = [];
    const field = createSelectField({ label: 'Difficulty', choices: { gentle: 'Gentle', brisk: 'Brisk' }, value: 'gentle', signal: lifetime.signal, onChange: (value: string) => events.push(value) });
    const range = createRangeField({ label: 'Volume', accessibleLabel: 'Test volume', min: 0, max: 100, step: 5, value: 45, signal: lifetime.signal, onInput: (value: number) => events.push(value) });
    const readout = createMenuReadout('Test results'); readout.update('100 POINTS\n2 lives'); readout.element.hidden = false;
    const settings = document.createElement('div'); settings.append(field.element, range.element);
    const root = document.createElement('div'), stage = document.createElement('div'), surface = document.createElement('div'), pause = document.createElement('button');
    root.append(stage, pause); stage.append(surface); document.body.replaceChildren(root);
    const menu = createGameMenu(root, surface, stage, { id: 'test', title: 'Test game', signal: lifetime.signal, pause, gameplayUI: [], game: readout.element, options: settings, controls: '<p>Authored controls</p>', actions: [], onAction() {}, onMute() {}, onFullscreen() {} });
    menu.show('title', false);
    (window as any).menuProbe = { lifetime, events, field, range, readout };
  });
  await expect(page.getByLabel('Test results', { exact: true })).toHaveText('100 POINTS\n2 lives');
  await expect(page.getByLabel('Test results', { exact: true })).toHaveAttribute('aria-live', 'off');
  await page.getByRole('tab', { name: 'Options', exact: true }).click();
  await expect(page.getByLabel('Difficulty', { exact: true })).toHaveValue('gentle');
  await page.getByLabel('Difficulty', { exact: true }).selectOption('brisk');
  await page.getByLabel('Test volume', { exact: true }).fill('75');
  expect(await page.evaluate(() => (window as any).menuProbe.events)).toEqual(['brisk', 75]);
  const result = await page.evaluate(() => {
    const { lifetime, events, field, range, readout } = (window as any).menuProbe;
    // Programmatic synchronization must not emit another game intent.
    field.input.value = 'gentle'; range.input.value = '50';
    const observer = new MutationObserver(() => {}); observer.observe(readout.element, { childList: true, subtree: true, characterData: true });
    readout.update('100 POINTS\n2 lives');
    const unchangedMutations = observer.takeRecords().length; observer.disconnect();
    // Even retained DOM references cannot call a disposed session.
    lifetime.abort();
    field.input.dispatchEvent(new Event('change')); range.input.dispatchEvent(new Event('input'));
    return { events, unchangedMutations };
  });
  expect(result).toEqual({ events: ['brisk', 75], unchangedMutations: 0 });
});
