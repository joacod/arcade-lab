import { test, expect } from '@playwright/test';

for (const [id, name, factory] of [
  ['obsidian-duel', 'Obsidian Duel', 'createMatch'],
  ['blastline', 'Blastline', 'createRun'],
] as const) {
  test(`${name} switches hand layouts without replacing the paused run`, async ({ page }) => {
    const duel = id === 'obsidian-duel';
    await page.route(new RegExp(`/src/games/${id}/game\\.ts(?:\\?.*)?$`), async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}
        const original = ${factory}; ${factory} = (...args) => { const run = original(...args); window.layoutRun = run; return run; };` });
    });
    await page.clock.install(); await page.goto('/');
    await page.getByRole('button', { name: `Open game: ${name}`, exact: true }).click();
    const layout = page.getByRole('group', { name: 'Keyboard layout', exact: true });
    const arrows = layout.getByRole('radio', { name: /Arrows/ }), wasd = layout.getByRole('radio', { name: /WASD/ });
    await expect(arrows).toBeChecked();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.clock.runFor(duel ? 3100 : 50);
    // Isolate the controls from CPU attacks and unlock the third Blastline action.
    await page.evaluate(() => {
      const run = (window as any).layoutRun;
      if (run.fighters) Object.assign(run.fighters[1], { state: 'hitstun', stateTime: 30, immune: 30, attack: null, buffer: null, vx: 0, airSpeed: 0 });
      else run.rescued = true;
    });
    const state = () => page.evaluate(() => JSON.parse(JSON.stringify((window as any).layoutRun)));
    const player = async () => { const run = await state(); return duel ? run.fighters[0] : run.player; };
    await page.keyboard.press('c'); await page.clock.runFor(32);
    if (duel) expect((await player()).attack.kind).toBe('special');
    else expect((await player()).operator).toBe('bolt');
    await page.clock.runFor(1200);
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('z'); await page.clock.runFor(50);
    await page.keyboard.press('Escape');
    const frozen = await state();
    await page.evaluate(() => { (window as any).retainedLayoutRun = (window as any).layoutRun; });
    await arrows.focus(); await page.keyboard.press('ArrowRight');
    await expect(wasd).toBeChecked();
    await page.locator('.game-menu-controls summary').click();
    await expect(page.locator('.game-menu-instructions')).toContainText(duel ? 'L special' : 'L SWITCH AFTER RESCUE');
    await expect(page.locator('.play-surface')).toHaveAttribute('aria-label', duel ? /J light, K heavy, L special/ : /J fire, W \/ S aim, K grenade, L switch/);
    await expect(page.locator(`[data-key="${duel ? 'special' : 'switch'}"]`)).toHaveText('L');
    await page.clock.runFor(100);
    expect(await state()).toEqual(frozen);
    expect(await page.evaluate(() => (window as any).retainedLayoutRun === (window as any).layoutRun)).toBe(true);
    await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(800);
    await page.keyboard.up('ArrowRight'); await page.keyboard.up('z');
    const x = (await player()).x;
    await page.keyboard.down('ArrowRight'); await page.keyboard.press('c'); await page.clock.runFor(100);
    await page.keyboard.up('ArrowRight');
    expect((await player()).x).toBe(x);
    if (!duel) expect((await player()).operator).toBe('bolt');
    await page.keyboard.down('d'); await page.clock.runFor(150); await page.keyboard.up('d');
    expect((await player()).x).toBeGreaterThan(x);
    await page.keyboard.press('j'); await page.clock.runFor(32);
    if (duel) expect((await player()).attack.kind).toBe('light');
    else expect((await state()).projectiles.some((p: any) => p.friendly)).toBe(true);
    await page.clock.runFor(700);
    const grenades = (await state()).grenades;
    await page.keyboard.press('k'); await page.clock.runFor(32);
    if (duel) expect((await player()).attack.kind).toBe('heavy');
    else expect((await state()).grenades).toBe(grenades - 1);
    await page.clock.runFor(1100);
    await page.keyboard.press('l'); await page.clock.runFor(32);
    if (duel) expect((await player()).attack.kind).toBe('special');
    else expect((await player()).operator).toBe('nova');
    await page.clock.runFor(1100);
    await page.keyboard.down('Space'); await page.clock.runFor(100); await page.keyboard.up('Space');
    expect(duel ? (await player()).z : -(await player()).vy).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await wasd.scrollIntoViewIfNeeded(); await expect(wasd).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(50);
    await expect(page.locator(`[data-key="${duel ? 'light' : 'fire'}"]`)).toHaveText('J');
    await page.keyboard.press('Escape'); await expect(wasd).toBeChecked();
    if (duel) {
      await page.getByRole('button', { name: 'Game setup', exact: true }).click();
      await expect(wasd).toBeChecked();
    }
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
    await page.getByRole('button', { name: `Open game: ${name}`, exact: true }).click();
    await expect(arrows).toBeChecked();
  });
}
