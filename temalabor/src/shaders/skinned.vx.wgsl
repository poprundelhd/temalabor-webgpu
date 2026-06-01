struct Uniforms {
    mvp       : mat4x4f,
    model     : mat4x4f,
    baseColor : vec4f,
}
@group(0) @binding(0) var<uniform> u : Uniforms;

@group(0) @binding(1) var<storage, read> jointData : array<f32>;

struct VertexOut {
    @builtin(position) pos   : vec4f,
    @location(0)       norm  : vec3f,
    @location(1)       color : vec4f,
}

fn getJoint(idx: u32) -> mat4x4f {
    let base = idx * 16u;
    return mat4x4f(
        vec4f(jointData[base+0u],  jointData[base+1u],  jointData[base+2u],  jointData[base+3u]),
        vec4f(jointData[base+4u],  jointData[base+5u],  jointData[base+6u],  jointData[base+7u]),
        vec4f(jointData[base+8u],  jointData[base+9u],  jointData[base+10u], jointData[base+11u]),
        vec4f(jointData[base+12u], jointData[base+13u], jointData[base+14u], jointData[base+15u]),
    );
}

@vertex
fn vs(
    @location(0) position : vec3f,
    @location(1) normal   : vec3f,
    @location(2) uv       : vec2f,
    @location(3) joints   : vec4f,
    @location(4) weights  : vec4f,
) -> VertexOut {
    let j0 = clamp(u32(joints.x), 0u, 22u);
    let j1 = clamp(u32(joints.y), 0u, 22u);
    let j2 = clamp(u32(joints.z), 0u, 22u);
    let j3 = clamp(u32(joints.w), 0u, 22u);

    let skin =
        getJoint(j0) * weights.x +
        getJoint(j1) * weights.y +
        getJoint(j2) * weights.z +
        getJoint(j3) * weights.w;

    let sPos  = skin * vec4f(position, 1.0);
    let sNorm = normalize((skin * vec4f(normal, 0.0)).xyz);

    var out : VertexOut;
    out.pos   = u.mvp * sPos;
    out.norm  = normalize((u.model * vec4f(sNorm, 0.0)).xyz);
    out.color = u.baseColor;
    return out;
}
