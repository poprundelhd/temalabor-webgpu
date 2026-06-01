import { GltfLoader } from '../../engine/assets/gltf-loader';
import type { GltfModel } from '../../engine/assets/gltf-loader';
import type { AABB } from '../../engine/physics/aabb';
import type { GameRenderer } from '../render/GameRenderer';
import { mat4 } from 'wgpu-matrix';

const GROUND_SIZE = 50;

interface GltfInstance {
    models:  GltfModel[];
    ubCache: Array<Array<{ ub: GPUBuffer; bg: GPUBindGroup }>>;
    loaded:  boolean;
}

export interface WorldObject {
    pos:   [number, number, number];
    scale: number;
}

export class WorldManager {
    private renderer: GameRenderer;
    private loader:   GltfLoader;
    readonly colliders: AABB[] = [];

    readonly TREE_COUNT  = 20;
    readonly TREE_SCALE  = 8;
    readonly TREE_MARGIN = 5;

    treePositions: [number, number, number, number][] = [];
    treeTypes:     ('oak' | 'pine')[] = [];
    treeOak:       GltfInstance = { models: [], ubCache: [], loaded: false };
    treePine:      GltfInstance = { models: [], ubCache: [], loaded: false };
    treeLoaded = false;

    readonly GRASS_COUNT  = 200;
    readonly GRASS_SCALE  = 5;
    readonly GRASS_MARGIN = 3;

    grassPositions:      [number, number, number][] = [];
    grassLeafPositions:  [number, number, number][] = [];
    grassScales:         number[] = [];
    grassLeafScales:     number[] = [];
    grassBase:   GltfInstance = { models: [], ubCache: [], loaded: false };
    grassLeaf:   GltfInstance = { models: [], ubCache: [], loaded: false };
    grassLoaded = false;

    readonly STONE_COUNT    = 15;
    readonly STONE_MARGIN   = 3;
    readonly STONE_MIN_TREE = 4;

    stonePositions: [number, number, number, number][] = [];
    stone: GltfInstance = { models: [], ubCache: [], loaded: false };
    stoneLoaded = false;

    readonly WALL_UNIT  = 4;
    readonly WALL_SCALE = 1;
    readonly BORDER     = GROUND_SIZE;

    wallTransforms: [number, number, number, number][] = [];
    wall: GltfInstance = { models: [], ubCache: [], loaded: false };
    wallLoaded = false;

    readonly GRAVESTONE_SCALE = 3;
    gravestonePos: [number, number, number];
    gravestone: GltfInstance = { models: [], ubCache: [], loaded: false };
    gravestoneLoaded = false;

    readonly BARREL_SCALE = 3;
    barrelPos: [number, number, number];
    barrel: GltfInstance = { models: [], ubCache: [], loaded: false };
    barrelLoaded = false;

    constructor(renderer: GameRenderer, device: GPUDevice) {
        this.renderer = renderer;
        this.loader   = new GltfLoader(device);

        this.gravestonePos = this.randomPos(5);
        this.barrelPos     = this.randomPos(5);

        this.generateTrees();
        this.generateGrass();
        this.generateStones();
        this.generateWalls();
    }

    private randomPos(margin: number): [number, number, number] {
        return [
            (Math.random() * 2 - 1) * (GROUND_SIZE - margin),
            0,
            (Math.random() * 2 - 1) * (GROUND_SIZE - margin),
        ];
    }

    private generateTrees(): void {
        this.treePositions = Array.from({ length: this.TREE_COUNT }, () => [
            (Math.random() * 2 - 1) * (GROUND_SIZE - this.TREE_MARGIN),
            0,
            (Math.random() * 2 - 1) * (GROUND_SIZE - this.TREE_MARGIN),
            this.TREE_SCALE,
        ]);
        this.treeTypes = this.treePositions.map(() =>
            Math.random() < 0.3 ? 'pine' : 'oak'
        );

        for (const [tx, ty, tz, scale] of this.treePositions) {
            const half   = Math.min(0.3 * scale, 0.5);
            const height = Math.min(3.0 * scale, 2.0);
            this.colliders.push({ minX: tx-half, maxX: tx+half, minY: ty, maxY: ty+height, minZ: tz-half, maxZ: tz+half });
        }
    }

