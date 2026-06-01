import type { Player } from '../player/Player';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerBody } from '../player/PlayerBody';
import type { AudioSystem } from '../../engine/audio/audio-system';
import type { Enemy } from '../enemies/Enemy';
import {
    PLAYER_RADIUS, PLAYER_HEIGHT,
    DAMAGE_COOLDOWN, PARRY_WINDOW, PARRY_COOLDOWN,
} from '../config/gameplay';

export class CombatSystem {
    private damageCooldown = 0;
    private parryWindow    = 0;
    private parryCooldown  = 0;
    isBlocking             = false;

    constructor(
        private player:     Player,
        private controller: PlayerController,
        private body:       PlayerBody,
        private audio:      AudioSystem,
    ) {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyX' && this.parryCooldown <= 0 && !this.controller.reloading)
                this.isBlocking = true;
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'KeyX') this.isBlocking = false;
        });
    }

    handleHit(): boolean {
        if (this.damageCooldown > 0) return false;
        if (this.isBlocking && this.parryCooldown <= 0 && !this.controller.reloading) {
            this.audio.play('parry', 1.0);
            this.damageCooldown = DAMAGE_COOLDOWN;
            this.parryCooldown  = PARRY_COOLDOWN;
            this.parryWindow    = 0;
            this.isBlocking     = false;
            return false;
        }
        this.player.takeDamage(1);
        this.audio.play('player_damaged', 0.8);
        this.damageCooldown = DAMAGE_COOLDOWN;
        this.parryWindow    = PARRY_WINDOW;
        return true;
    }

    beginFrame(dt: number): void {
        this.damageCooldown = Math.max(0, this.damageCooldown - dt);
        this.parryWindow    = Math.max(0, this.parryWindow    - dt);
        this.parryCooldown  = Math.max(0, this.parryCooldown  - dt);
        if (this.controller.reloading) this.isBlocking = false;
    }

    meleeCheck(enemies: Enemy[]): void {
        const px = this.body.position[0];
        const py = this.body.position[1];
        const pz = this.body.position[2];
        const playerAABB = {
            minX: px-PLAYER_RADIUS, maxX: px+PLAYER_RADIUS,
            minY: py-PLAYER_HEIGHT, maxY: py+0.1,
            minZ: pz-PLAYER_RADIUS, maxZ: pz+PLAYER_RADIUS,
        };

        for (const be of enemies) {
            if (be.dead) continue;
            const beAABB = be.getAABB();
            const playerAbove = this.body.maxJumps >= 3 && playerAABB.minY > beAABB.maxY - 0.3;
            const hit = !playerAbove &&
                playerAABB.minX < beAABB.maxX && playerAABB.maxX > beAABB.minX &&
                playerAABB.minY < beAABB.maxY && playerAABB.maxY > beAABB.minY &&
                playerAABB.minZ < beAABB.maxZ && playerAABB.maxZ > beAABB.minZ;
            if (!hit) continue;
            const dx = be.x - px, dz = be.z - pz;
            const len = Math.sqrt(dx*dx + dz*dz) || 1;
            be.applyImpulse((dx/len)*30, 3, (dz/len)*30);
            this.handleHit();
            break;
        }
    }
}
