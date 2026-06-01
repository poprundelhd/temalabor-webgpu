import type { GameRenderer } from './GameRenderer';
import type { Projectile } from '../projectiles/Projectile';
import type { MageProjectile } from '../projectiles/MageProjectile';
import { mat4 } from 'wgpu-matrix';

const MAX_PLAYER_BULLETS = 50;
const MAX_MAGE_BULLETS   = 30;

export class ProjectileRenderer {
    private renderer: GameRenderer;

    private bulletUBs: GPUBuffer[];
    private bulletBGs: GPUBindGroup[];

    private mageUBs: GPUBuffer[];
    private mageBGs: GPUBindGroup[];

    constructor(renderer: GameRenderer) {
        this.renderer = renderer;

        this.bulletUBs = Array.from({ length: MAX_PLAYER_BULLETS }, () => renderer.makeFlatUB());
        this.bulletBGs = this.bulletUBs.map(ub => renderer.makeFlatBG(ub));

        this.mageUBs = Array.from({ length: MAX_MAGE_BULLETS }, () => renderer.makeFlatUB());
        this.mageBGs = this.mageUBs.map(ub => renderer.makeFlatBG(ub));
    }

    updateUniforms(
        vp:              Float32Array,
        bullets:         Projectile[],
        mageProjectiles: MageProjectile[],
        writeUniforms:   (ub: GPUBuffer, mvp: Float32Array, color: [number,number,number,number]) => void,
    ): void {
        for (let i = 0; i < Math.min(bullets.length, MAX_PLAYER_BULLETS); i++) {
            const p  = bullets[i];
            const bm = mat4.translation([p.x, p.y, p.z]) as Float32Array;
            mat4.scale(bm, [0.16, 0.16, 0.16], bm);
            writeUniforms(this.bulletUBs[i], mat4.multiply(vp, bm) as Float32Array, [1, 0.15, 0.1, 1]);
        }

        for (let i = 0; i < Math.min(mageProjectiles.length, MAX_MAGE_BULLETS); i++) {
            const mp = mageProjectiles[i];
            const bm = mat4.translation([mp.x, mp.y, mp.z]) as Float32Array;
            mat4.scale(bm, [0.22, 0.22, 0.22], bm);
            writeUniforms(this.mageUBs[i], mat4.multiply(vp, bm) as Float32Array, [0.1, 0.4, 1.0, 1.0]);
        }
    }

    draw(
        pass:            GPURenderPassEncoder,
        bullets:         Projectile[],
        mageProjectiles: MageProjectile[],
        cubeVB:          GPUBuffer,
        cubeIB:          GPUBuffer,
        cubeIndexCount:  number,
    ): void {
        pass.setPipeline(this.renderer.flatPipeline);
        pass.setVertexBuffer(0, cubeVB);
        pass.setIndexBuffer(cubeIB, 'uint16');

        for (let i = 0; i < Math.min(mageProjectiles.length, MAX_MAGE_BULLETS); i++) {
            pass.setBindGroup(0, this.mageBGs[i]);
            pass.drawIndexed(cubeIndexCount);
        }

        for (let i = 0; i < Math.min(bullets.length, MAX_PLAYER_BULLETS); i++) {
            pass.setBindGroup(0, this.bulletBGs[i]);
            pass.drawIndexed(cubeIndexCount);
        }
    }
}