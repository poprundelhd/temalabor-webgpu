import { GltfLoader } from '../../engine/assets/gltf-loader';
import type { GltfModel } from '../../engine/assets/gltf-loader';
import type { GameRenderer } from './GameRenderer';
import type { Enemy } from '../enemies/Enemy';
import { mat4 } from 'wgpu-matrix';

const SKELETON_SCALE = 1;
const MAGE_SCALE     = 1;
const MAX_ENEMIES    = 20;

export class EnemyRenderer {
    private renderer: GameRenderer;

    private skeletonModels:  GltfModel[] = [];
    private skeletonCache:   Array<Array<{ ub: GPUBuffer; bg: GPUBindGroup }>> = [];
    skeletonLoaded = false;

    private mageModels:  GltfModel[] = [];
    private mageCache:   Array<Array<{ ub: GPUBuffer; bg: GPUBindGroup }>> = [];
    mageLoaded = false;

    animTime = 0;

    constructor(renderer: GameRenderer, device: GPUDevice) {
        this.renderer = renderer;
        const loader  = new GltfLoader(device);

        loader.load('/models/enemy/Skeleton_Minion.glb').then(models => {
            this.skeletonModels = models;
            for (let i = 0; i < MAX_ENEMIES; i++) {
                this.skeletonCache.push(this.buildCache(models));
            }
            this.skeletonLoaded = true;
            console.log('[EnemyRenderer] Skeleton_Minion.glb betöltve');
        }).catch(err => console.error('[EnemyRenderer] Skeleton hiba:', err));

        loader.load('/models/enemy/Skeleton_Mage.glb').then(models => {
            this.mageModels = models;
            for (let i = 0; i < MAX_ENEMIES; i++) {
                this.mageCache.push(this.buildCache(models));
            }
            this.mageLoaded = true;
            console.log('[EnemyRenderer] Skeleton_Mage.glb betöltve');
        }).catch(err => console.error('[EnemyRenderer] Mage hiba:', err));
    }

    private buildCache(models: GltfModel[]): Array<{ ub: GPUBuffer; bg: GPUBindGroup }> {
        return models.flatMap(m => m.primitives.map(p => {
            const ub = this.renderer.makeGltfUB();
            return { ub, bg: this.renderer.makeGltfBG(ub, p.texture, p.sampler) };
        }));
    }

    update(dt: number): void {
        this.animTime += dt;
    }

    updateUniforms(
        vp:           Float32Array,
        enemies:      Enemy[],
        mageIndices:  Set<number>,
        cameraX:      number,
        cameraZ:      number,
    ): void {
        for (let i = 0; i < enemies.length; i++) {
            const be = enemies[i];
            if (be.dead) continue;

            const isMage   = mageIndices.has(i);
            const models   = isMage ? this.mageModels   : this.skeletonModels;
            const cache    = isMage ? this.mageCache     : this.skeletonCache;
            const isLoaded = isMage ? this.mageLoaded    : this.skeletonLoaded;
            const scale    = isMage ? MAGE_SCALE         : SKELETON_SCALE;
            if (!isLoaded || models.length === 0) continue;

            const dx    = cameraX - be.x;
            const dz    = cameraZ - be.z;
            const angle = Math.atan2(dx, dz);
            const bobY  = Math.sin(this.animTime * 6 + i * 1.3) * 0.06;
            const inst  = mat4.translation([be.x, bobY, be.z]) as Float32Array;
            mat4.rotateY(inst, angle, inst);
            mat4.scale(inst, [scale, scale, scale], inst);

            const flashColor: [number,number,number,number] | null =
                be.flashTimer > 0 ? [1.0, 0.0, 0.0, 1.0] : null;

            let ci = 0;
            for (const model of models) {
                const combined = mat4.multiply(inst, model.modelMatrix) as Float32Array;
                const mvp      = mat4.multiply(vp, combined) as Float32Array;
                for (const prim of model.primitives) {
                    this.renderer.writeGltfUniforms(
                        cache[i][ci].ub, mvp, combined,
                        flashColor ?? prim.baseColor,
                    );
                    ci++;
                }
            }
        }
    }

    draw(pass: GPURenderPassEncoder, enemies: Enemy[], mageIndices: Set<number>): void {
        if (!this.skeletonLoaded && !this.mageLoaded) return;

        pass.setPipeline(this.renderer.gltfPipeline);

        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].dead) continue;
            const isMage   = mageIndices.has(i);
            const models   = isMage ? this.mageModels   : this.skeletonModels;
            const cache    = isMage ? this.mageCache     : this.skeletonCache;
            const isLoaded = isMage ? this.mageLoaded    : this.skeletonLoaded;
            if (!isLoaded) continue;

            let ci = 0;
            for (const model of models) {
                for (const prim of model.primitives) {
                    const { bg } = cache[i][ci++];
                    pass.setBindGroup(0, bg);
                    pass.setVertexBuffer(0, prim.vertexBuffer);
                    if (prim.indexBuffer) {
                        pass.setIndexBuffer(prim.indexBuffer, prim.indexFormat);
                        pass.drawIndexed(prim.indexCount);
                    } else {
                        pass.draw(prim.vertexCount);
                    }
                }
            }
        }
    }
}