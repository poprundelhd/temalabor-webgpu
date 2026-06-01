@group(0) @binding(1) var colorSampler : sampler;
@group(0) @binding(2) var colorTexture : texture_2d<f32>;

@fragment
fn frag(
    @location(0) worldPos : vec3f,
    @location(1) normal   : vec3f,
    @location(2) color    : vec4f,
    @location(3) uv       : vec2f,
) -> @location(0) vec4f {
    let texColor  = textureSample(colorTexture, colorSampler, uv);
    let baseColor = texColor * color;

    let lightDir = normalize(vec3f(0.6, 1.0, 0.4));
    let diffuse  = max(dot(normalize(normal), lightDir), 0.0);
    let ambient  = 0.35;
    let lit      = ambient + (1.0 - ambient) * diffuse;

    return vec4f(baseColor.rgb * lit, baseColor.a);
}
