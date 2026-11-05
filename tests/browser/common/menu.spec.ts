import { chooseTheme } from '../menu.ts';
import { test, expect } from '@playwright/test';

test('shared menus expose the two themes directly, start in Assets and keep compact actions reachable', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const title of ['Last Light Clearing', 'Skybreak', 'Clockwork Hollow', 'Midnight Circuit', 'Obsidian Duel', 'Blastline']) {
    await page.getByRole('button', { name: `Open game: ${title}`, exact: true }).click();
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeEnabled();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('[data-control]:visible')).toHaveCount(0);
    await expect(page.getByRole('combobox')).toHaveCount(0);
    const theme = page.getByRole('group', { name: 'Theme', exact: true });
    await expect(theme.getByRole('radio')).toHaveCount(2);
    await expect(theme.getByRole('radio', { name: /^Assets/ })).toBeChecked();
    await expect(theme.getByRole('radio', { name: /^Quality/ })).toBeEnabled();
    await expect(page.locator('.menu-theme-development')).not.toHaveAttribute('open');
    await theme.scrollIntoViewIfNeeded();
    await expect(theme.getByRole('radio', { name: /^Quality/ }).locator('..')).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toBeVisible();
    await expect(page.locator('.game-menu-controls summary')).toHaveText('How to play');
    await expect(play).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeInViewport({ ratio: 1 });
    await play.hover();
    const contrast = await play.evaluate(button => {
      const style = getComputedStyle(button), canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1; const context = canvas.getContext('2d')!;
      function luminance(color: string) {
        context.fillStyle = color; context.fillRect(0, 0, 1, 1);
        const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(channel => {
          const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        });
        return .2126 * r! + .7152 * g! + .0722 * b!;
      }
      const a = luminance(style.color), b = luminance(style.backgroundColor);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    });
    expect(contrast, title).toBeGreaterThanOrEqual(4.5);
    if (title === 'Last Light Clearing') {
      await page.setViewportSize({ width: 844, height: 390 });
      await theme.getByRole('radio', { name: /^Assets/ }).focus();
      await expect(theme.getByRole('radio', { name: /^Assets/ }).locator('..')).toBeInViewport({ ratio: 1 });
      await expect(play).toBeInViewport({ ratio: 1 });
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await play.click();
    await page.keyboard.down('p');
    await expect(page.locator('[data-menu-owner]')).toHaveAttribute('data-screen', 'paused');
    await page.keyboard.down('p');
    await expect(page.locator('[data-menu-owner]')).toHaveAttribute('data-screen', 'paused');
    await page.keyboard.up('p');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
    const mutations = await page.locator('[data-menu-owner]').evaluate(async root => {
      await new Promise(requestAnimationFrame); let count = 0;
      const observer = new MutationObserver(records => { count += records.length; });
      observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
      for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
      count += observer.takeRecords().length; observer.disconnect(); return count;
    });
    expect(mutations, `${title} leaves frozen UI untouched`).toBe(0);
    await expect(theme).toBeVisible();
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Open game: ${title}`, exact: true })).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('native theme fields retain selection semantics, disabled choices and session-owned listeners', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/common/ui/theme-choices.ts';
    const { createThemeChoices } = await import(path);
    const componentPath = '/src/common/ui/menu-components.ts';
    const { createMenuReadout } = await import(componentPath);
    const menuPath = '/src/common/ui/menu.ts'; const { createGameMenu } = await import(menuPath);
    const lifetime = new AbortController(), events: string[] = [];
    const theme = createThemeChoices({ modes: { assets: {}, quality: {} }, value: 'quality', signal: lifetime.signal,
      onChange(value: string) { events.push(value); theme.setValue(value); } });
    const readout = createMenuReadout('Test results'); readout.update('100 POINTS\n2 lives'); readout.element.hidden = false;
    const root = document.createElement('div'), stage = document.createElement('div'), surface = document.createElement('div'), pause = document.createElement('button');
    root.style.height = '100vh'; root.append(stage, pause); stage.append(surface); document.body.replaceChildren(root);
    const menu = createGameMenu(root, surface, stage, { id: 'test', title: 'Test game', signal: lifetime.signal, pause, gameplayUI: [], game: readout.element, theme: theme.element, controls: '', actions: [], onAction() {}, onMute() {}, onFullscreen() {} });
    menu.show('title', false); (window as any).menuProbe = { lifetime, events, theme, readout };
  });
  const theme = page.getByRole('group', { name: 'Theme', exact: true });
  await expect(theme.getByRole('radio', { name: 'Quality', exact: true })).toBeChecked();
  await chooseTheme(theme, 'assets');
  await expect(theme.getByRole('radio', { name: 'Assets', exact: true })).toBeChecked();
  const result = await page.evaluate(() => {
    const { lifetime, events, theme, readout } = (window as any).menuProbe;
    theme.setValue('quality');
    const normal = theme.element.querySelector('input[value="normal"]'); normal.click();
    const observer = new MutationObserver(() => {}); observer.observe(readout.element, { childList: true, subtree: true, characterData: true });
    readout.update('100 POINTS\n2 lives'); const unchanged = observer.takeRecords().length; observer.disconnect();
    lifetime.abort(); theme.input.click(); return { events, unchanged, normalDisabled: normal.disabled };
  });
  expect(result).toEqual({ events: ['assets'], unchanged: 0, normalDisabled: true });
});

test('theme navigation exposes pending versus active choice, supports cancellation, arrows, Tab and development Normal', async ({ page }) => {
  let release!: () => void, requested = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/art/lumen/keeper.png', async route => { requested = true; await gate; await route.continue(); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Clockwork Hollow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  const theme = page.getByRole('group', { name: 'Theme', exact: true });
  const assets = theme.getByRole('radio', { name: /^Assets/ }), quality = theme.getByRole('radio', { name: /^Quality/ });
  await assets.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => requested).toBe(true);
  await expect(theme).toHaveAttribute('aria-busy', 'true');
  await expect(assets).toBeChecked(); await expect(quality).not.toBeChecked();
  await expect(theme.locator('[data-value="quality"] .menu-theme-loading')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await assets.click(); // Selecting the working choice also cancels a pending replacement.
  await expect(theme).toHaveAttribute('aria-busy', 'false');
  release();
  await expect(assets).toBeChecked();
  await quality.click(); await expect(quality).toBeChecked();
  await expect(quality).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(assets).toBeChecked();
  await page.keyboard.press('Tab'); await expect(assets).toBeChecked();
  await chooseTheme(theme, 'normal');
  await expect(theme.getByRole('radio', { name: /^Normal/ })).toBeChecked();
  await expect(page.locator('.menu-theme-note')).toContainText('Normal baseline active');
  await page.getByRole('button', { name: 'Play', exact: true }).focus(); await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('app');
  await assets.click(); await expect(assets).toBeChecked();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.keyboard.press('f');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBe(null);
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

test('fullscreen belongs to the arcade across selection and game replacement', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('app');
  for (const title of ['Skybreak', 'Obsidian Duel']) {
    await page.getByRole('button', { name: `Open game: ${title}`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('app');
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
    await expect(page.getByRole('button', { name: `Open game: ${title}`, exact: true })).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('app');
    await expect(page.getByRole('button', { name: 'Exit fullscreen', exact: true })).toBeVisible();
  }
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBe(null);
});

test('menu sound and theme shortcuts retain the paused run and leave gameplay keys alone', async ({ page }) => {
  await page.route(/\/src\/games\/skybreak\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun;
      createRun = (...args) => { const run = original(...args); window.shortcutRun = run; return run; };` });
  });
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game: Skybreak', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(150);
  await page.keyboard.press('p');
  const state = () => page.evaluate(() => JSON.stringify((window as any).shortcutRun));
  const frozen = await state();
  await page.keyboard.down('s');
  const mute = page.locator('.game-menu-mute');
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.down('s');
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.up('s');
  await page.keyboard.press('s');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('t');
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'quality');
  await page.keyboard.press('t');
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'assets');
  await page.clock.runFor(100);
  expect(await state()).toBe(frozen);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.down('s'); await page.clock.runFor(200); await page.keyboard.up('s');
  await page.keyboard.press('p');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  expect(await state()).not.toBe(frozen);
});


test('production uses the same visible Assets / Quality choices with no development controls', async ({ page }) => {
  await page.route(/\/src\/common\/ui\/theme-choices\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replaceAll('import.meta.env.DEV', 'false') });
  });
  await page.goto('/');
  for (const title of ['Last Light Clearing', 'Skybreak', 'Clockwork Hollow', 'Midnight Circuit', 'Obsidian Duel', 'Blastline']) {
    await page.getByRole('button', { name: `Open game: ${title}`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
    const theme = page.getByRole('group', { name: 'Theme', exact: true });
    await expect(theme.getByRole('radio')).toHaveCount(2);
    await expect(theme.getByRole('radio', { name: /^Assets/ })).toBeChecked();
    await expect(theme.locator('.menu-theme-development')).toHaveCount(0);
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  }
});
