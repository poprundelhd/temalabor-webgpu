export interface MeshPrimitive {
    vertexBuffer: GPUBuffer;
    indexBuffer:  GPUBuffer | null;
    indexCount:   number;
    indexFormat:  GPUIndexFormat;
    vertexCount:  number;
    baseColor:    [number, number, number, number];
    texture:      GPUTexture;
    sampler:      GPUSampler;
}

export class Mesh {
    primitives: MeshPrimitive[] = [];

    static fromGltfModels(models: any[]): Mesh {
        const mesh = new Mesh();
        for (const model of models) {
            for (const prim of model.primitives) {
                mesh.primitives.push({
                    vertexBuffer: prim.vertexBuffer,
                    indexBuffer:  prim.indexBuffer  ?? null,
                    indexCount:   prim.indexCount   ?? 0,
                    indexFormat:  prim.indexFormat  ?? 'uint16',
                    vertexCount:  prim.vertexCount  ?? 0,
                    baseColor:    prim.baseColor,
                    texture:      prim.texture,
                    sampler:      prim.sampler,
                });
            }
        }
        return mesh;
    }

    draw(pass: GPURenderPassEncoder): void {
        for (const prim of this.primitives) {
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