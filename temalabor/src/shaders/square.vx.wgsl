struct Uniforms {
    modelViewProjectionMatrix : mat4x4f,
    color                     : vec4f,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
    @builtin(position) Position : vec4f,
    @location(0)       color    : vec4f,
}

@vertex
fn vx(
    @location(0) position : vec3f
) -> VertexOutput {
    var output : VertexOutput;
    output.Position = uniforms.modelViewProjectionMatrix * vec4f(position, 1.0);
    output.color    = uniforms.color;
    return output;
}