    private generateGrass(): void {
        this.grassPositions = Array.from({ length: this.GRASS_COUNT }, () => [
            (Math.random() * 2 - 1) * (GROUND_SIZE - this.GRASS_MARGIN),
            0,
            (Math.random() * 2 - 1) * (GROUND_SIZE - this.GRASS_MARGIN),
        ]);
        const OFFSET = 0.3;
        this.grassLeafPositions = this.grassPositions.map(([x,,z]) => [
            x + (Math.random() * 2 - 1) * OFFSET,
            0,
            z + (Math.random() * 2 - 1) * OFFSET,
        ]);
        this.grassScales     = this.grassPositions.map(() => this.GRASS_SCALE * (0.8 + Math.random() * 0.4));
        this.grassLeafScales = this.grassPositions.map(() => this.GRASS_SCALE * (0.8 + Math.random() * 0.4));
    }

    private generateStones(): void {
        let attempts = 0;
        while (this.stonePositions.length < this.STONE_COUNT && attempts < 1000) {
            attempts++;
            const sx = (Math.random() * 2 - 1) * (GROUND_SIZE - this.STONE_MARGIN);
            const sz = (Math.random() * 2 - 1) * (GROUND_SIZE - this.STONE_MARGIN);
            const tooClose = this.treePositions.some(([tx,,tz]) => {
                const dx = sx-tx, dz = sz-tz;
                return Math.sqrt(dx*dx+dz*dz) < this.STONE_MIN_TREE;
            });
            if (!tooClose) this.stonePositions.push([sx, 0, sz, 2 + Math.random() * 2]);
        }
    }

    private generateWalls(): void {
        const wallCount = Math.ceil((this.BORDER * 2) / this.WALL_UNIT);
        for (let i = 0; i < wallCount; i++) {
            const off = -this.BORDER + i * this.WALL_UNIT + this.WALL_UNIT / 2;
            this.wallTransforms.push([off, 0, -this.BORDER, Math.PI]);
            this.wallTransforms.push([off, 0,  this.BORDER, 0]);
            this.wallTransforms.push([-this.BORDER, 0, off, -Math.PI / 2]);
            this.wallTransforms.push([ this.BORDER, 0, off,  Math.PI / 2]);
        }
        const T = 0.5, H = 4.0;
        for (const [wx,,wz,rotY] of this.wallTransforms) {
            const isNS = Math.abs(rotY) < 0.1 || Math.abs(Math.abs(rotY) - Math.PI) < 0.1;
            if (isNS) this.colliders.push({ minX: wx-this.WALL_UNIT/2, maxX: wx+this.WALL_UNIT/2, minY:0, maxY:H, minZ: wz-T, maxZ: wz+T });
            else       this.colliders.push({ minX: wx-T, maxX: wx+T, minY:0, maxY:H, minZ: wz-this.WALL_UNIT/2, maxZ: wz+this.WALL_UNIT/2 });
        }
    }

    private buildCache(models: GltfModel[], count: number): Array<Array<{ ub: GPUBuffer; bg: GPUBindGroup }>> {
        return Array.from({ length: count }, () =>
            models.flatMap(m => m.primitives.map(p => {
                const ub = this.renderer.makeGltfUB();
                return { ub, bg: this.renderer.makeGltfBG(ub, p.texture, p.sampler) };
            }))
        );
    }

