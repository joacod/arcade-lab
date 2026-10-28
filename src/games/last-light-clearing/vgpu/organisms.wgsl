import { FrameData, Palette } from './shared.wgsl';
@group(0) @binding(0) var<uniform> scene: FrameData;
@group(0) @binding(1) var<uniform> palette: Palette;
struct Organism { bounds: vec4f, color: vec4f, shape: vec4f, detail: vec4f }
@group(0) @binding(2) var<storage, read> organisms: array<Organism>;
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat) color: vec4f,
  @location(2) @interpolate(flat) shape: vec4f,
  @location(3) @interpolate(flat) detail: vec4f,
}
@vertex fn vs_main(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> VertexOut {
  let corners = array<vec2f, 6>(vec2f(-1,-1), vec2f(1,-1), vec2f(-1,1), vec2f(-1,1), vec2f(1,-1), vec2f(1,1));
  let object = organisms[instance]; let local = corners[vertex];
  let c = cos(object.shape.y); let s = sin(object.shape.y);
  let p = local * object.bounds.zw;
  let world = object.bounds.xy + vec2f(c * p.x - s * p.y, s * p.x + c * p.y);
  let css = world * scene.view.z + scene.view.xy;
  var out: VertexOut;
  out.position = vec4f(css.x / scene.screen.x * 2.0 - 1.0, 1.0 - css.y / scene.screen.y * 2.0, 0, 1);
  out.local = local; out.color = object.color; out.shape = object.shape; out.detail = object.detail;
  return out;
}
fn square(x: f32) -> f32 { return x * x; }
fn line(d: f32, w: f32) -> f32 { return exp(-square(d / w)); }
@fragment fn fs_main(in: VertexOut) -> @location(0) vec4f {
  let p = in.local; let r = length(p); let a = atan2(p.y, p.x);
  let kind = u32(in.shape.x); let t = scene.view.w; let seed = in.shape.z;
  var color = in.color.rgb; var alpha = 0.0; var core = 0.0;
  if (kind == 0u) {
    // Keeper: a forward-facing lantern organism with five gently breathing filaments.
    let shell = 0.32 + 0.035 * sin(a * 5.0 + t * 2.0);
    let membrane = line(r - shell, 0.028);
    let tendrils = line(sin(a * 5.0 + r * 5.0 - t * 2.0) * r, 0.035) * smoothstep(0.33, 0.45, r) * (1.0 - smoothstep(0.5, 0.95, r));
    let wake = exp(-square((p.x + 0.42) * 2.4) - square(p.y * 5.0)) * in.detail.y;
    core = exp(-r * r * 130.0) + line(length(p - vec2f(0.16, 0)), 0.04);
    alpha = membrane * 0.8 + tendrils * 0.5 + exp(-r * 5.5) * 0.48 + wake * 0.35 + core;
    color = mix(color, palette.hit.rgb, clamp(core + in.detail.z, 0.0, 1.0));
  } else if (kind == 1u) {
    // Crawler: opaque scalloped mantle, luminous ribs, eyes at its leading edge.
    let body = 0.46 + 0.06 * cos(a * 3.0 + seed);
    let shell = line(r - body, 0.035);
    let ribs = line(sin(a * 3.0 + r * 6.0 - t * 1.6 + seed) * r, 0.045) * (1.0 - smoothstep(0.35, 0.6, r));
    core = line(length(p - vec2f(0.28, 0.16)), 0.055) + line(length(p - vec2f(0.28, -0.16)), 0.055);
    alpha = shell * 0.8 + ribs * 0.3 + core + exp(-r * 5.0) * 0.25;
    color = mix(color, palette.hit.rgb, clamp(core + in.detail.z, 0.0, 1.0));
    if (r < body - 0.04) { color = mix(palette.floor.rgb * 1.7, color, clamp(alpha, 0.0, 1.0)); alpha = max(alpha, 0.94); }
  } else if (kind == 2u) {
    // Elite: dark eclipse, a rotating broken corona and six unstable petal spines.
    let corona = 0.55 + 0.08 * pow(0.5 + 0.5 * cos(a * 6.0 + t * 0.7), 5.0);
    let rim = line(r - corona, 0.025);
    let arc = line(r - 0.79, 0.014) * smoothstep(-0.5, 0.5, sin(a * 3.0 - t));
    let interior = line(sin(a * 4.0 - r * 12.0 + t) * r, 0.025) * (1.0 - smoothstep(0.2, 0.5, r));
    alpha = rim + arc * 0.6 + interior * 0.4 + exp(-abs(r - corona) * 13.0) * 0.2;
    color = mix(color, palette.hit.rgb, clamp(rim * 0.6 + in.detail.z, 0.0, 1.0));
    if (r < 0.5) { color = mix(palette.background.rgb, color, interior * 0.32); alpha = 1.0; }
  } else if (kind == 3u) {
    let comet = exp(-square(p.y * 5.0)) * smoothstep(-1.0, 0.45, p.x) * (1.0 - smoothstep(0.45, 0.9, p.x));
    core = exp(-square((p.x - 0.4) * 7.0) - square(p.y * 9.0));
    alpha = comet * 0.75 + core; color = mix(color, palette.hit.rgb, core);
  } else if (kind == 4u || kind == 5u || kind == 6u) {
    let diamond = abs(p.x) + abs(p.y);
    let facet = 1.0 - smoothstep(0.75, 0.83, diamond);
    let edge = line(diamond - 0.76, 0.05);
    core = line(p.y + p.x * 0.45, 0.045) * facet;
    alpha = facet * 0.7 + edge * 0.4 + exp(-r * 5.0) * 0.18;
    color = mix(color * (0.55 + step(0.0, p.y) * 0.35), palette.hit.rgb, clamp(edge * 0.65 + core * 0.4, 0.0, 1.0));
    if (kind == 6u) { alpha += line(r - 0.93, 0.018) * 0.6; }
  } else if (kind == 7u) {
    alpha = line(r - 0.85, max(0.005, in.detail.x)) * (0.65 + 0.35 * sin(a * 9.0 + t * 3.0));
    alpha += line(r - 0.8, 0.04) * 0.16;
  } else if (kind == 8u) {
    alpha = exp(-r * r * 14.0); color = mix(color, palette.hit.rgb, exp(-r * r * 90.0));
  } else if (kind == 9u) {
    alpha = (1.0 - smoothstep(0.65, 0.95, abs(p.y))) * step(p.x, in.detail.x * 2.0 - 1.0);
  }
  alpha = clamp(alpha * in.color.a, 0.0, 1.0);
  if (alpha < 0.003) { discard; }
  return vec4f(color * (1.0 + core * scene.options.w * 0.3), alpha);
}
