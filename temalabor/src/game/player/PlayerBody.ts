import { mat4, vec3 } from 'wgpu-matrix';
import type { AABB } from '../../engine/physics/aabb';
import { aabbOverlap } from '../../engine/physics/aabb';
import type { PhysicsObject } from '../physics/PhysicsObject';
import {
    PLAYER_HEIGHT, PLAYER_RADIUS, GRAVITY, JUMP_FORCE, GROUND_Y, GROUND_LIMIT,
} from '../config/gameplay';

export class PlayerBody {
    position: Float32Array;
    yaw: number = -90;
    pitch: number = 0;

    fov: number = (2 * Math.PI) / 5;
    near: number = 0.1;
    far: number = 1000;

    moveSpeed: number = 5.0;
    lookSpeed: number = 0.15;

    velocityY: number = 0;
    isGrounded: boolean = false;
    jumpCount: number = 0;
    maxJumps:  number = 2;

    recoilVx: number = 0;
    recoilVz: number = 0;

    colliders: AABB[] = [];

    pushables: PhysicsObject[] = [];

    private front: Float32Array;
    private up: Float32Array;
    private right: Float32Array;

    constructor() {
        this.position = new Float32Array([0, GROUND_Y + PLAYER_HEIGHT, 4]);
        this.front    = new Float32Array([0, 0, -1]);
        this.up       = new Float32Array([0, 1, 0]);
        this.right    = new Float32Array([1, 0, 0]);
    }

    private updateVectors(): void {
        const yawRad   = (this.yaw   * Math.PI) / 180;
        const pitchRad = (this.pitch * Math.PI) / 180;

        this.front = new Float32Array([
            Math.cos(pitchRad) * Math.cos(yawRad),
            Math.sin(pitchRad),
            Math.cos(pitchRad) * Math.sin(yawRad),
        ]);
        vec3.normalize(this.front, this.front);
        this.right = vec3.normalize(vec3.cross(this.front, [0, 1, 0]));
        this.up    = vec3.normalize(vec3.cross(this.right, this.front));
    }

    private playerAABB(px: number, py: number, pz: number): AABB {
        return {
            minX: px - PLAYER_RADIUS, maxX: px + PLAYER_RADIUS,
            minY: py - PLAYER_HEIGHT, maxY: py + 0.1,
            minZ: pz - PLAYER_RADIUS, maxZ: pz + PLAYER_RADIUS,
        };
    }

    private collidesAt(px: number, py: number, pz: number): boolean {
        const player = this.playerAABB(px, py, pz);
        return this.colliders.some(c => aabbOverlap(player, c));
    }

    getFront(): Float32Array {
        this.updateVectors();
        return this.front;
    }

    getViewMatrix(): Float32Array {
        this.updateVectors();
        const target = vec3.add(this.position, this.front);
        return mat4.lookAt(this.position, target, this.up) as Float32Array;
    }

    getProjectionMatrix(aspect: number): Float32Array {
        return mat4.perspective(this.fov, aspect, this.near, this.far) as Float32Array;
    }

    getMVP(aspect: number): Float32Array {
        return mat4.multiply(this.getProjectionMatrix(aspect), this.getViewMatrix()) as Float32Array;
    }

