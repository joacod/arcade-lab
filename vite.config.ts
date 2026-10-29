import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite';
import { defineConfig } from 'vite';
const wgsl = wgslVitePlugin();
export default defineConfig({
  // Vite 8 retains its own ?import marker for unknown extensions in development.
  plugins: [{ ...wgsl, enforce: 'pre', transform(source, id) {
    return wgsl.transform.call(this, source, id.replace(/\?import$/, ''));
  } }],
  // Optimize the lazy dependency upfront on the server, avoiding a mid-run dev reload.
  optimizeDeps: { include: ['three', 'three/addons/geometries/RoundedBoxGeometry.js', 'three/addons/utils/BufferGeometryUtils.js',
    'three/addons/postprocessing/EffectComposer.js', 'three/addons/postprocessing/RenderPass.js',
    'three/addons/postprocessing/UnrealBloomPass.js', 'three/addons/postprocessing/OutputPass.js',
    'three/addons/postprocessing/ShaderPass.js', 'vgpu', 'audiobits'] },
  // Allow the optional Three.js renderer while retaining warnings above 600 kB.
  build: { chunkSizeWarningLimit: 600 },
});
