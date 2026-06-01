import type { AABB } from '../../engine/physics/aabb';
import { aabbOverlap } from '../../engine/physics/aabb';

const MAGE_BULLET_SPEED    = 12.0; //20 > 12
const MAGE_BULLET_RADIUS   = 0.15;
const MAGE_BULLET_LIFETIME = 3.0; //3 masodperc

export class MageProjectile {
    x: number;
    y: number;
    z: number;

    vx: number;
    vy: number;
    vz: number;

    lifetime: number = 0;
    dead: boolean    = false;

    constructor(
        x: number, y: number, z: number,
        dx: number, dy: number, dz: number,
    ) {
        this.x  = x;
        this.y  = y;
        this.z  = z;
        this.vx = dx * MAGE_BULLET_SPEED;
        this.vy = dy * MAGE_BULLET_SPEED;
        this.vz = dz * MAGE_BULLET_SPEED;
    }

    update(dt: number, colliders: AABB[], playerAABB: AABB): boolean {
        if (this.dead) return false;

        this.lifetime += dt;
        if (this.lifetime > MAGE_BULLET_LIFETIME) {
            this.dead = true;
            return false;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;

        if (this.y - MAGE_BULLET_RADIUS <= 0) {
            this.dead = true;
            return false;
        }

        const aabb = this.getAABB();
        if (colliders.some(c => aabbOverlap(aabb, c))) {
            this.dead = true;
            return false;
        }

        if (aabbOverlap(aabb, playerAABB)) {
            this.dead = true;
            return true;
        }

        return false;
    }

    getAABB(): AABB {
        return {
            minX: this.x - MAGE_BULLET_RADIUS, maxX: this.x + MAGE_BULLET_RADIUS,
            minY: this.y - MAGE_BULLET_RADIUS, maxY: this.y + MAGE_BULLET_RADIUS,
            minZ: this.z - MAGE_BULLET_RADIUS, maxZ: this.z + MAGE_BULLET_RADIUS,
        };
    }
}