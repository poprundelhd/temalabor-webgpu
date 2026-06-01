import { mat4 } from 'wgpu-matrix';
import type { GameRenderer } from './GameRenderer';
import type { WorldManager } from '../world/WorldManager';
import type { PickupSystem } from '../systems/PickupSystem';
import type { EnemyRenderer } from './EnemyRenderer';
import type { ProjectileRenderer } from './ProjectileRenderer';
import type { Player } from '../player/Player';
import type { Enemy } from '../enemies/Enemy';
import type { MageProjectile } from '../projectiles/MageProjectile';
import type { GltfModel } from '../../engine/assets/gltf-loader';
import { GltfLoader } from '../../engine/assets/gltf-loader';
import { GROUND_SIZE, SWAY_STRENGTH, SWAY_MAX, SWAY_RETURN } from '../config/gameplay';

type UBEntry = { ub: GPUBuffer; bg: GPUBindGroup };

export class SceneRenderer {
    private gr:     GameRenderer;
    private device: GPUDevice;
    private world:  WorldManager;
    private pickup: PickupSystem;
    private enemyR: EnemyRenderer;
    private projR:  ProjectileRenderer;

    private cubeVB:   GPUBuffer;
    private cubeIB:   GPUBuffer;
    private cubeIdxCount: number;
    private groundVB: GPUBuffer;
    private groundIB: GPUBuffer;
    private groundIdxCount: number;
    private groundUB: GPUBuffer;
    private groundBG: GPUBindGroup;

    private weaponModels:   GltfModel[][] = [[], []];
    private weaponUBCaches: UBEntry[][]   = [[], []];
    private weaponLoaded:   boolean[]     = [false, false];

    private prevYaw   = 0;
    private prevPitch = 0;
    private swayX     = 0;
    private swayY     = 0;

    constructor(
        gr: GameRenderer, device: GPUDevice,
        world: WorldManager, pickup: PickupSystem,
        enemyR: EnemyRenderer, projR: ProjectileRenderer,
    ) {
        this.gr = gr; this.device = device;
        this.world = world; this.pickup = pickup;
        this.enemyR = enemyR; this.projR = projR;

        const rd = gr.rd;

        const cubeVertices = new Float32Array([
            -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
            -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5,  0.5, -0.5,  -0.5,  0.5, -0.5,
        ]);
        const cubeIndices = new Uint16Array([
            0,1,2, 0,2,3,   4,6,5, 4,7,6,
            4,5,1, 4,1,0,   3,2,6, 3,6,7,
            1,5,6, 1,6,2,   4,0,3, 4,3,7,
        ]);
        const groundVertices = new Float32Array([
            -GROUND_SIZE, 0,  GROUND_SIZE,
             GROUND_SIZE, 0,  GROUND_SIZE,
             GROUND_SIZE, 0, -GROUND_SIZE,
            -GROUND_SIZE, 0, -GROUND_SIZE,
        ]);
        const groundIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        this.cubeVB = rd.createVertexBuffer(cubeVertices);
        this.cubeIB = rd.createIndexBuffer(cubeIndices);
        this.cubeIdxCount = cubeIndices.length;
        this.groundVB = rd.createVertexBuffer(groundVertices);
        this.groundIB = rd.createIndexBuffer(groundIndices);
        this.groundIdxCount = groundIndices.length;

        this.groundUB = rd.createUniformBuffer(256);
        this.groundBG = gr.makeGroundBG(this.groundUB);

        const canvas = gr.context.canvas as HTMLCanvasElement;
        new ResizeObserver(() => {
            canvas.width  = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            gr.rd.resizeDepth();
        }).observe(canvas);
    }

    async loadWeapons(weaponUrls: string[]): Promise<void> {
        const loader = new GltfLoader(this.device);
        const tex = await this.loadWeaponTexture();
        weaponUrls.forEach((url, i) => {
            loader.load(url).then(models => {
                this.weaponModels[i]   = models;
                this.weaponUBCaches[i] = this.buildWeaponCache(models, tex);
                this.weaponLoaded[i]   = true;
                console.log(`${url} betöltve`);
            }).catch(err => console.error(`Fegyver betöltési hiba (${url}):`, err));
        });
    }

    private async loadWeaponTexture(): Promise<GPUTexture | null> {
        try {
            const resp = await fetch('/models/weapon/Textures/variation-a.png');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const ct      = resp.headers.get('content-type') ?? '';
            const rawBlob = await resp.blob();
            const blob    = ct.startsWith('image/') ? rawBlob
                : new Blob([await rawBlob.arrayBuffer()], { type: 'image/png' });
            const bitmap  = await createImageBitmap(blob);
            const texture = this.device.createTexture({
                size: [bitmap.width, bitmap.height, 1],
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            });
            this.device.queue.copyExternalImageToTexture(
                { source: bitmap, flipY: false }, { texture }, [bitmap.width, bitmap.height]);
            bitmap.close();
            return texture;
        } catch (e) {
            console.warn('Fegyver textúra betöltési hiba:', e);
            return null;
        }
    }

