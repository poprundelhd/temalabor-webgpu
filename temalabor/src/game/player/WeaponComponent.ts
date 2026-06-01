import { Component } from '../../engine/component';
import type { AABB } from '../../engine/physics/aabb';
import type { PhysicsObject } from '../physics/PhysicsObject';
import type { Enemy } from '../enemies/Enemy';
import type { Input } from '../../engine/input/input';
import type { PlayerBody } from './PlayerBody';
import { Projectile } from '../projectiles/Projectile';
import { Weapon } from '../weapons/Weapon';
import { Pistol } from '../weapons/Pistol';
import { MachineGun } from '../weapons/MachineGun';

export class WeaponComponent extends Component {
    projectiles: Projectile[] = [];

    readonly weapons: Weapon[] = [new Pistol(), new MachineGun()];
    private _activeIdx = 0;
    weapon1Unlocked = false;

    private ammoElement:   HTMLElement | null = null;
    private weaponElement: HTMLElement | null = null;

    onShoot?:  () => void;
    onReload?: () => void;

    constructor() {
        super();
        this.weapons.forEach(w => { w.ammo = w.magSize; });
        this.weapons.forEach(w => {
            w.onShoot  = () => this.onShoot?.();
            w.onReload = () => this.onReload?.();
        });
    }

    update(): void { 
        //tick()
    }

    get activeWeapon(): Weapon      { return this.weapons[this._activeIdx]; }
    get activeWeaponIndex(): number { return this._activeIdx; }
    get reloading(): boolean        { return this.activeWeapon.reloading; }

    private switchWeapon(idx: number): void {
        if (idx === this._activeIdx) return;
        if (idx === 1 && !this.weapon1Unlocked) return;
        this._activeIdx = idx;
        this.activeWeapon.onEquip();
        this.updateHUD();
    }

    private tryShoot(body: PlayerBody): void {
        if (!this.activeWeapon.shoot()) return;
        const front = body.getFront();
        const pos   = body.position;
        this.projectiles.push(new Projectile(
            pos[0] + front[0] * 0.5,
            pos[1] + front[1] * 0.5,
            pos[2] + front[2] * 0.5,
            front[0], front[1], front[2],
        ));
        this.updateHUD();
    }

    setAmmoElement(el: HTMLElement): void   { this.ammoElement   = el; this.updateHUD(); }
    setWeaponElement(el: HTMLElement): void { this.weaponElement = el; this.updateHUD(); }

    private updateHUD(): void {
        if (this.ammoElement)   this.ammoElement.textContent   = this.activeWeapon.getHudText();
        if (this.weaponElement) this.weaponElement.textContent = this.activeWeapon.getWeaponText();
    }

    tick(
        dt: number,
        input: Input,
        body: PlayerBody,
        colliders: AABB[] = [],
        pushables: PhysicsObject[] = [],
        enemies: Enemy[] = [],
    ): number {
        this.activeWeapon.update(dt);
        this.updateHUD();

        if (input.keyboard.wasPressed('KeyR') && !this.activeWeapon.reloading &&
            this.activeWeapon.ammo < this.activeWeapon.magSize) {
            this.activeWeapon.startReload();
            this.updateHUD();
        }

        if (input.keyboard.wasPressed('Digit1')) this.switchWeapon(0);
        if (input.keyboard.wasPressed('Digit2')) this.switchWeapon(1);

        if (!this.activeWeapon.auto && input.mouse.justDown) this.tryShoot(body);
        if (this.activeWeapon.auto && input.mouse.leftDown && !this.activeWeapon.reloading) {
            this.activeWeapon.fireTimer -= dt;
            if (this.activeWeapon.fireTimer <= 0) {
                this.tryShoot(body);
                this.activeWeapon.fireTimer = 1.0 / this.activeWeapon.fireRate;
            }
        }

        let hits = 0;
        for (const p of this.projectiles) hits += p.update(dt, colliders, pushables, enemies);
        this.projectiles = this.projectiles.filter(p => !p.dead);

        return hits;
    }
}
