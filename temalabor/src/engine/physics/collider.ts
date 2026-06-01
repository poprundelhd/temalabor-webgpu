import { Component } from '../component';
import type { Scene } from '../scene';
import { type AABB, aabbFromCenter } from './aabb';

export class Collider extends Component {
    hw: number;
    hh: number;
    hz: number;

    isStatic: boolean = true;

    onCollide?: (other: Collider) => void;

    constructor(hw = 0.5, hh = 0.5, hz = 0.5) {
        super();
        this.hw = hw;
        this.hh = hh;
        this.hz = hz;
    }

    update(_dt: number, _scene: Scene): void {
        //mar a physics-system.ts frissit
    }

    getAABB(): AABB {
        const { position: [x, y, z] } = this.gameObject.transform;
        return aabbFromCenter(x, y, z, this.hw, this.hh, this.hz);
    }
}