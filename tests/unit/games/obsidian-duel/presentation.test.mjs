import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresentation } from '../../../../src/games/obsidian-duel/presentation.ts';
import { createSanctumDrawing } from '../../../../src/games/obsidian-duel/deluxe-presentation.ts';
import { createMatch } from '../../../../src/games/obsidian-duel/game.ts';
import { themes } from '../../../../src/games/obsidian-duel/themes.ts';

test('both themes clear each frame and draw each fighter once, opaque even during protection', () => {
  const before = { document: globalThis.document, window: globalThis.window };
  const calls = [], stack = [];
  const state = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const ctx = new Proxy(state, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'save') return () => stack.push({ ...state });
    if (key === 'restore') return () => Object.assign(state, stack.pop());
    if (key === 'reset') return () => { state.globalAlpha = 1; state.globalCompositeOperation = 'source-over'; };
    if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (key === 'drawImage') return image => calls.push({ image, alpha: state.globalAlpha });
    if (key === 'clearRect') return () => calls.push({ clear: true });
    return () => {};
  } });
  const canvas = { width: 1000, height: 560, getContext: () => ctx, remove() {} };
  globalThis.document = { createElement: () => canvas };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  try {
    const presentation = createPresentation({ append() {} });
    const art = { stage: {}, nera: {}, kael: {}, effects: {} };
    const match = createMatch();
    for (const fighter of match.fighters) fighter.immune = .2;
    for (const theme of ['arcade', 'deluxe']) {
      presentation.replaceTheme(themes[theme], art, theme === 'deluxe' ? createSanctumDrawing : undefined);
      for (let frame = 0; frame < 2; frame++) {
        calls.length = 0;
        presentation.draw(match, { width: 1000, height: 560, ratio: 1 }, 'playing', frame / 60);
        assert.equal(calls.filter(call => call.clear).length, 1);
        assert.ok(calls[0].clear, 'Clear previous poses before drawing scenery or actors');
        for (const kind of ['nera', 'kael']) assert.deepEqual(calls.filter(call => call.image === art[kind]),
          [{ image: art[kind], alpha: 1 }], 'No mirrored copies, cross-fades or body translucency');
      }
    }
    presentation.dispose();
  } finally {
    if (before.document === undefined) delete globalThis.document; else globalThis.document = before.document;
    if (before.window === undefined) delete globalThis.window; else globalThis.window = before.window;
  }
});