    private buildWeaponCache(models: GltfModel[], tex: GPUTexture | null): UBEntry[] {
        const cache: UBEntry[] = [];
        for (const model of models) {
            for (const prim of model.primitives) {
                const ub = this.gr.makeGltfUB();
                cache.push({ ub, bg: this.gr.makeWeaponBG(ub, tex ?? prim.texture, prim.sampler) });
            }
        }
        return cache;
    }

    renderFrame(
        dt: number,
        player: Player,
        enemies: Enemy[],
        mageIndices: Set<number>,
        mageProjectiles: MageProjectile[],
        isBlocking: boolean,
    ): void {
        const device = this.device;
        const gr     = this.gr;
        const body   = player.body;
        const canvas = gr.context.canvas as HTMLCanvasElement;
        const depthTexture = gr.rd.depth;

        const aspect = canvas.width / canvas.height;
        const view   = body.getViewMatrix();
        const proj   = body.getProjectionMatrix(aspect);
        const vp     = mat4.multiply(proj, view) as Float32Array;

        const writeUniforms = (ub: GPUBuffer, mvp: Float32Array, color: [number,number,number,number]) =>
            gr.writeFlatUniforms(ub, mvp, color);

        const yawDelta   = body.yaw   - this.prevYaw;
        const pitchDelta = body.pitch - this.prevPitch;
        this.prevYaw   = body.yaw;
        this.prevPitch = body.pitch;
        this.swayX += (Math.max(-SWAY_MAX, Math.min(SWAY_MAX, -yawDelta   * SWAY_STRENGTH)) - this.swayX) * Math.min(1, SWAY_RETURN * dt);
        this.swayY += (Math.max(-SWAY_MAX, Math.min(SWAY_MAX,  pitchDelta * SWAY_STRENGTH)) - this.swayY) * Math.min(1, SWAY_RETURN * dt);

        writeUniforms(this.groundUB, vp, [0.25, 0.45, 0.15, 1.0]);
        this.world.updateUniforms(vp);
        this.pickup.updateUniforms(vp);
        this.enemyR.updateUniforms(vp, enemies, mageIndices, body.position[0], body.position[2]);
        const bullets = player.weapon.projectiles;
        this.projR.updateUniforms(vp, bullets, mageProjectiles, writeUniforms);

        const wi = player.weapon.activeWeaponIndex;
        if (this.weaponLoaded[wi]) {
            const weaponProj = body.getProjectionMatrix(aspect);
            const weaponView = mat4.identity() as Float32Array;
            if (isBlocking) {
                mat4.translate(weaponView, [0.0, -0.15, -0.5], weaponView);
                mat4.rotateZ(weaponView, Math.PI * 0.5, weaponView);
                mat4.rotateY(weaponView, Math.PI * 0.5, weaponView);
                mat4.scale(weaponView, [0.7, 0.7, 0.7], weaponView);
            } else {
                mat4.translate(weaponView, [0.35 + this.swayX, -0.3 + this.swayY, -0.6], weaponView);
                mat4.rotateY(weaponView, Math.PI * 0.05, weaponView);
                mat4.scale(weaponView, [0.7, 0.7, 0.7], weaponView);
            }
            let ci = 0;
            for (const model of this.weaponModels[wi]) {
                const combined = mat4.multiply(weaponView, model.modelMatrix) as Float32Array;
                const mvp      = mat4.multiply(weaponProj, combined) as Float32Array;
                for (const prim of model.primitives) {
                    gr.writeGltfUniforms(this.weaponUBCaches[wi][ci].ub, mvp, combined, prim.baseColor);
                    ci++;
                }
            }
        }

        const enc  = device.createCommandEncoder();
        const pass = gr.beginMainPass(enc, depthTexture);

        pass.setPipeline(gr.skyPipeline);
        pass.draw(6);

        pass.setPipeline(gr.flatPipeline);
        this.enemyR.draw(pass, enemies, mageIndices);
        this.projR.draw(pass, bullets, mageProjectiles, this.cubeVB, this.cubeIB, this.cubeIdxCount);

        pass.setPipeline(gr.groundPipeline);
        pass.setBindGroup(0, this.groundBG);
        pass.setVertexBuffer(0, this.groundVB);
        pass.setIndexBuffer(this.groundIB, 'uint16');
        pass.drawIndexed(this.groundIdxCount);

        this.world.draw(pass);
        this.pickup.draw(pass);

        pass.end();

        if (this.weaponLoaded[wi]) {
            const weaponPass = gr.beginWeaponPass(enc, depthTexture);
            weaponPass.setPipeline(gr.weaponPipeline);
            let ci = 0;
            for (const model of this.weaponModels[wi]) {
                for (const prim of model.primitives) {
                    const { bg } = this.weaponUBCaches[wi][ci++];
                    weaponPass.setBindGroup(0, bg);
                    weaponPass.setVertexBuffer(0, prim.vertexBuffer);
                    if (prim.indexBuffer) {
                        weaponPass.setIndexBuffer(prim.indexBuffer, prim.indexFormat);
                        weaponPass.drawIndexed(prim.indexCount);
                    } else {
                        weaponPass.draw(prim.vertexCount);
                    }
                }
            }
            weaponPass.end();
        }

        device.queue.submit([enc.finish()]);
    }
}