    async loadAll(): Promise<void> {
        Promise.all([
            this.loader.load('/models/terrain/nature/tree_oak.glb'),
            this.loader.load('/models/terrain/nature/tree_pineDefaultA.glb'),
        ]).then(([oak, pine]) => {
            this.treeOak.models  = oak;
            this.treePine.models = pine;
            for (let t = 0; t < this.treePositions.length; t++) {
                const models = this.treeTypes[t] === 'pine' ? this.treePine.models : this.treeOak.models;
                this.treeOak.ubCache.push(this.buildCache(models, 1)[0]);
            }
            this.treeLoaded = true;
            console.log(`[WorldManager] Fák betöltve – ${this.treePositions.length} példány`);
        });

        Promise.all([
            this.loader.load('/models/terrain/nature/grass.glb'),
            this.loader.load('/models/terrain/nature/grass_leafsLarge.glb'),
        ]).then(([base, leaf]) => {
            this.grassBase.models = base;
            this.grassLeaf.models = leaf;
            for (let g = 0; g < this.grassPositions.length; g++) {
                this.grassBase.ubCache.push(this.buildCache(base, 1)[0]);
                this.grassLeaf.ubCache.push(this.buildCache(leaf, 1)[0]);
            }
            this.grassLoaded = true;
            console.log(`[WorldManager] Fű betöltve – ${this.grassPositions.length} példány`);
        });

        this.loader.load('/models/terrain/nature/stone_tallA.glb').then(models => {
            this.stone.models  = models;
            this.stone.ubCache = this.buildCache(models, this.stonePositions.length);
            for (const [sx,,sz,scale] of this.stonePositions) {
                const half   = Math.min(0.4 * scale, 1.2);
                const height = Math.min(1.5 * scale, 2.0);
                this.colliders.push({ minX: sx-half, maxX: sx+half, minY:0, maxY:height, minZ: sz-half, maxZ: sz+half });
            }
            this.stoneLoaded = true;
            console.log(`[WorldManager] Kövek betöltve – ${this.stonePositions.length} példány`);
        });

        this.loader.load('/models/wall/template-wall.glb').then(models => {
            this.wall.models  = models;
            this.wall.ubCache = this.buildCache(models, this.wallTransforms.length);
            this.wallLoaded = true;
            console.log(`[WorldManager] Falak betöltve – ${this.wallTransforms.length} példány`);
        });

        this.loader.load('/models/terrain/grave/gravestone-bevel.glb').then(models => {
            this.gravestone.models  = models;
            this.gravestone.ubCache = this.buildCache(models, 1);
            const s = this.GRAVESTONE_SCALE;
            this.colliders.push({
                minX: this.gravestonePos[0] - 0.4*s, maxX: this.gravestonePos[0] + 0.4*s,
                minY: 0, maxY: Math.min(1.5*s, 2.0),
                minZ: this.gravestonePos[2] - 0.2*s, maxZ: this.gravestonePos[2] + 0.2*s,
            });
            this.gravestoneLoaded = true;
            console.log('[WorldManager] Sírkő betöltve');
        });

        this.loader.load('/models/terrain/barrel/barrel.glb').then(models => {
            this.barrel.models  = models;
            this.barrel.ubCache = this.buildCache(models, 1);
            const s = this.BARREL_SCALE;
            this.colliders.push({
                minX: this.barrelPos[0] - 0.4*s, maxX: this.barrelPos[0] + 0.4*s,
                minY: 0, maxY: 0.8*s,
                minZ: this.barrelPos[2] - 0.4*s, maxZ: this.barrelPos[2] + 0.4*s,
            });
            this.barrelLoaded = true;
            console.log('[WorldManager] Hordó betöltve');
        });
    }

