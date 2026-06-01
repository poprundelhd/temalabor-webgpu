import { GltfLoader } from '../../engine/assets/gltf-loader';
import type { GltfModel } from '../../engine/assets/gltf-loader';
import type { GameRenderer } from '../render/GameRenderer';
import type { GameSystem } from '../core/GameSystem';
import type { GameContext } from '../core/GameContext';
import { mat4 } from 'wgpu-matrix';

const PICKUP_SCALE  = 3;
const PICKUP_RADIUS = 0.8 * PICKUP_SCALE;

export class PickupSystem implements GameSystem {
    private renderer:  GameRenderer;
    private models:    GltfModel[] = [];
    private ubCache:   Array<{ ub: GPUBuffer; bg: GPUBindGroup }> = [];
    loaded  = false;
    visible = false;

    pos: [number, number, number] = [0, 1, 0];

    private rotAngle = 0;

    constructor(renderer: GameRenderer, device: GPUDevice) {
        this.renderer = renderer;
        const loader  = new GltfLoader(device);

        loader.load('/models/powerups/burger.glb').then(models => {
            this.models = models;
            for (const model of models) {
                for (const prim of model.primitives) {
                    const ub = renderer.makeGltfUB();
                    this.ubCache.push({ ub, bg: renderer.makeGltfBG(ub, prim.texture, prim.sampler) });
                }
            }
            this.loaded = true;
            console.log('[PickupManager] burger.glb betöltve');
        }).catch(err => console.error('[PickupManager] Betöltési hiba:', err));
    }

    spawn(pos: [number, number, number]): void {
        this.pos     = pos;
        this.visible = true;
        this.rotAngle = 0;
        console.log(`[PickupManager] Burger megjelent: ${pos}`);
    }

    hide(): void {
        this.visible = false;
    }

    update(dt: number, ctx: GameContext): void {
        if (!this.visible || !this.loaded) return;

        this.rotAngle += dt * 1.5;

        const px = ctx.player.body.position[0];
        const pz = ctx.player.body.position[2];
        const dx   = px - this.pos[0];
        const dz   = pz - this.pos[2];
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist < PICKUP_RADIUS) {
            ctx.player.heal(1);
            this.visible = false;
            console.log('[PickupSystem] HP pickup! +1 HP');
        }
    }

    updateUniforms(vp: Float32Array): void {
        if (!this.visible || !this.loaded) return;

        const [bx, by, bz] = this.pos;
        const inst = mat4.translation([bx, by, bz]) as Float32Array;
        mat4.rotateY(inst, this.rotAngle, inst);
        mat4.scale(inst, [PICKUP_SCALE, PICKUP_SCALE, PICKUP_SCALE], inst);

        let ci = 0;
        for (const model of this.models) {
            const combined = mat4.multiply(inst, model.modelMatrix) as Float32Array;
            const mvp      = mat4.multiply(vp, combined) as Float32Array;
            for (const prim of model.primitives) {
                this.renderer.writeGltfUniforms(this.ubCache[ci].ub, mvp, combined, prim.baseColor);
                ci++;
            }
        }
    }

    draw(pass: GPURenderPassEncoder): void {
        if (!this.visible || !this.loaded) return;

        pass.setPipeline(this.renderer.gltfPipeline);
        let ci = 0;
        for (const model of this.models) {
            for (const prim of model.primitives) {
                const { bg } = this.ubCache[ci++];
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