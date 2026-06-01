import { Component } from '../../engine/component';

export class HealthComponent extends Component {
    hp:     number;
    maxHp:  number;

    onDamage?: (amount: number) => void;
    onHeal?:   (amount: number) => void;
    onDeath?:  () => void;

    constructor(startHp = 2, maxHp = 10) {
        super();
        this.hp    = startHp;
        this.maxHp = maxHp;
    }

    update(_dt: number): void {}

    takeDamage(amount = 1): void {
        this.hp = Math.max(0, this.hp - amount);
        this.onDamage?.(amount);
        if (this.hp <= 0) this.onDeath?.();
    }

    heal(amount = 1): void {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.onHeal?.(amount);
    }

    get isDead(): boolean { return this.hp <= 0; }
}