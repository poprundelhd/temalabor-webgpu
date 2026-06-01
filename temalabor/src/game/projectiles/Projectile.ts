import type { AABB } from '../../engine/physics/aabb';
import { aabbOverlap } from '../../engine/physics/aabb';
import type { PhysicsObject } from '../physics/PhysicsObject';
import type { Enemy } from '../enemies/Enemy';

const BULLET_SPEED  = 20.0;
const BULLET_RADIUS = 0.08;
const MAX_LIFETIME  = 5.0;
const GRAVITY       = -9.81;

export class Projectile {
    x: number;
    y: number;
    z: number;

    vx: number;
    vy: number;
    vz: number;

    lifetime: number = 0;
    dead: boolean = false;

    constructor(
        x: number, y: number, z: number,
        dx: number, dy: number, dz: number,
    ) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.vx = dx * BULLET_SPEED;
        this.vy = dy * BULLET_SPEED;
        this.vz = dz * BULLET_SPEED;
    }

    update(dt: number, colliders: AABB[], pushables: PhysicsObject[] = [], enemies: Enemy[] = []): number {
        if (this.dead) return 0;

        this.lifetime += dt;
        if (this.lifetime > MAX_LIFETIME) {
            this.dead = true;
            return 0;
        }

        this.vy += GRAVITY * dt * 0.3;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;

        if (this.y - BULLET_RADIUS <= 0) {
            this.dead = true;
            return 0;
        }

        const aabb = this.getAABB();
        if (colliders.some(c => aabbOverlap(aabb, c))) {
            this.dead = true;
            return 0;
        }

        for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (!aabbOverlap(aabb, enemy.getAABB())) continue;
            enemy.hit();
            this.dead = true;
            return 1;
        }

        for (const obj of pushables) {
            if (!aabbOverlap(aabb, obj.getAABB())) continue;

            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy + this.vz * this.vz);
            const force = speed * 0.4;
            obj.applyImpulse(
                (this.vx / speed) * force,
                2.0,                          
                (this.vz / speed) * force,
            );
            this.dead = true;
            return 0;
        }
        return 0;
    }

    getAABB(): AABB {
        return {
            minX: this.x - BULLET_RADIUS, maxX: this.x + BULLET_RADIUS,
            minY: this.y - BULLET_RADIUS, maxY: this.y + BULLET_RADIUS,
            minZ: this.z - BULLET_RADIUS, maxZ: this.z + BULLET_RADIUS,
        };
    }
}