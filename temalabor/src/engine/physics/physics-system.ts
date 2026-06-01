import type { Scene } from '../scene';
import { Collider } from './collider';
import { aabbOverlap, type AABB } from './aabb';

export class PhysicsSystem {
    private staticColliders: AABB[] = [];

    addStatic(aabb: AABB): void {
        this.staticColliders.push(aabb);
    }

    clearStatic(): void {
        this.staticColliders = [];
    }

    get statics(): AABB[] {
        return this.staticColliders;
    }

    overlapsStatic(aabb: AABB): boolean {
        return this.staticColliders.some(c => aabbOverlap(aabb, c));
    }

    queryStatic(aabb: AABB): AABB[] {
        return this.staticColliders.filter(c => aabbOverlap(aabb, c));
    }

    queryDynamic(scene: Scene, aabb: AABB): Collider[] {
        const result: Collider[] = [];
        for (const obj of scene.all) {
            const col = obj.getComponent(Collider);
            if (col && !col.isStatic && aabbOverlap(aabb, col.getAABB())) {
                result.push(col);
            }
        }
        return result;
    }

    moveSlide(
        x: number, y: number, z: number,
        dx: number, dz: number,
        halfSize = 0.3,
    ): [number, number] {
        const newX = x + dx;
        const aabbX: AABB = {
            minX: newX - halfSize, maxX: newX + halfSize,
            minY: y - 1.0,        maxY: y + 0.1,
            minZ: z  - halfSize,   maxZ: z  + halfSize,
        };
        const finalX = this.overlapsStatic(aabbX) ? x : newX;

        const newZ = z + dz;
        const aabbZ: AABB = {
            minX: finalX - halfSize, maxX: finalX + halfSize,
            minY: y - 1.0,          maxY: y + 0.1,
            minZ: newZ - halfSize,   maxZ: newZ + halfSize,
        };
        const finalZ = this.overlapsStatic(aabbZ) ? z : newZ;

        return [finalX, finalZ];
    }
}