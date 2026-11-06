import { test, expect } from '@playwright/test';

test('action bindings combine aliases and pointers, replace safely and release on disposal', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/engine/browser/buttons.ts';
    const { bindButtons } = await import(path);
    const surface = document.createElement('div'); surface.tabIndex = 0;
    const controls = Object.fromEntries(['left', 'right', 'fire'].map(action => {
      const button = document.createElement('button'); button.textContent = action; surface.append(button); return [action, button];
    }));
    document.body.replaceChildren(surface); surface.focus();
    const lifetime = new AbortController();
    const input = bindButtons({ surface, controls, bindings: { left: ['KeyA', 'ArrowLeft'], right: ['KeyD'], fire: ['KeyZ', 'KeyX'] }, active: () => true, signal: lifetime.signal });
    (window as any).buttonsProbe = { input, lifetime, surface, controls };
  });
  const read = () => page.evaluate(() => {
    const { held, pressed } = (window as any).buttonsProbe.input.read(); return { held: [...held], pressed: [...pressed] };
  });
  await page.keyboard.down('a'); await page.keyboard.down('ArrowLeft');
  expect(await read()).toEqual({ held: ['left'], pressed: ['left'] });
  await page.keyboard.down('a'); // Auto-repeat cannot generate a second edge.
  await page.keyboard.up('a');
  expect(await read()).toEqual({ held: ['left'], pressed: [] });
  await page.keyboard.up('ArrowLeft');
  await page.getByRole('button', { name: 'fire', exact: true }).hover(); await page.mouse.down();
  await page.keyboard.down('z');
  expect(await read()).toEqual({ held: ['fire'], pressed: ['fire'] });
  await page.keyboard.up('z');
  expect(await read()).toEqual({ held: ['fire'], pressed: [] });
  // Replacement discards both a pending key edge and a captured pointer.
  await page.keyboard.down('d');
  await page.evaluate(() => (window as any).buttonsProbe.input.setBindings({ left: ['ArrowLeft'], right: ['ArrowRight'], fire: ['KeyC'] }));
  expect(await read()).toEqual({ held: [], pressed: [] });
  await expect(page.locator('[data-held]')).toHaveCount(0);
  await page.mouse.up(); await page.keyboard.up('d'); await page.keyboard.press('z');
  expect(await read()).toEqual({ held: [], pressed: [] });
  await page.keyboard.down('ArrowRight');
  const rejected = await page.evaluate(() => {
    try { (window as any).buttonsProbe.input.setBindings({ left: ['KeyC'], right: [], fire: ['KeyC'] }); return false; }
    catch { return true; }
  });
  expect(rejected).toBe(true);
  expect(await read()).toEqual({ held: ['right'], pressed: ['right'] });
  await page.keyboard.up('ArrowRight'); await page.keyboard.press('Control+c');
  expect(await read()).toEqual({ held: [], pressed: [] });
  await page.keyboard.down('c');
  expect(await read()).toEqual({ held: ['fire'], pressed: ['fire'] });
  await page.evaluate(() => (window as any).buttonsProbe.lifetime.abort());
  expect(await read()).toEqual({ held: [], pressed: [] });
  await page.keyboard.up('c'); await page.keyboard.press('c');
  await page.getByRole('button', { name: 'fire', exact: true }).click();
  expect(await read()).toEqual({ held: [], pressed: [] });
});
