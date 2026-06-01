struct Uniforms {
    mvp       : mat4x4f,
    model     : mat4x4f,
    baseColor : vec4f,
}
@binding(0) @group(0) var<uniform> u : Uniforms;

struct VertexOutput {
    @builtin(position) clipPos  : vec4f,
    @location(0)       worldPos : vec3f,
    @location(1)       normal   : vec3f,
    @location(2)       color    : vec4f,
    @location(3)       uv       : vec2f,
}

@vertex
fn vx(
    @location(0) position : vec3f,
    @location(1) normal   : vec3f,
    @location(2) uv       : vec2f,
) -> VertexOutput {
    var out : VertexOutput;
    out.clipPos  = u.mvp   * vec4f(position, 1.0);
    out.worldPos = (u.model * vec4f(position, 1.0)).xyz;
    out.normal   = normalize((u.model * vec4f(normal, 0.0)).xyz);
    out.color    = u.baseColor;
    out.uv       = uv;
    return out;
}
