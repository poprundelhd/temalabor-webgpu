import { Component } from '../../engine/component';
import type { GameObject } from '../../engine/game-object';
import { aabbOverlap } from '../../engine/physics/aabb';
import type { AABB } from '../../engine/physics/aabb';
import type { PhysicsObject } from '../physics/PhysicsObject';

const MAX_HP    = 3;
const HALF_SIZE = 0.5;
const GROUND_Y  = 0.0;

export abstract class Enemy extends Component {
    hp:           number  = MAX_HP;
    dead:         boolean = false;
    flashTimer:   number  = 0;
    moveSpeed:    number  = 4.2;
    stopDistance: number  = 0;
    readonly moving: boolean;

    vx: number = 0;
    vz: number = 0;

    private _pos: [number, number, number];

    constructor(x = 0, y = 0, z = 0, moving = true) {
        super();
        this._pos   = [x, y, z];
        this.moving = moving;
    }

    bindGameObject(obj: GameObject): void {
        this.gameObject = obj;
        obj.transform.position = this._pos;
    }

    get x(): number { return this._pos[0]; }
    set x(v: number) { this._pos[0] = v; }
    get y(): number { return this._pos[1]; }
    set y(v: number) { this._pos[1] = v; }
    get z(): number { return this._pos[2]; }
    set z(v: number) { this._pos[2] = v; }

    abstract getColors(): [number, number, number, number][];
    abstract getHitboxSize(): { hw: number; hh: number };

    hit(): void {
        if (this.dead) return;
        this.hp--;
        this.flashTimer = 0.1;
        if (this.hp <= 0) this.dead = true;
    }

    getColor(): [number, number, number, number] {
        if (this.flashTimer > 0) return [1.0, 0.0, 0.0, 1.0];
        const colors = this.getColors();
        const idx    = Math.max(0, Math.min(MAX_HP - this.hp, colors.length - 1));
        return colors[idx];
    }

    getAABB(): AABB {
        const { hw, hh } = this.getHitboxSize();
        const x = this.x, y = this.y, z = this.z;
        return {
            minX: x - hw, maxX: x + hw,
            minY: y - hh, maxY: y + hh,
            minZ: z - hw, maxZ: z + hw,
        };
    }

    applyImpulse(ix: number, _iy: number, iz: number): void {
        this.vx += ix;
        this.vz += iz;
    }

    update(
        dt: number,
        playerX = 0,
        playerZ = 0,
        staticColliders: AABB[] = [],
        otherEnemies: Enemy[] = [],
        pushables: PhysicsObject[] = [],
    ): void {
        if (this.dead) return;

        if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);

        const friction = Math.pow(0.85, dt * 60);
        this.vx *= friction;
        this.vz *= friction;
        if (Math.abs(this.vx) < 0.01) this.vx = 0;
        if (Math.abs(this.vz) < 0.01) this.vz = 0;

        let x = this.x, y = this.y, z = this.z;

        const newX = x + this.vx * dt;
        const newZ = z + this.vz * dt;
        const aabbX = { minX: newX-HALF_SIZE, maxX: newX+HALF_SIZE, minY: y-HALF_SIZE, maxY: y+HALF_SIZE, minZ: z-HALF_SIZE, maxZ: z+HALF_SIZE };
        if (!staticColliders.some(c => aabbOverlap(aabbX, c))) x = newX; else this.vx = 0;
        const aabbZ = { minX: x-HALF_SIZE, maxX: x+HALF_SIZE, minY: y-HALF_SIZE, maxY: y+HALF_SIZE, minZ: newZ-HALF_SIZE, maxZ: newZ+HALF_SIZE };
        if (!staticColliders.some(c => aabbOverlap(aabbZ, c))) z = newZ; else this.vz = 0;

        if (this.moving && playerX !== undefined && playerZ !== undefined) {
            const dx  = playerX - x;
            const dz  = playerZ - z;
            const len = Math.sqrt(dx*dx + dz*dz) || 1;
            const minApproach = Math.max(0.8, this.stopDistance);

            if (len >= minApproach) {
                const moveX = x + (dx/len) * this.moveSpeed * dt;
                const moveZ = z + (dz/len) * this.moveSpeed * dt;
                const aabbMX = { minX: moveX-HALF_SIZE, maxX: moveX+HALF_SIZE, minY: y-HALF_SIZE, maxY: y+HALF_SIZE, minZ: z-HALF_SIZE, maxZ: z+HALF_SIZE };
                if (!staticColliders.some(c => aabbOverlap(aabbMX, c))) x = moveX;
                const aabbMZ = { minX: x-HALF_SIZE, maxX: x+HALF_SIZE, minY: y-HALF_SIZE, maxY: y+HALF_SIZE, minZ: moveZ-HALF_SIZE, maxZ: moveZ+HALF_SIZE };
                if (!staticColliders.some(c => aabbOverlap(aabbMZ, c))) z = moveZ;
                y = GROUND_Y + HALF_SIZE;
            }
        }

        for (const other of otherEnemies) {
            if (other === this || other.dead) continue;
            const dx  = x - other.x;
            const dz  = z - other.z;
            const len = Math.sqrt(dx*dx + dz*dz);
            const minDist = HALF_SIZE * 2;
            if (len < minDist && len > 0.001) {
                const push = (minDist - len) * 0.3;
                x += (dx/len) * push;
                z += (dz/len) * push;
            }
        }

        const myAABB = { minX: x-HALF_SIZE, maxX: x+HALF_SIZE, minY: y-HALF_SIZE, maxY: y+HALF_SIZE, minZ: z-HALF_SIZE, maxZ: z+HALF_SIZE };
        for (const obj of pushables) {
            if (!aabbOverlap(myAABB, obj.getAABB())) continue;
            const pdx  = obj.x - x;
            const pdz  = obj.z - z;
            const plen = Math.sqrt(pdx*pdx + pdz*pdz) || 1;
            const pushed = obj.applyImpulse((pdx/plen)*8, 1.5, (pdz/plen)*8);
            if (pushed) { this.vx -= (pdx/plen)*3; this.vz -= (pdz/plen)*3; }
        }

        this.x = x; this.y = y; this.z = z;
    }
}