    updateUniforms(vp: Float32Array): void {
        if (this.treeLoaded) {
            for (let t = 0; t < this.treePositions.length; t++) {
                const [tx, ty, tz, tScale] = this.treePositions[t];
                const models = this.treeTypes[t] === 'pine' ? this.treePine.models : this.treeOak.models;
                const inst   = mat4.translation([tx, ty, tz]) as Float32Array;
                mat4.scale(inst, [tScale, tScale, tScale], inst);
                let ci = 0;
                for (const model of models) {
                    const combined = mat4.multiply(inst, model.modelMatrix) as Float32Array;
                    const mvp      = mat4.multiply(vp, combined) as Float32Array;
                    for (const prim of model.primitives) {
                        this.renderer.writeGltfUniforms(this.treeOak.ubCache[t][ci].ub, mvp, combined, prim.baseColor);
                        ci++;
                    }
                }
            }
        }

        if (this.grassLoaded) {
            for (let g = 0; g < this.grassPositions.length; g++) {
                const [gx, gy, gz] = this.grassPositions[g];
                const gs   = this.grassScales[g];
                const inst = mat4.translation([gx, gy, gz]) as Float32Array;
                mat4.scale(inst, [gs, gs, gs], inst);
                let ci = 0;
                for (const model of this.grassBase.models) {
                    const combined = mat4.multiply(inst, model.modelMatrix) as Float32Array;
                    const mvp      = mat4.multiply(vp, combined) as Float32Array;
                    for (const prim of model.primitives) {
                        this.renderer.writeGltfUniforms(this.grassBase.ubCache[g][ci].ub, mvp, combined, prim.baseColor);
                        ci++;
                    }
                }
                const [lx, ly, lz] = this.grassLeafPositions[g];
                const ls    = this.grassLeafScales[g];
                const instL = mat4.translation([lx, ly, lz]) as Float32Array;
                mat4.scale(instL, [ls, ls, ls], instL);
                let cli = 0;
                for (const model of this.grassLeaf.models) {
                    const combined = mat4.multiply(instL, model.modelMatrix) as Float32Array;
                    const mvp      = mat4.multiply(vp, combined) as Float32Array;
                    for (const prim of model.primitives) {
                        this.renderer.writeGltfUniforms(this.grassLeaf.ubCache[g][cli].ub, mvp, combined, prim.baseColor);
                        cli++;
                    }
                }
            }
        }

        if (this.stoneLoaded) {
            for (let s = 0; s < this.stonePositions.length; s++) {
                const [sx, sy, sz, sScale] = this.stonePositions[s];
                const inst = mat4.translation([sx, sy, sz]) as Float32Array;
                mat4.scale(inst, [sScale, sScale, sScale], inst);
                let ci = 0;
                for (const model of this.stone.models) {
                    const combined = mat4.multiply(inst, model.modelMatrix) as Float32Array;
                    const mvp      = mat4.multiply(vp, combined) as Float32Array;
                    for (const prim of model.primitives) {
                        this.renderer.writeGltfUniforms(this.stone.ubCache[s][ci].ub, mvp, combined, prim.baseColor);
                        ci++;
                    }
                }
            }
        }

        if (this.wallLoaded) {
            for (let w = 0; w < this.wallTransforms.length; w++) {
                const [wx, wy, wz, rotY] = this.wallTransforms[w];
                const inst = mat4.translation([wx, wy, wz]) as Float32Array;
                mat4.rotateY(inst, rotY, inst);
                mat4.scale(inst, [this.WALL_SCALE, this.WALL_SCALE, this.WALL_SCALE], inst);
                let ci = 0;
                for (const model of this.wall.models) {
                    const combined = mat4.multiply(inst, model.modelMatrix) as Float32Array;
                    const mvp      = mat4.multiply(vp, combined) as Float32Array;
                    for (const prim of model.primitives) {
                        this.renderer.writeGltfUniforms(this.wall.ubCache[w][ci].ub, mvp, combined, prim.baseColor);
                        ci++;
                    }
                }
            }
        }

        if (this.gravestoneLoaded) {
            const [gx, gy, gz] = this.gravestonePos;
            const s    = this.GRAVESTONE_SCALE;
            const inst = mat4.translation([gx, gy, gz]) as Float32Array;
            mat4.scale(inst, [s, s, s], inst);
            let ci = 0;
            for (const model of this.gravestone.models) {
                const combined = mat4.multiply(inst, model.modelMatrix) as Float32Array;
                const mvp      = mat4.multiply(vp, combined) as Float32Array;
                for (const prim of model.primitives) {
                    this.renderer.writeGltfUniforms(this.gravestone.ubCache[0][ci].ub, mvp, combined, prim.baseColor);
                    ci++;
                }
            }
        }

        if (this.barrelLoaded) {
            const [bx, by, bz] = this.barrelPos;
            const s    = this.BARREL_SCALE;
            const inst = mat4.translation([bx, by, bz]) as Float32Array;
            mat4.scale(inst, [s, s, s], inst);
            let ci = 0;
            for (const model of this.barrel.models) {
                const combined = mat4.multiply(inst, model.modelMatrix) as Float32Array;
                const mvp      = mat4.multiply(vp, combined) as Float32Array;
                for (const prim of model.primitives) {
                    this.renderer.writeGltfUniforms(this.barrel.ubCache[0][ci].ub, mvp, combined, prim.baseColor);
                    ci++;
                }
            }
        }
    }

    draw(pass: GPURenderPassEncoder): void {
        const { gltfPipeline } = this.renderer;
        pass.setPipeline(gltfPipeline);

        const drawInstance = (inst: Pick<GltfInstance, 'models' | 'ubCache'>, idx: number) => {
            let ci = 0;
            for (const model of inst.models) {
                for (const prim of model.primitives) {
                    const { bg } = inst.ubCache[idx][ci++];
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
        };

        if (this.treeLoaded) {
            for (let t = 0; t < this.treePositions.length; t++) {
                const inst = this.treeTypes[t] === 'pine'
                    ? { models: this.treePine.models, ubCache: this.treeOak.ubCache }
                    : { models: this.treeOak.models,  ubCache: this.treeOak.ubCache };
                drawInstance(inst, t);
            }
        }

        if (this.grassLoaded) {
            for (let g = 0; g < this.grassPositions.length; g++) {
                drawInstance(this.grassBase, g);
                drawInstance(this.grassLeaf, g);
            }
        }

        if (this.stoneLoaded) {
            for (let s = 0; s < this.stonePositions.length; s++) drawInstance(this.stone, s);
        }

        if (this.wallLoaded) {
            for (let w = 0; w < this.wallTransforms.length; w++) drawInstance(this.wall, w);
        }

        if (this.gravestoneLoaded) drawInstance(this.gravestone, 0);

        if (this.barrelLoaded) drawInstance(this.barrel, 0);
    }
}