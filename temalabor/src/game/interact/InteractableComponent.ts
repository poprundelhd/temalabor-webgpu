import { Component }  from '../../engine/component';
import type { Scene } from '../../engine/scene';
import type { Player } from '../player/Player';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerBody } from '../player/PlayerBody';
import { AUTO_WEAPON_COST, SPEED_BOOST_COST } from '../config/gameplay';

export abstract class InteractableComponent extends Component {
    abstract readonly id:    string;
    abstract readonly name:  string;
    abstract readonly cost:  number;
    abstract readonly range: number;

    purchased: boolean = false;

    update(_dt: number, _scene?: Scene): void {}

    abstract onPurchase(player: Player, controller: PlayerController, body: PlayerBody): void;

    isInRange(px: number, pz: number): boolean {
        const [x,,z] = this.gameObject.transform.position;
        const dx = px - x, dz = pz - z;
        return Math.sqrt(dx*dx + dz*dz) < this.range;
    }

    getPromptText(player: Player): string {
        return player.creditAmount >= this.cost
            ? `[E] ${this.name} (${this.cost} kredit)`
            : `[E] ${this.name} – nincs elég kredit (${player.creditAmount}/${this.cost})`;
    }

    tryInteract(player: Player, controller: PlayerController, body: PlayerBody): boolean {
        if (this.purchased) return false;
        if (!player.canAfford(this.cost)) return false;
        player.spendCredits(this.cost);
        this.purchased = true;
        this.onPurchase(player, controller, body);
        console.log(`[Interactable] Megvásárolva: ${this.name}`);
        return true;
    }
}

export class AutoWeaponPerk extends InteractableComponent {
    readonly id    = 'auto_weapon';
    readonly name  = 'Automata fegyver';
    readonly cost  = AUTO_WEAPON_COST;
    readonly range = 9.0; //a sirko meretenek a 3-szorosa

    onPurchase(_player: Player, controller: PlayerController, _body: PlayerBody): void {
        controller.weapon1Unlocked = true;
    }
}

export class SpeedBoostPerk extends InteractableComponent {
    readonly id    = 'speed_boost';
    readonly name  = 'Gyorsítás + Triple Jump';
    readonly cost  = SPEED_BOOST_COST;
    readonly range = 9.0; //a hordo meretenek a 3-szorosa

    onPurchase(_player: Player, controller: PlayerController, body: PlayerBody): void {
        controller.normalSpeed = 6.0;
        controller.sprintSpeed = 9.0;
        body.maxJumps          = 3;
    }
}
