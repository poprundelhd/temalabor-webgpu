export const MathUtils = {
    clamp(v: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, v));
    },

    lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    },

    smoothDamp(current: number, target: number, speed: number, dt: number): number {
        return MathUtils.lerp(current, target, Math.min(1, speed * dt));
    },

    degToRad(deg: number): number {
        return deg * Math.PI / 180;
    },

    radToDeg(rad: number): number {
        return rad * 180 / Math.PI;
    },

    randomRange(min: number, max: number): number {
        return min + Math.random() * (max - min);
    },

    randomSymmetric(range: number): number {
        return (Math.random() * 2 - 1) * range;
    },

    // buffer alignmenthez -> legkozelebbi 2^n
    alignTo(value: number, alignment: number): number {
        return Math.ceil(value / alignment) * alignment;
    },
};