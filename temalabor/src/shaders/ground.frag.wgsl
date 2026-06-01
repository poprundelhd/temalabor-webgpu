//hash noise
fn hash(p: vec2f) -> f32 {
    var q = p;
    q = vec2f(dot(q, vec2f(127.1, 311.7)), dot(q, vec2f(269.5, 183.3)));
    return fract(sin(dot(q, vec2f(1.0))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
        mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
        u.y
    );
}

@fragment
fn ground(
    @location(0) color    : vec4f,
    @location(1) worldPos : vec3f,
) -> @location(0) vec4f {
    let n1 = noise(worldPos.xz * 0.08);
    let n2 = noise(worldPos.xz * 0.35) * 0.4;
    let n  = n1 * 0.6 + n2;

    let variation = (n - 0.5) * 0.16;
    let r = clamp(color.r + variation * 0.6, 0.0, 1.0);
    let g = clamp(color.g + variation,       0.0, 1.0);
    let b = clamp(color.b + variation * 0.3, 0.0, 1.0);

    return vec4f(r, g, b, 1.0);
}
