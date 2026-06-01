@fragment
fn fs(
    @location(0) normal : vec3f,
    @location(1) color  : vec4f,
) -> @location(0) vec4f {
    let lightDir = normalize(vec3f(0.6, 1.0, 0.4));
    let diffuse  = max(dot(normalize(normal), lightDir), 0.0);
    let lit      = 0.35 + 0.65 * diffuse;
    return vec4f(color.rgb * lit, color.a);
}
