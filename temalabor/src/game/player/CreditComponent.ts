import { Component } from '../../engine/component';

export class CreditComponent extends Component {
    credits: number = 0;

    onChange?: (credits: number) => void;

    update(_dt: number): void {}

    add(amount: number): void {
        this.credits += amount;
        this.onChange?.(this.credits);
    }

    canAfford(cost: number): boolean {
        return this.credits >= cost;
    }

    spend(amount: number): boolean {
        if (!this.canAfford(amount)) return false;
        this.credits -= amount;
        this.onChange?.(this.credits);
        return true;
    }
}