import { init, surface, texture, sampler, effect, frame, type Gpu, type Effect, type Texture } from 'vgpu';
import shader from './cinema.wgsl';
import { createDiorama } from '../three/diorama.ts';
import type { CircuitRenderer } from '../graphics.ts';
/** vgpu finishes the same 3D scene with a bounded bloom kernel and cool cinematic grading. */
export async function createCinema(parent: HTMLElement, signal: AbortSignal, onFailure: () => void): Promise<CircuitRenderer> {
  let gpu: Gpu | undefined, finish: Effect | undefined, source: Texture | undefined;
  let scene: ReturnType<typeof createDiorama> | undefined, detach: (() => void) | undefined;
  let disposed = false, failed = false;
  const canvas = document.createElement('canvas'); canvas.className = 'circuit-canvas'; canvas.dataset.renderer = 'vgpu';
  function fail() { if (!disposed && !failed) { failed = true; onFailure(); } }
  function dispose() {
    if (disposed) return; disposed = true; signal.removeEventListener('abort', dispose); detach?.();
    finish?.dispose(); source?.destroy(); gpu?.dispose(); scene?.dispose(); canvas.remove();
  }
  try {
    gpu = await init({ powerPreference: 'low-power' });
    if (signal.aborted) throw new Error('Preparation cancelled');
    signal.addEventListener('abort', dispose, { once: true });
    void gpu.lost.then(fail); detach = gpu.onError(fail);
    const output = surface(gpu, canvas, { autoResize: false, size: [1, 1], dpr: 1, alphaMode: 'opaque' });
    source = texture(gpu, { kind: '2d', size: [1, 1], format: 'rgba8unorm', usage: ['texture_binding', 'copy_dst', 'render_attachment'] });
    finish = effect(gpu, shader, { set: { source, linear: sampler(gpu) } });
    await finish.compile(output); await gpu.settled();
    if (signal.aborted || disposed || failed) throw new Error('Graphics preparation unavailable');
    scene = createDiorama(document.createElement('div'), fail);
    parent.append(canvas); signal.removeEventListener('abort', dispose);
    const device = gpu;
    return {
      reset() { scene!.reset(); }, consume(events) { scene!.consume(events); },
      draw(run, size, screen, now) {
        if (disposed || failed) throw new Error('WebGPU unavailable');
        scene!.draw(run, size, screen, now);
        const input = scene!.canvas, w = input.width, h = input.height;
        if (source!.size[0] !== w || source!.size[1] !== h) {
          const old = source;
          source = texture(device, { kind: '2d', size: [w, h], format: 'rgba8unorm', usage: ['texture_binding', 'copy_dst', 'render_attachment'] });
          finish!.set({ source }); old?.destroy(); output.resize([w, h]);
        }
        device.gpu.queue.copyExternalImageToTexture({ source: input }, { texture: source!.gpu }, [w, h]);
        frame(device, f => f.pass(output, pass => pass.draw(finish!)));
      }, dispose,
    };
  } catch (error) { dispose(); throw error; }
}
