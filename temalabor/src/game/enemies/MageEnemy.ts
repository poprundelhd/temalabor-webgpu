import { Enemy } from './Enemy';

export class MageEnemy extends Enemy {
    constructor(x: number, y: number, z: number, speed: number) {
        super(x, y, z, true);
        this.moveSpeed    = Math.min(speed, 5.0);
        this.stopDistance = 7.0;
    }

    getColors(): [number, number, number, number][] {
        return [
            [0.1, 0.2, 0.9, 1.0],
            [0.3, 0.4, 1.0, 1.0],
            [0.6, 0.7, 1.0, 1.0],
        ];
    }

    getHitboxSize() { return { hw: 0.6, hh: 1.2 }; }
}