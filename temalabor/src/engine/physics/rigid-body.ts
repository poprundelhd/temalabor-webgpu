import { Component }   from '../component';
import type { Scene }  from '../scene';
import { aabbFromBox, aabbOverlap } from './aabb';
import type { AABB }   from './aabb';

const GRAVITY       = -9.81;
const FRICTION      =  0.85;
const HALF_SIZE     =  0.5;
const GROUND_Y      =  0.0;
const PUSH_COOLDOWN =  0.5;

export class RigidBody extends Component {
    vx: number = 0;
    vy: number = 0;
    vz: number = 0;

    onGround:     boolean = false;
    useGravity:   boolean = true;
    pushCooldown: number  = 0;

    jumpCount: number = 0;
    maxJumps:  number = 2;
    jumpForce: number = 5.0;

    staticColliders: AABB[] = [];

    jump(): void {
        if (this.onGround) {
            this.vy       = this.jumpForce;
            this.onGround = false;
            this.jumpCount = 1;
        } else if (this.jumpCount < this.maxJumps) {
            this.vy = this.jumpForce * 0.85;
            this.jumpCount++;
        }
    }

    applyImpulse(ix: number, iy: number, iz: number): boolean {
        if (this.pushCooldown > 0) return false;
        this.vx += ix;
        this.vy += iy;
        this.vz += iz;
        this.pushCooldown = PUSH_COOLDOWN;
        return true;
    }

    getAABB(): AABB {
        const [x, y, z] = this.gameObject?.transform.position ?? [0, 0, 0];
        return aabbFromBox(x, y, z, HALF_SIZE);
    }

    update(dt: number, _scene?: Scene): void {
        if (this.pushCooldown > 0)
            this.pushCooldown = Math.max(0, this.pushCooldown - dt);

        if (this.useGravity && !this.onGround) this.vy += GRAVITY * dt;

        this.vx *= Math.pow(FRICTION, dt * 60);
        this.vz *= Math.pow(FRICTION, dt * 60);
        if (Math.abs(this.vx) < 0.01) this.vx = 0;
        if (Math.abs(this.vz) < 0.01) this.vz = 0;

        const pos = this.gameObject?.transform.position ?? [0,0,0];
        let [x, y, z] = pos;

        const newX = x + this.vx * dt;
        const newY = y + this.vy * dt;
        const newZ = z + this.vz * dt;

        if (!this.staticColliders.some(c => aabbOverlap(aabbFromBox(newX, y, z, HALF_SIZE), c))) x = newX;
        else this.vx = 0;

        const floorY = GROUND_Y + HALF_SIZE;
        const collidesY = this.staticColliders.some(c => aabbOverlap(aabbFromBox(x, newY, z, HALF_SIZE), c));
        if (newY <= floorY)     { y = floorY; this.vy = 0; this.onGround = true;  this.jumpCount = 0; }
        else if (collidesY)     { this.vy = 0; this.onGround = false; }
        else                    { y = newY;   this.onGround = false; }

        if (!this.staticColliders.some(c => aabbOverlap(aabbFromBox(x, y, newZ, HALF_SIZE), c))) z = newZ;
        else this.vz = 0;

        if (this.gameObject) this.gameObject.transform.position = [x, y, z];
    }
}