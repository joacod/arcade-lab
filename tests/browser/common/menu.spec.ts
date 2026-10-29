import { chooseOption } from '../menu.ts';
import { test, expect } from '@playwright/test';

test('shared menus fit compact screens and keep actions accessible with a single theme selector', async ({ page }) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const games = ['Last Light Clearing', 'Skybreak', 'Clockwork Hollow', 'Midnight Circuit', 'Obsidian Duel', 'Blastline'];
  for (const title of games) {
    requests.length = 0;
    await page.getByRole('button', { name: `Open game: ${title}`, exact: true }).click();
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
    await expect(page.getByRole('tab')).toHaveCount(0);
    const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
    await expect(theme).toHaveAttribute('value', 'normal');
    await expect(page.locator('.menu-theme-note')).toContainText('keeps your run');
    if (title === 'Blastline') {
      await expect(theme.locator('..').locator('[role="option"][aria-selected="true"]')).toHaveText('Normal · Iron coast');
      await expect(page.locator('.menu-theme-note')).toContainText('Unavailable: Assets, Quality');
    }
    if (title === 'Last Light Clearing') await expect(theme.locator('..').locator('[role="option"][data-value="quality"]')).toHaveText('Quality · Prism Garden');
    expect(requests.filter(url => /\/src\/games\/[^/]+\/(three|vgpu|quality)\/|\/art\/(?!cover\.svg)[^?]+\.(png|svg|webp)/.test(url)), `${title} starts without graphics libraries or image sheets`).toEqual([]);
    expect(await theme.locator('..').locator('[role="option"]').evaluateAll(options => options.map(o => (o as HTMLElement).dataset.value))).toEqual(title === 'Last Light Clearing' ? ['normal', 'assets', 'quality', 'custom'] : ['normal', 'assets', 'quality']);
    await expect(theme.locator('..').locator('[role="option"][data-value="quality"]')).toHaveAttribute('aria-disabled', String(!['Last Light Clearing', 'Midnight Circuit', 'Skybreak'].includes(title)));
    if (['Clockwork Hollow', 'Obsidian Duel', 'Blastline', 'Midnight Circuit'].includes(title)) await expect(theme.locator('..').locator('[role="option"][data-value="assets"]')).toHaveAttribute('aria-disabled', 'true');
    await theme.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toBeFocused();
    const controls = page.locator('.game-menu-controls summary');
    await controls.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.game-menu-controls')).toHaveAttribute('open', '');
    expect(await page.locator('.game-menu').evaluate(menu => menu.scrollWidth <= menu.clientWidth + 1)).toBe(true);
    await expect(play).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Enter');
    if (title === games[0]) {
      await page.setViewportSize({ width: 844, height: 390 });
      await theme.scrollIntoViewIfNeeded();
      await expect(theme).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toBeInViewport({ ratio: 1 });
      await expect(controls).toBeInViewport({ ratio: 1 });
      await expect(play).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: 'test-results/theme-menu-landscape.png' });
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    const root = page.locator('[data-menu-owner]');
    await page.keyboard.down('p');
    await expect(root).toHaveAttribute('data-screen', 'paused');
    await page.keyboard.down('p'); // Native repeat must not resume the run.
    await expect(root).toHaveAttribute('data-screen', 'paused');
    await page.keyboard.up('p');
    await theme.focus();
    await page.keyboard.press('p'); // Select fields keep their own keyboard interaction.
    await expect(root).toHaveAttribute('data-screen', 'paused');
    await page.locator('.game-menu-body').focus();
    await page.keyboard.press('p');
    await expect(root).toHaveAttribute('data-screen', 'playing');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
    if (title === 'Skybreak') {
      await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
      await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
      await page.getByRole('button', { name: 'Resume', exact: true }).focus();
      await page.keyboard.press('p');
      await expect(root).toHaveAttribute('data-screen', 'playing');
      await page.keyboard.press('p');
      await expect(root).toHaveAttribute('data-screen', 'paused');
      await page.keyboard.press('p');
      // A browser-owned exit may deliver no Escape keydown at all.
      await page.evaluate(() => document.exitFullscreen());
      await expect(root).toHaveAttribute('data-screen', 'paused');
      await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
    }
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
    await expect(theme).toBeVisible();

    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Open game: ${title}`, exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: `Open game: ${title}`, exact: true }).locator('.arcade-return')).toHaveText('Last selected');
  }
  expect(errors).toEqual([]);
});

test('composed menu fields retain labels, values and session-owned listeners', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/common/ui/menu-components.ts';
    const { createSelectField, createMenuReadout } = await import(path);
    const menuPath = '/src/common/ui/menu.ts';
    const { createGameMenu } = await import(menuPath);
    const lifetime = new AbortController(), events: (string | number)[] = [];
    const field = createSelectField({ label: 'Difficulty', choices: { gentle: 'Gentle', brisk: 'Brisk' }, value: 'gentle', signal: lifetime.signal, onChange: (value: string) => events.push(value) });
    const themePath = '/src/common/ui/theme-select.ts';
    const { createThemeSelect } = await import(themePath);
    const theme = createThemeSelect({ modes: { custom: {} }, value: 'custom', signal: lifetime.signal, onChange: (value: string) => events.push(value) });
    const readout = createMenuReadout('Test results'); readout.update('100 POINTS\n2 lives'); readout.element.hidden = false;
    const settings = document.createElement('div'); settings.append(field.element, readout.element);
    const root = document.createElement('div'), stage = document.createElement('div'), surface = document.createElement('div'), pause = document.createElement('button');
    root.style.height = '100vh';
    root.append(stage, pause); stage.append(surface); document.body.replaceChildren(root);
    const menu = createGameMenu(root, surface, stage, { id: 'test', title: 'Test game', signal: lifetime.signal, pause, gameplayUI: [], game: settings, theme: theme.element, controls: '<p>Authored controls</p>', actions: [], onAction() {}, onMute() {}, onFullscreen() {} });
    menu.show('title', false);
    (window as any).menuProbe = { lifetime, events, field, theme, readout };
  });
  await expect(page.getByLabel('Test results', { exact: true })).toHaveText('100 POINTS\n2 lives');
  await expect(page.getByLabel('Test results', { exact: true })).toHaveAttribute('aria-live', 'off');

  await expect(page.getByLabel('Difficulty', { exact: true })).toHaveAttribute('value', 'gentle');
  await chooseOption(page.getByLabel('Difficulty', { exact: true }), 'brisk');
  await expect(page.getByLabel('Theme', { exact: true })).toHaveAttribute('value', 'custom');
  await expect(page.getByLabel('Theme', { exact: true }).locator('..').locator('[role="option"][data-value="normal"]')).toHaveAttribute('aria-disabled', 'true');
  await page.getByLabel('Theme', { exact: true }).evaluate(control => { control.parentElement!.querySelector<HTMLElement>('[data-value="normal"]')!.click(); });
  expect(await page.evaluate(() => (window as any).menuProbe.events)).toEqual(['brisk']);
  const result = await page.evaluate(() => {
    const { lifetime, events, field, theme, readout } = (window as any).menuProbe;
    // Programmatic synchronization must not emit another game intent.
    field.setValue('gentle'); theme.setValue('custom');
    const observer = new MutationObserver(() => {}); observer.observe(readout.element, { childList: true, subtree: true, characterData: true });
    readout.update('100 POINTS\n2 lives');
    const unchangedMutations = observer.takeRecords().length; observer.disconnect();
    // Even retained DOM references cannot call a disposed session.
    lifetime.abort();
    field.input.dispatchEvent(new Event('change')); theme.input.dispatchEvent(new Event('change'));
    return { events, unchangedMutations };
  });
  expect(result).toEqual({ events: ['brisk'], unchangedMutations: 0 });
});

test('menu shortcuts respect editing, browser modifiers, disabled Resume and disposal', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/common/ui/menu.ts';
    const { createGameMenu } = await import(path);
    const root = document.createElement('div'), stage = document.createElement('div');
    const surface = document.createElement('div'), pause = document.createElement('button');
    root.style.height = '100vh';
    root.append(stage, pause); stage.append(surface); document.body.replaceChildren(root);
    const lifetime = new AbortController(), events: string[] = [];
    const theme = document.createElement('div');
    for (const tag of ['input', 'textarea', 'select', 'div']) {
      const editor = document.createElement(tag);
      if (tag === 'div') { editor.contentEditable = 'true'; editor.innerHTML = '<span>Editing</span>'; }
      theme.append(editor);
    }
    const menu = createGameMenu(root, surface, stage, {
      id: 'shortcuts', title: 'Shortcut fixture', signal: lifetime.signal, pause, theme, gameplayUI: [], controls: '',
      actions: [{ id: 'resume', label: 'Resume', screens: ['paused'] }],
      onAction(action: string) { events.push(action); menu.show('playing', false); }, onMute() {}, onFullscreen() {},
    });
    pause.addEventListener('click', () => { events.push('pause'); menu.show('paused', false); }, { signal: lifetime.signal });
    const key = (target: Element, code = 'KeyP', options = {}) => {
      const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true, ...options });
      target.dispatchEvent(event); return event.defaultPrevented;
    };
    menu.show('paused', false);
    for (const editor of theme.querySelectorAll('input, textarea, select, [contenteditable] span')) key(editor);
    key(root, 'KeyP', { ctrlKey: true }); key(root, 'KeyP', { metaKey: true });
    const resume = menu.actions[0]!;
    resume.disabled = true; key(root); resume.disabled = false;
    const ignored = [...events];
    key(root); key(root, 'KeyP', { repeat: true });
    const escapePrevented = key(root, 'Escape');
    key(root, 'Escape'); // Escape never resumes.
    const beforeDisposal = [...events]; lifetime.abort(); key(root); pause.click();
    return { ignored, beforeDisposal, afterDisposal: events, escapePrevented };
  });
  expect(result).toEqual({ ignored: [], beforeDisposal: ['resume', 'pause'], afterDisposal: ['resume', 'pause'], escapePrevented: true });
});

test('web options preview without applying, dismiss cleanly and stay usable in fullscreen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Midnight Circuit', exact: true }).click();
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  const options = page.getByRole('listbox', { name: 'Theme options', exact: true });
  await theme.focus(); await page.keyboard.press('ArrowDown');
  await expect(options).toBeVisible();
  await expect(theme).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown'); // Assets is disabled, so preview Quality.
  const activeId = await theme.getAttribute('aria-activedescendant');
  await expect(page.locator(`[id="${activeId}"]`)).toContainText('Quality');
  await expect(theme).toHaveAttribute('value', 'normal');
  await page.keyboard.press('Escape');
  await expect(options).toBeHidden(); await expect(theme).toBeFocused();
  await expect(theme).toHaveAttribute('value', 'normal');
  await theme.click();
  await page.getByRole('option', { name: 'Assets (not available)', exact: true }).click({ force: true });
  await expect(theme).toHaveAttribute('value', 'normal'); await expect(options).toBeVisible();
  await page.keyboard.press('Home'); await page.keyboard.press('q');
  await page.keyboard.press('Enter');
  await expect(theme).toHaveAttribute('value', 'quality');
  await expect(options).toBeHidden(); await expect(theme).toBeFocused();
  await theme.click(); await page.keyboard.press('Tab');
  await expect(options).toBeHidden();
  await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toBeFocused();
  await theme.click(); await page.getByRole('heading', { name: 'Midnight Circuit', exact: true }).click();
  await expect(options).toBeHidden(); await expect(theme).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).focus();
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await theme.click();
  await expect(options).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: 'test-results/styled-menu-options.png' });
  await page.keyboard.press('Escape'); // Close only the list; browser may also exit fullscreen.
  await expect(options).toBeHidden();
  await page.locator('.game-menu-body').focus();
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true }).click();
  const dusk = page.getByRole('radio', { name: 'Brief dusk', exact: true });
  await expect(page.getByRole('radio', { name: 'Until dawn', exact: true })).toBeChecked();
  await dusk.check(); await expect(dusk).toBeChecked();
  await expect(page.locator('.game-menu-description')).toContainText('90 seconds');
  await dusk.focus(); await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: 'Until dawn', exact: true })).toBeChecked();
  await expect(page.locator('.game-menu-description')).toContainText('180 seconds');
  await page.screenshot({ path: 'test-results/clearing-round-cards.png' });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveText('Pause (P)');
  await page.keyboard.press('f'); // The shortcut also works from gameplay and pauses on display change.
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveText('Resume (P)');
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.keyboard.press('p');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.keyboard.press('p');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveText('Resume (P)');
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await expect(page.getByRole('button', { name: 'Exit fullscreen', exact: true })).toHaveText('Exit fullscreen (F)');
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
});
