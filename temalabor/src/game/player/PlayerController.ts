import type { PlayerBody } from './PlayerBody';
import type { WeaponComponent } from './WeaponComponent';
import type { Input } from '../../engine/input/input';
import type { AABB } from '../../engine/physics/aabb';
import type { PhysicsObject } from '../physics/PhysicsObject';
import type { Enemy } from '../enemies/Enemy';
import { NORMAL_SPEED, SPRINT_SPEED } from '../config/gameplay';

export class PlayerController {
    normalSpeed: number = NORMAL_SPEED;
    sprintSpeed: number = SPRINT_SPEED;

    constructor(
        private body:   PlayerBody,
        private weapon: WeaponComponent,
        private input:  Input,
    ) {}

    get weapon1Unlocked(): boolean { return this.weapon.weapon1Unlocked; }
    set weapon1Unlocked(v: boolean) { this.weapon.weapon1Unlocked = v; }
    get reloading(): boolean { return this.weapon.reloading; }
    get projectiles() { return this.weapon.projectiles; }
    get activeWeaponIndex(): number { return this.weapon.activeWeaponIndex; }
    get weapons() { return this.weapon.weapons; }

    isLocked(): boolean { return this.input.isLocked; }

    update(dt: number, colliders: AABB[] = [], pushables: PhysicsObject[] = [], enemies: Enemy[] = []): number {
        if (!this.input.isLocked) return 0;

        if (this.input.mouse.deltaX !== 0 || this.input.mouse.deltaY !== 0) {
            this.body.rotate(this.input.mouse.deltaX, this.input.mouse.deltaY);
        }

        if (this.input.keyboard.wasPressed('Space')) this.body.jump();

        const hits = this.weapon.tick(dt, this.input, this.body, colliders, pushables, enemies);

        const isSprinting = this.input.sprint;
        this.body.moveSpeed = isSprinting ? this.sprintSpeed : this.normalSpeed;

        if (this.input.moveForward) this.body.move('forward', dt);
        if (this.input.moveBack)    this.body.move('back',    dt);
        if (this.input.moveLeft)    this.body.move('left',    dt);
        if (this.input.moveRight)   this.body.move('right',   dt);

        this.body.applyPhysics(dt);

        return hits;
    }
}
