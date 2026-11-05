import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { gameInfo } from '../../../src/app/catalog-data.ts';
import { site } from '../../../src/app/site.ts';

test('all six games fit on desktop and a compact phone without loading game code', async ({ page }) => {
  const gameRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/src/games/')) gameRequests.push(request.url()); });
  await page.goto('/');
  for (const viewport of [{ width: 1280, height: 720 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport);
    const cards = page.getByRole('button', { name: /^Open game:/ });
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) await expect(card).toBeInViewport({ ratio: 1 });
    const overflow = await page.locator('.arcade-selection').evaluate(root => ({
      vertical: root.scrollHeight - root.clientHeight, horizontal: root.scrollWidth - root.clientWidth,
    }));
    expect(overflow).toEqual({ vertical: 0, horizontal: 0 });
  }
  await expect.poll(() => page.locator('.arcade-cover img').evaluateAll(images => images.every(image =>
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', site.repository);
  expect(gameRequests).toEqual([]);
  await expect(page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.world-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open game: Last Light Clearing', exact: true })).toBeFocused();
});

test('initial HTML exposes collection copy, metadata and matching generated assets without JavaScript', async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page).toHaveTitle(site.title);
  for (const game of gameInfo) await expect(page.getByRole('heading', { name: game.title, exact: true })).toBeAttached();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site.url);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', site.url);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', site.description);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  const social = `${site.url}social.png`;
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', social);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', social);
  expect(JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '')).toMatchObject({
    '@context': 'https://schema.org', '@type': 'WebSite', url: site.url, name: site.name,
  });
  for (const [path, width, height] of [['/social.png', 1200, 630], ['/icon-32.png', 32, 32], ['/apple-touch-icon.png', 180, 180]] as const) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
    expect(await sharp(await response.body()).metadata()).toMatchObject({ format: 'png', width, height });
  }
  expect(await (await request.get('/robots.txt')).text()).toContain(`Sitemap: ${site.url}sitemap.xml`);
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`<loc>${site.url}</loc>`);
  await context.close();
});