    move(dir: 'forward' | 'back' | 'left' | 'right', dt: number): void {
        this.updateVectors();
        const v = this.moveSpeed * dt;

        const flatFront = vec3.normalize(new Float32Array([this.front[0], 0, this.front[2]]));
        const flatRight = vec3.normalize(new Float32Array([this.right[0], 0, this.right[2]]));

        const dirs: Record<string, Float32Array> = {
            forward: flatFront,
            back:    vec3.negate(flatFront),
            right:   flatRight,
            left:    vec3.negate(flatRight),
        };

        const d  = dirs[dir];
        const px = this.position[0];
        const py = this.position[1];
        const pz = this.position[2];

        const newX = px + d[0] * v;
        const newZ = pz + d[2] * v;

        if (!this.collidesAt(newX, py, pz)) this.position[0] = newX;
        if (!this.collidesAt(this.position[0], py, newZ)) this.position[2] = newZ;

        //barrier
        this.position[0] = Math.max(-GROUND_LIMIT, Math.min(GROUND_LIMIT, this.position[0]));
        this.position[2] = Math.max(-GROUND_LIMIT, Math.min(GROUND_LIMIT, this.position[2]));

        for (const obj of this.pushables) {
            const objAABB = obj.getAABB();
            const playerNow = this.playerAABB(this.position[0], this.position[1], this.position[2]);
            if (!aabbOverlap(playerNow, objAABB)) continue;

            const dx = obj.x - this.position[0];
            const dz = obj.z - this.position[2];
            const len = Math.sqrt(dx * dx + dz * dz) || 1;

            const force   = this.moveSpeed * 3.0;
            const pushed  = obj.applyImpulse((dx / len) * force, 1.5, (dz / len) * force);

            if (pushed) {
                this.recoilVx += (-dx / len) * 20.0;
                this.recoilVz += (-dz / len) * 20.0;
            }
        }
    }

    jump(): void {
        if (this.isGrounded) {
            this.velocityY  = JUMP_FORCE;
            this.isGrounded = false;
            this.jumpCount  = 1;
        } else if (this.jumpCount < this.maxJumps) {
            this.velocityY = JUMP_FORCE * 0.85;
            this.jumpCount++;
        }
    }

    applyPhysics(dt: number): void {
        if (!this.isGrounded) {
            this.velocityY += GRAVITY * dt;
        }

        if (this.recoilVx !== 0 || this.recoilVz !== 0) {
            const rx = this.position[0] + this.recoilVx * dt;
            const rz = this.position[2] + this.recoilVz * dt;
            if (!this.collidesAt(rx, this.position[1], this.position[2])) this.position[0] = rx;
            if (!this.collidesAt(this.position[0], this.position[1], rz))  this.position[2] = rz;
            const f = Math.pow(0.7, dt * 60);
            this.recoilVx *= f;
            this.recoilVz *= f;
            if (Math.abs(this.recoilVx) < 0.01) this.recoilVx = 0;
            if (Math.abs(this.recoilVz) < 0.01) this.recoilVz = 0;
        }

        const px = this.position[0];
        const pz = this.position[2];
        let   py = this.position[1] + this.velocityY * dt;

        const floorY = GROUND_Y + PLAYER_HEIGHT;
        if (py <= floorY) {
            py              = floorY;
            this.velocityY  = 0;
            this.isGrounded = true;
            this.jumpCount  = 0;
        }

        const playerAtNewY = this.playerAABB(px, py, pz);
        for (const c of this.colliders) {
            if (!aabbOverlap(playerAtNewY, c)) continue;

            const surfaceY = c.maxY + PLAYER_HEIGHT;

            if (this.velocityY <= 0 && py <= surfaceY) {
                py              = surfaceY;
                this.velocityY  = 0;
                this.isGrounded = true;
                this.jumpCount  = 0;
            } else if (this.velocityY > 0) {
                py              = c.minY - 0.1;
                this.velocityY  = 0;
            }
            break;
        }

        this.position[1] = py;

        //eses szimulacio
        const footY      = py - PLAYER_HEIGHT;
        const onGround   = Math.abs(footY - GROUND_Y) < 0.05;
        const onCollider = this.colliders.some(c => {
            const feetOnTop = Math.abs(footY - c.maxY) < 0.05;
            const withinXZ  = px > c.minX && px < c.maxX && pz > c.minZ && pz < c.maxZ;
            return feetOnTop && withinXZ;
        });
        if (!onGround && !onCollider) {
            this.isGrounded = false;
        }
    }

    rotate(dx: number, dy: number): void {
        this.yaw   += dx * this.lookSpeed;
        this.pitch -= dy * this.lookSpeed;
        this.pitch  = Math.max(-89, Math.min(89, this.pitch));
        this.yaw = ((this.yaw + 180) % 360 + 360) % 360 - 180;
    }
}
