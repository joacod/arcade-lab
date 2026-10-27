import { test, expect } from '@playwright/test';

for (const game of [
  { name: 'Clearing', path: '/src/app.ts', entry: 'mountClearing', message: 'Canvas 2D is required to play.' },
  { name: 'Clockwork Hollow', path: '/src/platformer/app.ts', entry: 'mountHollow', message: 'Canvas 2D is unavailable.' },
  { name: 'Midnight Circuit', path: '/src/brawler/app.ts', entry: 'mountCircuit', message: 'Canvas 2D is unavailable.' },
  { name: 'Obsidian Duel', path: '/src/fighter/app.ts', entry: 'mountDuel', message: 'Canvas 2D is unavailable.' },
  { name: 'Blastline', path: '/src/run-gun/app.ts', entry: 'mountBlastline', message: 'Canvas 2D is unavailable.' },
  { name: 'Skybreak', path: '/src/skybreak/app.ts', entry: 'mountSkybreak', message: 'Canvas 2D is unavailable.' },
]) {
  test(`${game.name} releases its host when initial presentation construction fails`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/\/src\/browser\/host\.ts(?:\?.*)?$/, async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}
        const original = createHost;
        createHost = (...args) => { const host = original(...args); window.hostProbe = host; return host; };` });
    });
    await page.goto('/');
    const result = await page.evaluate(async game => {
      const { [game.entry]: mount } = await import(game.path);
      const OriginalObserver = window.ResizeObserver, getContext = HTMLCanvasElement.prototype.getContext;
      const observers = new Set<ResizeObserver>();
      window.ResizeObserver = class extends OriginalObserver {
        constructor(callback: ResizeObserverCallback) { super(callback); observers.add(this); }
        disconnect() { observers.delete(this); super.disconnect(); }
      };
      const container = document.createElement('div'); document.body.append(container);
      try {
        HTMLCanvasElement.prototype.getContext = () => null;
        let message = '';
        try { mount(container, () => {}); }
        catch (error) { message = (error as Error).message; }
        const host = (window as any).hostProbe;
        // Exercise the listeners that would otherwise outlive the failed mount.
        window.dispatchEvent(new Event('resize'));
        document.dispatchEvent(new Event('fullscreenchange'));
        return { message, aborted: host.signal.aborted, attached: host.root.isConnected,
          children: container.childElementCount, observers: observers.size };
      } finally {
        HTMLCanvasElement.prototype.getContext = getContext;
        window.ResizeObserver = OriginalObserver;
        (window as any).hostProbe?.dispose(); container.remove();
      }
    }, game);
    expect(result).toEqual({ message: game.message, aborted: true, attached: false, children: 0, observers: 0 });
    expect(errors).toEqual([]);
    // The failed attempt must not prevent a fresh, working session.
    await page.getByRole('button', { name: game.name === 'Clearing' ? 'Play Last Light Clearing' : `Play ${game.name}`, exact: true }).click();
    await expect(page.locator(game.name === 'Clearing' ? '.world-canvas' : game.name === 'Blastline' ? '.blast-canvas' : game.name === 'Skybreak' ? '.skybreak-canvas' : game.name === 'Midnight Circuit' ? '.circuit-canvas' : game.name === 'Obsidian Duel' ? '.duel-canvas' : '.hollow-canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('browser host owns one loop and cannot schedule work after disposal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Last Light Clearing', exact: true }).click();
  const result = await page.evaluate(async () => {
    const path = '/src/browser/host.ts';
    const { createHost } = await import(path);
    const request = window.requestAnimationFrame, cancel = window.cancelAnimationFrame;
    const pending = new Map<number, FrameRequestCallback>();
    let id = 0, calls = 0;
    window.requestAnimationFrame = callback => { pending.set(++id, callback); return id; };
    window.cancelAnimationFrame = frame => { pending.delete(frame); };
    const container = document.createElement('div'); document.body.append(container);
    try {
      const host = createHost(container, { className: 'test-game', label: 'Test game', surfaceLabel: 'Test surface',
        onDisplayChange() {}, onFullscreenChange() {} });
      host.root.append(host.surface);
      const draw = () => { calls++; host.dispose(); host.dispose(); };
      host.start(draw); host.start(draw);
      const started = pending.size;
      const [frame, callback] = [...pending.entries()][0]!;
      pending.delete(frame); callback(100);
      const afterCallback = pending.size;
      host.start(draw);
      return { started, afterCallback, afterRestart: pending.size, calls, children: container.childElementCount,
        signalAborted: host.signal.aborted, label: host.root.getAttribute('aria-label') };
    } finally {
      window.requestAnimationFrame = request; window.cancelAnimationFrame = cancel; container.remove();
    }
  });
  expect(result).toEqual({ started: 1, afterCallback: 0, afterRestart: 0, calls: 1, children: 0,
    signalAborted: true, label: 'Test game' });
});

test('application replaces a running game, isolates styles, and remounts a fresh clearing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Observe real composition without adding a production inspection API.
  await page.route(/\/src\/main\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nwindow.applicationProbe = application;` });
  });
  await page.route(/\/src\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun;
      createRun = (...args) => { const run = original(...args); window.runProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    const pending = new Set<number>(), contexts: AudioContext[] = [];
    (window as any).mountProbe = { pending, contexts, fixtureDisposals: 0 };
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this); }
    };
  });
  await page.clock.install(); await page.goto('/');
  await page.getByRole('button', { name: 'Play Last Light Clearing', exact: true }).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.evaluate(() => {
    // Wrap the installed fake clock, whose initialization replaces the native frame methods.
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    const pending: Set<number> = (window as any).mountProbe.pending;
    window.requestAnimationFrame = callback => {
      const id = request(now => { pending.delete(id); callback(now); });
      pending.add(id); return id;
    };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  });
  await expect(page.locator('.asset-status')).toBeHidden();
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await page.clock.runFor(50); await page.keyboard.press('Escape');
  await page.getByLabel('Appearance', { exact: true }).selectOption('prism');
  await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', 'prism');
  await page.getByRole('button', { name: 'Resume surviving' }).click();
  await page.keyboard.down('d'); await page.clock.runFor(100);
  const replaced = await page.evaluate(() => {
    const w = window as any;
    const oldSurface = document.querySelector('.play-surface')!;
    const context = document.querySelector<HTMLCanvasElement>('.world-canvas')!.getContext('webgl2')!;
    w.applicationProbe.mount({ mount(host: HTMLElement) {
      const root = document.createElement('section'); root.dataset.skin = 'glass';
      root.innerHTML = '<div class="hud"><button>Fixture control</button></div>';
      host.append(root);
      return { dispose() { w.mountProbe.fixtureDisposals++; root.remove(); } };
    } });
    const button = document.querySelector('button')!;
    return { detached: !oldSurface.isConnected, contextLost: context.isContextLost(),
      audio: w.mountProbe.contexts.map((c: AudioContext) => c.state), frames: w.mountProbe.pending.size,
      buttonHeight: getComputedStyle(button).minHeight, hudDisplay: getComputedStyle(button.parentElement!).display };
  });
  expect(replaced).toEqual({ detached: true, contextLost: true, audio: ['closed'], frames: 0,
    buttonHeight: '0px', hudDisplay: 'block' });
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.clearing-app')).toHaveCount(0);
  const failed = await page.evaluate(() => {
    const w = window as any;
    try { w.applicationProbe.mount({ mount(host: HTMLElement) { host.append(document.createElement('canvas')); throw new Error('fixture failure'); } }); }
    catch (error) { return { message: (error as Error).message, children: document.querySelector('#app')!.childElementCount, disposed: w.mountProbe.fixtureDisposals }; }
  });
  expect(failed).toEqual({ message: 'fixture failure', children: 0, disposed: 1 });
  // Supersede initial artwork preparation several times, then let only the final session finish.
  await page.evaluate(async () => {
    const path = '/src/app.ts'; const { mountClearing } = await import(path);
    for (let i = 0; i < 4; i++) (window as any).applicationProbe.mount({ mount: (host: HTMLElement) => mountClearing(host, () => {}) });
  });
  await expect(page.locator('.asset-status')).toBeHidden();
  await expect(page.locator('.clearing-app')).toHaveCount(1);
  await expect(page.locator('.clearing-app')).toHaveAttribute('data-theme', 'woodland');
  await expect(page.locator('canvas')).toHaveCount(2);
  await page.getByRole('button', { name: 'Enter the clearing' }).click();
  await page.clock.runFor(500);
  expect(await page.evaluate(() => ({ x: (window as any).runProbe.player.x, frames: (window as any).mountProbe.pending.size })))
    .toEqual({ x: 480, frames: 1 });
  await page.keyboard.up('d');
  const disposed = await page.evaluate(() => {
    const w = window as any;
    w.applicationProbe.dispose(); w.applicationProbe.dispose();
    let rejected = false;
    try { w.applicationProbe.mount({ mount() { throw new Error('must not mount'); } }); } catch { rejected = true; }
    return { frames: w.mountProbe.pending.size, children: document.querySelector('#app')!.childElementCount,
      audio: w.mountProbe.contexts.map((c: AudioContext) => c.state), rejected };
  });
  expect(disposed).toEqual({ frames: 0, children: 0, audio: ['closed', 'closed'], rejected: true });
  await page.clock.runFor(100);
  await expect(page.locator('#app')).toBeEmpty();
  expect(errors).toEqual([]);
});
