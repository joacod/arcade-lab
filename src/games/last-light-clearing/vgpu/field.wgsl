import { FrameData, Palette, noise, hash } from './shared.wgsl';
@group(0) @binding(0) var<uniform> scene: FrameData;
@group(0) @binding(1) var<uniform> palette: Palette;
struct Ripple { origin: vec4f, energy: vec4f }
@group(0) @binding(2) var<storage, read> ripples: array<Ripple>;

@fragment fn fs_main(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let css = pixel.xy * scene.screen.xy / scene.screen.zw;
  let world = (css - scene.view.xy) / scene.view.z;
  let t = scene.view.w * scene.options.x;
  var q = world * 0.006;
  var disturbance = vec2f(0);
  var light = vec3f(0);
  for (var i = 0u; i < u32(scene.options.z); i++) {
    let wave = ripples[i]; let delta = world - wave.origin.xy;
    let d = length(delta); let age = wave.origin.z; let radius = wave.origin.w;
    let band = (d - radius) / (10.0 + age * 8.0);
    let envelope = exp(-band * band);
    let fade = wave.energy.w * max(0.0, 1.0 - age / 2.2);
    disturbance += delta / max(d, 1.0) * envelope * fade * 0.14;
    light += wave.energy.rgb * envelope * fade * 0.22;
  }
  q += disturbance;
  // Domain-warped contours, rather than a periodic grid or scrolling color ramp.
  let n = noise(q * 1.7 + vec2f(t * 0.075, -t * 0.06));
  let warp = vec2f(noise(q * 2.0 + n + t * 0.03), noise(q * 2.1 - n - t * 0.04));
  let flow = noise(q * 3.0 + warp * 2.4 + vec2f(t * 0.07, 0));
  let thread = pow(max(0.0, 1.0 - abs(sin((flow + n * 0.35) * 24.0 + t * 0.28))), 18.0);
  let silk = pow(max(0.0, 1.0 - abs(sin(flow * 42.0 - n * 11.0 + t * 0.15))), 30.0);
  let basin = 0.5 + 0.5 * sin(q.x * 1.5 + q.y + n * 4.0 + t * 0.15);
  let energy = mix(palette.boundary.rgb, palette.canopy.rgb, basin);
  let keeperDistance = length(world - scene.keeper.xy);
  let aura = exp(-keeperDistance * 0.012);
  var color = palette.floor.rgb * (0.7 + n * 0.65);
  color += palette.ground.rgb * flow * 0.15;
  color += energy * (thread * 0.28 + silk * 0.1) * scene.options.y;
  color += mix(palette.pulse.rgb, palette.light.rgb, basin) * thread * pow(flow, 3.0) * 0.3 * scene.options.y;
  color += palette.light.rgb * aura * (0.025 + thread * 0.15);
  color += light;
  // Sparse drifting marine snow, spatially stable in the world.
  let snowPos = world / 30.0 + vec2f(t * 0.018, -t * 0.035);
  let cell = floor(snowPos); let point = fract(snowPos);
  let dotSize = length(point - vec2f(hash(cell), hash(cell + 17.0)));
  color += palette.gem.rgb * (1.0 - smoothstep(0.015, 0.06, dotSize)) * step(0.82, hash(cell + 9.0)) * (0.2 + 0.15 * sin(t + cell.x));
  let edge = min(min(world.x, world.y), min(scene.world.x - world.x, scene.world.y - world.y));
  let inside = step(0.0, edge);
  let border = exp(-abs(edge) * 0.3);
  let seam = 0.45 + 0.55 * pow(0.5 + 0.5 * sin((world.x + world.y) * 0.045 + n * 4.0 - t), 4.0);
  color = mix(palette.background.rgb + energy * exp(-abs(edge) * 0.035) * 0.04, color, inside);
  color += palette.boundary.rgb * border * seam * 0.9;
  color += palette.canopy.rgb * exp(-abs(edge + 16.0 + sin((world.x + world.y) * 0.025 + t * 0.4) * 5.0) * 0.25) * 0.18;
  let vignette = 1.0 - 0.24 * pow(length(css / scene.screen.xy - 0.5), 1.2);
  return vec4f(color * vignette, 1);
}
