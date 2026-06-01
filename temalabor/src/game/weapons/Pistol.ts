import { Weapon } from './Weapon';

export class Pistol extends Weapon {
    readonly name     = 'blaster-b';
    readonly displayName = 'Pisztoly';
    readonly magSize  = 8;
    readonly auto     = false;
    readonly fireRate = 0;
    readonly modelUrl = '/models/weapon/blaster-b.glb';
}