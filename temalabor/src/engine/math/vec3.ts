export type Vec3 = [number, number, number];

export const Vec3 = {
    zero():    Vec3 { return [0, 0, 0]; },
    one():     Vec3 { return [1, 1, 1]; },
    up():      Vec3 { return [0, 1, 0]; },
    forward(): Vec3 { return [0, 0, -1]; },

    add(a: Vec3, b: Vec3): Vec3 {
        return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
    },

    sub(a: Vec3, b: Vec3): Vec3 {
        return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
    },

    scale(a: Vec3, s: number): Vec3 {
        return [a[0]*s, a[1]*s, a[2]*s];
    },

    dot(a: Vec3, b: Vec3): number {
        return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    },

    length(a: Vec3): number {
        return Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
    },

    normalize(a: Vec3): Vec3 {
        const len = Vec3.length(a) || 1;
        return [a[0]/len, a[1]/len, a[2]/len];
    },

    distance(a: Vec3, b: Vec3): number {
        return Vec3.length(Vec3.sub(a, b));
    },

    distance2D(a: Vec3, b: Vec3): number {
        const dx = a[0]-b[0], dz = a[2]-b[2];
        return Math.sqrt(dx*dx + dz*dz);
    },

    lerp(a: Vec3, b: Vec3, t: number): Vec3 {
        return [
            a[0] + (b[0]-a[0]) * t,
            a[1] + (b[1]-a[1]) * t,
            a[2] + (b[2]-a[2]) * t,
        ];
    },

    clone(a: Vec3): Vec3 {
        return [a[0], a[1], a[2]];
    },

    angleY(from: Vec3, to: Vec3): number {
        const dx = to[0] - from[0];
        const dz = to[2] - from[2];
        return Math.atan2(dx, dz);
    },
};