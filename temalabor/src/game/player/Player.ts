import { GameObject }      from '../../engine/game-object';
import { Transform }       from '../../engine/transform';
import type { Input }      from '../../engine/input/input';
import type { AABB }       from '../../engine/physics/aabb';
import { aabbFromBox }     from '../../engine/physics/aabb';
import type { Enemy }      from '../enemies/Enemy';
import type { Projectile } from '../projectiles/Projectile';
import { PlayerBody }      from './PlayerBody';
import { PlayerController } from './PlayerController';
import { WeaponComponent } from './WeaponComponent';
import { HealthComponent } from './HealthComponent';
import { CreditComponent } from './CreditComponent';
import { PLAYER_START_HP, PLAYER_MAX_HP } from '../config/gameplay';

export class Player extends GameObject {
    readonly body:       PlayerBody;
    readonly weapon:     WeaponComponent;
    readonly controller: PlayerController;

    private health:  HealthComponent;
    private credits: CreditComponent;

    constructor(input: Input, startHp = PLAYER_START_HP) {
        super('player', Transform.at(0, 1.7, 0));

        this.body   = new PlayerBody();
        this.weapon = this.addComponent(new WeaponComponent());

        this.health  = this.addComponent(new HealthComponent(startHp, PLAYER_MAX_HP));
        this.credits = this.addComponent(new CreditComponent());

        this.controller = new PlayerController(this.body, this.weapon, input);
    }

    get hp(): number      { return this.health.hp; }
    get isDead(): boolean  { return this.health.isDead; }

    takeDamage(amount = 1): void { this.health.takeDamage(amount); }
    heal(amount = 1): void       { this.health.heal(amount); }

    get creditAmount(): number { return this.credits.credits; }

    addCredits(amount: number): void   { this.credits.add(amount); }
    canAfford(cost: number): boolean   { return this.credits.canAfford(cost); }
    spendCredits(cost: number): boolean { return this.credits.spend(cost); }

    get position()  { return this.body.position; }
    get colliders() { return this.body.colliders; }
    get pushables() { return this.body.pushables; }
    get projectiles(): Projectile[] { return this.weapon.projectiles; }

    addCollider(aabb: AABB): void { this.body.colliders.push(aabb); }
    addStaticBox(x: number, y: number, z: number, half: number): void {
        this.body.colliders.push(aabbFromBox(x, y, z, half));
    }

    isLocked(): boolean { return this.controller.isLocked(); }

    //controller + transform
    tick(dt: number, enemies: Enemy[] = []): number {
        const hits = this.controller.update(dt, this.body.colliders, this.body.pushables, enemies);
        this.transform.position = [this.body.position[0], this.body.position[1], this.body.position[2]];
        return hits;
    }

    getViewMatrix()                     { return this.body.getViewMatrix(); }
    getProjectionMatrix(aspect: number) { return this.body.getProjectionMatrix(aspect); }
    getFront()                          { return this.body.getFront(); }
}
