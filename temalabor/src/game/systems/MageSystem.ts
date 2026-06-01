import { MageProjectile } from '../projectiles/MageProjectile';
import type { Enemy } from '../enemies/Enemy';
import type { AABB } from '../../engine/physics/aabb';

const FIRE_COOLDOWN  = 2.0;  //2 masodperc
const AIM_OFFSET_Y   = 1.5;  //magassag offset
const SPAWN_OFFSET_Y = 1.2;  //spawn magassag offset

export class MageSystem {
    projectiles: MageProjectile[] = [];
    private fireTimers: number[]  = [];

    update(
        dt:          number,
        enemies:     Enemy[],
        mageIndices: Set<number>,
        camX:        number,
        camY:        number,
        camZ:        number,
        colliders:   AABB[],
    ): boolean {
        for (let i = 0; i < enemies.length; i++) {
            if (!mageIndices.has(i)) continue;
            const be = enemies[i];
            if (be.dead) continue;

            if (this.fireTimers[i] === undefined) {
                this.fireTimers[i] = Math.random() * 2;
            }
            this.fireTimers[i] -= dt;

            if (this.fireTimers[i] <= 0) {
                this.fireTimers[i] = FIRE_COOLDOWN;
                const dx  = camX - be.x;
                const dy  = (camY - AIM_OFFSET_Y) - be.y;
                const dz  = camZ - be.z;
                const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
                this.projectiles.push(new MageProjectile(
                    be.x, be.y + SPAWN_OFFSET_Y, be.z,
                    dx/len, dy/len, dz/len,
                ));
            }
        }

        const playerAABB: AABB = {
            minX: camX - 0.3, maxX: camX + 0.3,
            minY: camY - 1.7, maxY: camY + 0.1,
            minZ: camZ - 0.3, maxZ: camZ + 0.3,
        };

        let playerHit = false;
        for (const mp of this.projectiles) {
            if (mp.update(dt, colliders, playerAABB)) playerHit = true;
        }
        this.projectiles = this.projectiles.filter(mp => !mp.dead);

        return playerHit;
    }

    //uj wave elejen hivando
    resetTimers(): void {
        this.fireTimers = [];
    }
}