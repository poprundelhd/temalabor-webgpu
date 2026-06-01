import { Enemy } from './Enemy';

export class SkeletonEnemy extends Enemy {
    constructor(x: number, y: number, z: number, speed: number) {
        super(x, y, z, true);
        this.moveSpeed = Math.min(speed, 6.0);
    }

    getColors(): [number, number, number, number][] {
        return [
            [0.05, 0.05, 0.05, 1.0],
            [0.30, 0.30, 0.30, 1.0],
            [0.60, 0.60, 0.60, 1.0],
        ];
    }

    getHitboxSize() { return { hw: 0.6, hh: 1.2 }; }
}