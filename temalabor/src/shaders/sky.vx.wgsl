const POSITIONS = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0),
);

struct VOut {
    @builtin(position) pos : vec4f,
    @location(0)       uv  : vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VOut {
    let p = POSITIONS[vi];
    var out: VOut;
    out.pos = vec4f(p, 0.9999, 1.0);
    out.uv  = p;
    return out;
}
