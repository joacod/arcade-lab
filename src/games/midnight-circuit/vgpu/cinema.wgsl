@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linear: sampler;
@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let pixel = 1.0 / vec2f(textureDimensions(source));
  let base = textureSample(source, linear, uv).rgb;
  var bloom = vec3f(0.0);
  for (var y = -2; y <= 2; y++) {
    for (var x = -2; x <= 2; x++) {
      let sample = textureSample(source, linear, uv + vec2f(f32(x), f32(y)) * pixel * 4.0).rgb;
      bloom += max(sample - vec3f(0.64), vec3f(0.0)) / 25.0;
    }
  }
  let edge = smoothstep(0.23, 0.8, length((uv - 0.5) * vec2f(1.0, 0.85)));
  let grade = base * vec3f(0.98, 1.04, 1.08) + bloom * vec3f(0.85, 1.05, 1.15);
  return vec4f(grade * (1.0 - edge * 0.28), 1.0);
}
