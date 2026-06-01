@fragment
fn fs(
    @builtin(position) fragCoord : vec4f,
    @location(0)       uv        : vec2f,
) -> @location(0) vec4f {
    let t = clamp((uv.y + 1.0) * 0.5, 0.0, 1.0);

    let zenith  = vec3f(0.08, 0.05, 0.18);
    let midsky  = vec3f(0.55, 0.25, 0.35);
    let horizon = vec3f(0.95, 0.55, 0.30);

    var color: vec3f;
    if (t < 0.35) {
        let s = t / 0.35;
        color = mix(horizon, midsky, smoothstep(0.0, 1.0, s));
    } else {
        let s = (t - 0.35) / 0.65;
        color = mix(midsky, zenith, smoothstep(0.0, 1.0, s));
    }

    return vec4f(color, 1.0);
}
