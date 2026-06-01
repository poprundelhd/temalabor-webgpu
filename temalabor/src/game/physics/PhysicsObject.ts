import { RigidBody }                from '../../engine/physics/rigid-body';
import { aabbFromBox, aabbOverlap } from '../../engine/physics/aabb';
import type { AABB }                from '../../engine/physics/aabb';

const HALF_SIZE     = 0.5;
const GRAVITY       = -9.81;
const FRICTION      =  0.85;
const GROUND_Y      =  0.0;
const PUSH_COOLDOWN =  0.5;

export class PhysicsObject extends RigidBody {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
    }

    override getAABB(): AABB {
        return aabbFromBox(this.x, this.y, this.z, HALF_SIZE);
    }

    override applyImpulse(ix: number, iy: number, iz: number): boolean {
        if (this.pushCooldown > 0) return false;
        this.vx += ix;
        this.vy += iy;
        this.vz += iz;
        this.pushCooldown = PUSH_COOLDOWN;
        return true;
    }

    integrate(dt: number, staticColliders: AABB[] = []): void {
        if (this.pushCooldown > 0)
            this.pushCooldown = Math.max(0, this.pushCooldown - dt);

        if (!this.onGround) this.vy += GRAVITY * dt;

        this.vx *= Math.pow(FRICTION, dt * 60);
        this.vz *= Math.pow(FRICTION, dt * 60);
        if (Math.abs(this.vx) < 0.01) this.vx = 0;
        if (Math.abs(this.vz) < 0.01) this.vz = 0;

        const newX = this.x + this.vx * dt;
        const newY = this.y + this.vy * dt;
        const newZ = this.z + this.vz * dt;

        if (!staticColliders.some(c => aabbOverlap(aabbFromBox(newX, this.y, this.z, HALF_SIZE), c))) this.x = newX; else this.vx = 0;

        const floorY  = GROUND_Y + HALF_SIZE;
        const colY    = staticColliders.some(c => aabbOverlap(aabbFromBox(this.x, newY, this.z, HALF_SIZE), c));
        if (newY <= floorY) { this.y = floorY; this.vy = 0; this.onGround = true; }
        else if (colY)      { this.vy = 0; this.onGround = false; }
        else                { this.y = newY; this.onGround = false; }

        if (!staticColliders.some(c => aabbOverlap(aabbFromBox(this.x, this.y, newZ, HALF_SIZE), c))) this.z = newZ; else this.vz = 0;
    }
}