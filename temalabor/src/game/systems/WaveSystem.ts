import { Enemy }          from '../enemies/Enemy';
import { SkeletonEnemy }  from '../enemies/SkeletonEnemy';
import { MageEnemy }      from '../enemies/MageEnemy';
import { GameObject }     from '../../engine/game-object';
import { Transform }      from '../../engine/transform';
import { Scene }          from '../../engine/scene';
import type { AABB }      from '../../engine/physics/aabb';
import { aabbOverlap }    from '../../engine/physics/aabb';
import type { GameSystem } from '../core/GameSystem';
import type { GameContext } from '../core/GameContext';
import { MAX_ENEMIES, WAVE_MULTIPLIER, GROUND_SIZE, WAVE_MARGIN, ENEMY_HALF } from '../config/gameplay';

export class WaveSystem implements GameSystem {
    currentRound: number      = 1;
    enemies:      Enemy[]     = [];
    mageIndices:  Set<number> = new Set();

    onRoundStart?:  (round: number, enemyCount: number, mageCount: number) => void;
    onStatueSpawn?: (pos: [number, number, number]) => void;
    onStatueHide?:  () => void;

    private spawning:  boolean = false;
    private colliders: AABB[];
    private scene:     Scene;
    private playerPos: () => [number, number, number];

    constructor(scene: Scene, colliders: AABB[], playerPos: () => [number, number, number]) {
        this.scene     = scene;
        this.colliders = colliders;
        this.playerPos = playerPos;
        this.enemies   = [this.makeMinion(4, 0.5, -8)];
    }

    private randomPos(): [number, number, number] {
        const [px,,pz] = this.playerPos();
        for (let i = 0; i < 500; i++) {
            const ex = (Math.random() * 2 - 1) * (GROUND_SIZE - WAVE_MARGIN);
            const ez = (Math.random() * 2 - 1) * (GROUND_SIZE - WAVE_MARGIN);
            const candidate: AABB = {
                minX: ex-ENEMY_HALF, maxX: ex+ENEMY_HALF,
                minY: 0,             maxY: 1.0,
                minZ: ez-ENEMY_HALF, maxZ: ez+ENEMY_HALF,
            };
            const collidesStatic = this.colliders.some(c => aabbOverlap(candidate, c));
            const dx = ex-px, dz = ez-pz;
            if (!collidesStatic && Math.sqrt(dx*dx+dz*dz) >= 5)
                return [ex, 0.5, ez];
        }
        return [
            (Math.random()*2-1)*(GROUND_SIZE-WAVE_MARGIN),
            0.5,
            (Math.random()*2-1)*(GROUND_SIZE-WAVE_MARGIN),
        ];
    }

    private register(enemy: Enemy, x: number, y: number, z: number): void {
        const obj = new GameObject('enemy', Transform.at(x, y, z));
        enemy.bindGameObject(obj);
        this.scene.add(obj);
    }

    private makeMinion(x: number, y: number, z: number): SkeletonEnemy {
        const speed = Math.min(4.2 + (this.currentRound-1)*0.3, 6.0);
        const enemy = new SkeletonEnemy(x, y, z, speed);
        this.register(enemy, x, y, z);
        return enemy;
    }

    private makeMage(x: number, y: number, z: number): MageEnemy {
        const speed = Math.min(3.5 + (this.currentRound-1)*0.2, 5.0);
        const enemy = new MageEnemy(x, y, z, speed);
        this.register(enemy, x, y, z);
        return enemy;
    }

    update(_dt: number, _ctx: GameContext): void {
        if (!this.allDead() || this.spawning) return;
        this.spawning = true;
        this.currentRound++;

        const enemyCount    = this.currentRound === 1 ? 1
            : Math.max(1, Math.floor((2*WAVE_MULTIPLIER) * Math.pow(WAVE_MULTIPLIER, this.currentRound-2)));
        const safeCount     = Math.min(enemyCount, MAX_ENEMIES);
        const mageCount     = this.currentRound >= 7
            ? Math.floor((this.currentRound-7)/5)+1 : 0;
        const safeMageCount = Math.min(mageCount, safeCount);

        this.mageIndices = new Set();
        this.enemies = Array.from({ length: safeCount }, (_, i) => {
            const p = this.randomPos();
            if (i >= safeCount - safeMageCount) {
                this.mageIndices.add(i);
                return this.makeMage(p[0], p[1], p[2]);
            }
            return this.makeMinion(p[0], p[1], p[2]);
        });

        console.log(`${this.currentRound}. kör – ${safeCount} ellenség (${safeMageCount} mage)`);
        this.onRoundStart?.(this.currentRound, safeCount, safeMageCount);

        if (this.currentRound >= 3 && (this.currentRound-3) % 3 === 0) {
            const pos: [number,number,number] = [
                (Math.random()*2-1)*(GROUND_SIZE-5), 1,
                (Math.random()*2-1)*(GROUND_SIZE-5),
            ];
            this.onStatueSpawn?.(pos);
        } else {
            this.onStatueHide?.();
        }

        setTimeout(() => { this.spawning = false; }, 100);
    }

    moveEnemies(dt: number, ctx: GameContext): void {
        const px = ctx.player.body.position[0];
        const pz = ctx.player.body.position[2];
        for (let i = 0; i < this.enemies.length; i++) {
            const others = this.enemies.filter((_, j) => j !== i);
            this.enemies[i].update(dt, px, pz, ctx.colliders, others, ctx.player.body.pushables);
        }
    }

    allDead(): boolean {
        return this.enemies.length > 0 && this.enemies.every(e => e.dead);
    }

    isMage(i: number): boolean { return this.mageIndices.has(i); }
    get maxEnemies(): number { return MAX_ENEMIES; }
}
