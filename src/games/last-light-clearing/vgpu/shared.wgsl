export struct FrameData {
  screen: vec4f, // CSS size, physical backing size
  view: vec4f, // authoritative CSS translation, uniform scale, cosmetic active time
  world: vec4f, // arena bounds, alignment padding
  keeper: vec4f, // position, alignment padding
  options: vec4f, // field flow, vein brightness, ripple count, glow
}
export struct Palette {
  background: vec4f, floor: vec4f, boundary: vec4f, ground: vec4f, canopy: vec4f,
  light: vec4f, enemy: vec4f, elite: vec4f, spark: vec4f, halo: vec4f,
  pulse: vec4f, shard: vec4f, gem: vec4f, hit: vec4f, damage: vec4f,
}
export fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}
export fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1, 0)), u.x), mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1)), u.x), u.y);
}
