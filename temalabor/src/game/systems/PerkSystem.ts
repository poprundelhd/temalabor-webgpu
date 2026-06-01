import type { Player } from '../player/Player';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerBody } from '../player/PlayerBody';
import type { InteractableComponent } from '../interact/InteractableComponent';
import type { GameSystem } from '../core/GameSystem';
import type { GameContext } from '../core/GameContext';

export class PerkSystem implements GameSystem {
    private components: InteractableComponent[] = [];

    constructor(
        private player:     Player,
        private controller: PlayerController,
        private body:       PlayerBody,
    ) {
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'KeyE') return;
            if (!this.controller.isLocked()) return;
            const px = this.body.position[0];
            const pz = this.body.position[2];
            this.tryInteract(px, pz);
        });
    }

    addPerk(comp: InteractableComponent): void {
        this.components.push(comp);
    }

    update(_dt: number, _ctx: GameContext): void {
        //interaction vezerelt
     }

    private tryInteract(px: number, pz: number): string | null {
        for (const comp of this.components) {
            if (comp.purchased) continue;
            if (comp.isInRange(px, pz)) {
                if (comp.tryInteract(this.player, this.controller, this.body)) return comp.id;
            }
        }
        return null;
    }

    getPrompt(px: number, pz: number): string | null {
        for (const comp of this.components) {
            if (!comp.purchased && comp.isInRange(px, pz))
                return comp.getPromptText(this.player);
        }
        return null;
    }

    isPurchased(id: string): boolean {
        return this.components.some(c => c.id === id && c.purchased);
    }
}
