import type { HUDSystem } from '../../engine/ui/hud-system';
import type { Player } from '../player/Player';
import type { PerkSystem } from '../systems/PerkSystem';

export class HudController {
    constructor(
        private hud:    HUDSystem,
        private player: Player,
        private perks:  PerkSystem,
    ) {}

    setup(): void {
        this.hud.register('hp',       'hud-hp');
        this.hud.register('round',    'hud-round');
        this.hud.register('enemies',  'hud-enemies');
        this.hud.register('ammo',     'hud-ammo');
        this.hud.register('weapon',   'hud-weapon');
        this.hud.register('credits',  'hud-credits');
        this.hud.register('interact', 'interact-prompt');

        const ammoEl   = this.hud.get('ammo')?.el;
        const weaponEl = this.hud.get('weapon')?.el;
        if (ammoEl)   this.player.weapon.setAmmoElement(ammoEl);
        if (weaponEl) this.player.weapon.setWeaponElement(weaponEl);
    }

    update(round: number, aliveEnemies: number): void {
        this.hud.setText('round',   `Kör: ${round}`);
        this.hud.setText('enemies', `Ellenségek: ${aliveEnemies}`);
        this.hud.setText('hp',      `HP: ${this.player.hp}`);
        this.hud.setText('credits', `Kredit: ${this.player.creditAmount}`);

        if (this.player.isLocked()) {
            const px = this.player.body.position[0];
            const pz = this.player.body.position[2];
            this.hud.setPrompt('interact', this.perks.getPrompt(px, pz));
        } else {
            this.hud.setPrompt('interact', null);
        }
    }
}
