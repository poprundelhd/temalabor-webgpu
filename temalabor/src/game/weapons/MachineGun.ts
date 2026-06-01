import { Weapon } from './Weapon';

export class MachineGun extends Weapon {
    readonly name     = 'blaster-p';
    readonly displayName = 'AR';
    readonly magSize  = 25;
    readonly auto     = true;
    readonly fireRate = 10; //10/masodperc
    readonly modelUrl = '/models/weapon/blaster-p.glb';
}