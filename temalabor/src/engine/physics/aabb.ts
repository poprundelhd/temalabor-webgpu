export interface AABB {
    minX: number; maxX: number;
    minY: number; maxY: number;
    minZ: number; maxZ: number;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
    return (
        a.minX < b.maxX && a.maxX > b.minX &&
        a.minY < b.maxY && a.maxY > b.minY &&
        a.minZ < b.maxZ && a.maxZ > b.minZ
    );
}

export function aabbFromCenter(
    cx: number, cy: number, cz: number,
    hw: number, hh: number, hz: number,
): AABB {
    return {
        minX: cx - hw, maxX: cx + hw,
        minY: cy - hh, maxY: cy + hh,
        minZ: cz - hz, maxZ: cz + hz,
    };
}

export function aabbFromBox(
    x: number, y: number, z: number, halfSize: number,
): AABB {
    return aabbFromCenter(x, y, z, halfSize, halfSize, halfSize);
}