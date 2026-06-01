import { mat4, quat, vec3 } from 'wgpu-matrix';

export interface GltfPrimitive {
    vertexBuffer : GPUBuffer;
    indexBuffer  : GPUBuffer | null;
    indexCount   : number;
    vertexCount  : number;
    indexFormat  : GPUIndexFormat;
    baseColor    : [number, number, number, number];
    texture      : GPUTexture;
    sampler      : GPUSampler;
}

export interface GltfModel {
    primitives  : GltfPrimitive[];
    modelMatrix : Float32Array;
}

const COMPONENT_TYPE_SIZE: Record<number, number> = {
    5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4,
};

const TYPE_COUNT: Record<string, number> = {
    SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16,
};

export class GltfLoader {
    private device       : GPUDevice;
    private whiteTexture : GPUTexture;
    private defaultSampler: GPUSampler;

    constructor(device: GPUDevice) {
        this.device = device;

        // 1×1 feher fallback ha nem tolt be a texture
        this.whiteTexture = device.createTexture({
            size: [1, 1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        device.queue.writeTexture(
            { texture: this.whiteTexture },
            new Uint8Array([255, 255, 255, 255]),
            { bytesPerRow: 4 },
            [1, 1, 1],
        );

        this.defaultSampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
        });
    }

    async load(url: string): Promise<GltfModel[]> {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`GLB betöltési hiba: ${resp.status} ${url}`);
        const buffer = await resp.arrayBuffer();
        return this.parseGlb(buffer, url);
    }

    async loadGltf(url: string): Promise<GltfModel[]> {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`glTF betöltési hiba: ${resp.status} ${url}`);
        const gltf = await resp.json();

        const buffers: ArrayBuffer[] = [];
        for (const buf of (gltf.buffers ?? [])) {
            if (buf.uri?.startsWith('data:')) {
                buffers.push(this.decodeBase64(buf.uri));
            } else {
                const binUrl  = new URL(buf.uri, url).href;
                const binResp = await fetch(binUrl);
                buffers.push(await binResp.arrayBuffer());
            }
        }

        const textures = await this.loadImages(gltf, url, null);

        return this.parseGltf(gltf, buffers[0] ?? null, textures);
    }

    private async parseGlb(buffer: ArrayBuffer, url: string): Promise<GltfModel[]> {
        const view = new DataView(buffer);
        if (view.getUint32(0, true) !== 0x46546C67) throw new Error('Nem érvényes GLB');
        if (view.getUint32(4, true) !== 2)           throw new Error('Csak GLB v2 támogatott');

        const jsonLen  = view.getUint32(12, true);
        const jsonType = view.getUint32(16, true);
        if (jsonType !== 0x4E4F534A) throw new Error('Az első chunk nem JSON');

        const gltf = JSON.parse(new TextDecoder().decode(buffer.slice(20, 20 + jsonLen)));

        let binBuffer: ArrayBuffer | null = null;
        const binOff = 20 + jsonLen;
        if (binOff < buffer.byteLength) {
            const binLen  = view.getUint32(binOff, true);
            const binType = view.getUint32(binOff + 4, true);
            if (binType === 0x004E4942) {
                binBuffer = buffer.slice(binOff + 8, binOff + 8 + binLen);
            }
        }

        const textures = await this.loadImages(gltf, url, binBuffer);

        return this.parseGltf(gltf, binBuffer, textures);
    }

    private async loadImages(
        gltf: any,
        baseUrl: string,
        binBuffer: ArrayBuffer | null,
    ): Promise<GPUTexture[]> {
        const result: GPUTexture[] = [];

        const baseDir = baseUrl.includes('/')
            ? baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1)
            : '/';

        console.log(`[GltfLoader] ${gltf.images?.length ?? 0} kép betöltése, baseDir: ${baseDir}`);

        for (const image of (gltf.images ?? [])) {
            try {
                let blob: Blob;

                if (image.bufferView !== undefined) {
                    const bv     = gltf.bufferViews[image.bufferView];
                    const offset = bv.byteOffset ?? 0;
                    const bytes  = new Uint8Array(binBuffer!, offset, bv.byteLength);
                    blob         = new Blob([bytes], { type: image.mimeType ?? 'image/png' });
                    console.log(`[GltfLoader] Beágyazott kép: bufferView ${image.bufferView}`);

                } else if (image.uri?.startsWith('data:')) {
                    const [header, data] = image.uri.split(',');
                    const mime  = header.match(/:(.*?);/)?.[1] ?? 'image/png';
                    const bin   = atob(data);
                    const bytes = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                    blob = new Blob([bytes], { type: mime });
                    console.log(`[GltfLoader] Base64 kép: ${mime}`);

                } else if (image.uri) {
                    const imgPath = image.uri.startsWith('/')
                        ? image.uri
                        : baseDir + image.uri;
                    console.log(`[GltfLoader] Külső kép: ${imgPath}`);
                    const imgResp = await fetch(imgPath);
                    if (!imgResp.ok) throw new Error(`HTTP ${imgResp.status}: ${imgPath}`);
                    const ct = imgResp.headers.get('content-type') ?? 'ismeretlen';
                    console.log(`[GltfLoader] Content-Type: ${ct}`);
                    const rawBlob = await imgResp.blob();
                    blob = rawBlob.type.startsWith('image/')
                        ? rawBlob
                        : new Blob([await rawBlob.arrayBuffer()], { type: 'image/png' });

                } else {
                    throw new Error('Ismeretlen kép forrás (nincs uri és bufferView)');
                }

                const bitmap = await createImageBitmap(blob);

                if (bitmap.width === 0 || bitmap.height === 0) {
                    bitmap.close();
                    console.warn('[GltfLoader] 0×0-s bitmap, fallback fehér');
                    result.push(this.whiteTexture);
                    continue;
                }

                const texture = this.device.createTexture({
                    size: [bitmap.width, bitmap.height, 1],
                    format: 'rgba8unorm',
                    usage: GPUTextureUsage.TEXTURE_BINDING |
                           GPUTextureUsage.COPY_DST |
                           GPUTextureUsage.RENDER_ATTACHMENT,
                });
                this.device.queue.copyExternalImageToTexture(
                    { source: bitmap, flipY: false },
                    { texture },
                    [bitmap.width, bitmap.height],
                );
                bitmap.close();
                result.push(texture);
                console.log(`[GltfLoader] ✓ Textúra betöltve: ${bitmap.width}×${bitmap.height}`);

            } catch (e) {
                console.warn('[GltfLoader] Textúra betöltési hiba, fallback fehér:', e);
                result.push(this.whiteTexture);
            }
        }

        return result;
    }

    private parseGltf(
        gltf: any,
        binBuffer: ArrayBuffer | null,
        textures: GPUTexture[],
    ): GltfModel[] {
        const models: GltfModel[] = [];
        const scene    = gltf.scene ?? 0;
        const sceneObj = gltf.scenes?.[scene];
        const roots: number[] = sceneObj?.nodes ?? (gltf.meshes?.map((_: any, i: number) => i) ?? []);

        for (const nodeIdx of roots) {
            this.collectNode(gltf, binBuffer, textures, nodeIdx, mat4.identity() as Float32Array, models);
        }
        return models;
    }

    private collectNode(
        gltf: any,
        binBuffer: ArrayBuffer | null,
        textures: GPUTexture[],
        nodeIdx: number,
        parentMatrix: Float32Array,
        out: GltfModel[],
    ): void {
        const node = gltf.nodes?.[nodeIdx];
        if (!node) return;

        const world = mat4.multiply(parentMatrix, this.nodeMatrix(node)) as Float32Array;

        if (node.mesh !== undefined) {
            out.push({ primitives: this.parseMesh(gltf, binBuffer, textures, node.mesh), modelMatrix: world });
        }
        for (const child of (node.children ?? [])) {
            this.collectNode(gltf, binBuffer, textures, child, world, out);
        }
    }

    private nodeMatrix(node: any): Float32Array {
        if (node.matrix) return new Float32Array(node.matrix);
        const t = node.translation ?? [0, 0, 0];
        const r = node.rotation    ?? [0, 0, 0, 1];
        const s = node.scale       ?? [1, 1, 1];
        const m = mat4.identity() as Float32Array;
        mat4.fromQuat(quat.create(r[0], r[1], r[2], r[3]), m);
        mat4.translate(m, vec3.create(t[0], t[1], t[2]), m);
        mat4.scale(m, vec3.create(s[0], s[1], s[2]), m);
        return m;
    }

    private parseMesh(
        gltf: any,
        binBuffer: ArrayBuffer | null,
        textures: GPUTexture[],
        meshIdx: number,
    ): GltfPrimitive[] {
        const mesh = gltf.meshes[meshIdx];
        const result: GltfPrimitive[] = [];

        for (const prim of mesh.primitives) {
            if ((prim.mode ?? 4) !== 4) continue;

            const posIdx = prim.attributes['POSITION'];
            if (posIdx === undefined) continue;
            const posData = this.readAccessor(gltf, binBuffer, posIdx) as Float32Array;

            const normalData = prim.attributes['NORMAL'] !== undefined
                ? this.readAccessor(gltf, binBuffer, prim.attributes['NORMAL']) as Float32Array
                : new Float32Array(posData.length);

            const uvData = prim.attributes['TEXCOORD_0'] !== undefined
                ? this.readAccessor(gltf, binBuffer, prim.attributes['TEXCOORD_0']) as Float32Array
                : new Float32Array((posData.length / 3) * 2); // csupa 0

            const vertexCount = posData.length / 3;

            const interleaved = new Float32Array(vertexCount * 8);
            for (let i = 0; i < vertexCount; i++) {
                interleaved[i * 8 + 0] = posData[i * 3 + 0];
                interleaved[i * 8 + 1] = posData[i * 3 + 1];
                interleaved[i * 8 + 2] = posData[i * 3 + 2];
                interleaved[i * 8 + 3] = normalData[i * 3 + 0];
                interleaved[i * 8 + 4] = normalData[i * 3 + 1];
                interleaved[i * 8 + 5] = normalData[i * 3 + 2];
                interleaved[i * 8 + 6] = uvData[i * 2 + 0];
                interleaved[i * 8 + 7] = uvData[i * 2 + 1];
            }

            const vertexBuffer = this.device.createBuffer({
                size: interleaved.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            this.device.queue.writeBuffer(vertexBuffer, 0, interleaved);

            let indexBuffer: GPUBuffer | null = null;
            let indexCount = 0;
            let indexFormat: GPUIndexFormat = 'uint16';

            if (prim.indices !== undefined) {
                const idxAcc      = gltf.accessors[prim.indices];
                const compType    = idxAcc.componentType as number;
                const compSize    = COMPONENT_TYPE_SIZE[compType] ?? 2;
                indexCount        = idxAcc.count;

                //webgpu nem tamogat uint8-at
                let finalIdx: Uint16Array | Uint32Array;
                if (compSize === 4) {
                    indexFormat = 'uint32';
                    const bv     = gltf.bufferViews[idxAcc.bufferView];
                    const offset = (bv.byteOffset ?? 0) + (idxAcc.byteOffset ?? 0);
                    finalIdx = new Uint32Array(binBuffer!.slice(offset, offset + indexCount * 4));
                } else if (compSize === 1) {
                    //uint8 -> uint16
                    indexFormat = 'uint16';
                    const bv     = gltf.bufferViews[idxAcc.bufferView];
                    const offset = (bv.byteOffset ?? 0) + (idxAcc.byteOffset ?? 0);
                    const src    = new Uint8Array(binBuffer!, offset, indexCount);
                    finalIdx     = new Uint16Array(indexCount);
                    for (let k = 0; k < indexCount; k++) finalIdx[k] = src[k];
                } else {
                    // uint16
                    indexFormat = 'uint16';
                    const bv     = gltf.bufferViews[idxAcc.bufferView];
                    const offset = (bv.byteOffset ?? 0) + (idxAcc.byteOffset ?? 0);
                    finalIdx = new Uint16Array(binBuffer!.slice(offset, offset + indexCount * 2));
                }

                const aligned = Math.ceil(finalIdx.byteLength / 4) * 4;
                indexBuffer   = this.device.createBuffer({
                    size:  Math.max(aligned, 4),
                    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(indexBuffer, 0, finalIdx);
            } else {
                indexCount = vertexCount;
            }

            let baseColor: [number, number, number, number] = [1, 1, 1, 1];
            let texture   = this.whiteTexture;

            if (prim.material !== undefined) {
                const mat = gltf.materials?.[prim.material];
                const pbr = mat?.pbrMetallicRoughness;

                if (pbr?.baseColorFactor) {
                    const f   = pbr.baseColorFactor;
                    baseColor = [f[0], f[1], f[2], f[3] ?? 1];
                }

                if (pbr?.baseColorTexture !== undefined) {
                    const texIdx   = gltf.textures?.[pbr.baseColorTexture.index]?.source;
                    if (texIdx !== undefined && textures[texIdx]) {
                        texture = textures[texIdx];
                    }
                }
            }

            result.push({
                vertexBuffer, indexBuffer, indexCount, vertexCount,
                indexFormat, baseColor,
                texture,
                sampler: this.defaultSampler,
            });
        }

        return result;
    }

    private readAccessor(
        gltf: any,
        binBuffer: ArrayBuffer | null,
        idx: number,
    ): Float32Array | Uint16Array | Uint32Array {
        const acc      = gltf.accessors[idx];
        const bv       = gltf.bufferViews[acc.bufferView];
        const raw      = binBuffer!;
        const offset   = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
        const compType = acc.componentType as number;
        const comps    = TYPE_COUNT[acc.type] ?? 1;
        const count    = acc.count as number;
        const stride   = bv.byteStride ?? (COMPONENT_TYPE_SIZE[compType] * comps);
        const isFloat  = compType === 5126;
        const isU32    = compType === 5125;
        const isU16    = compType === 5123 || compType === 5121;

        //tightly packed mod
        if (stride === COMPONENT_TYPE_SIZE[compType] * comps) {
            const slice = raw.slice(offset, offset + count * stride);
            if (isFloat) return new Float32Array(slice);
            if (isU32)   return new Uint32Array(slice);
            return new Uint16Array(slice);
        }

        //strided mod
        const out = isU32
            ? new Uint32Array(count * comps)
            : isU16 ? new Uint16Array(count * comps)
            : new Float32Array(count * comps);
        const src = new DataView(raw, offset);
        for (let i = 0; i < count; i++) {
            for (let c = 0; c < comps; c++) {
                const s = i * stride + c * COMPONENT_TYPE_SIZE[compType];
                const d = i * comps + c;
                if (isFloat) (out as Float32Array)[d] = src.getFloat32(s, true);
                else if (isU32) (out as Uint32Array)[d] = src.getUint32(s, true);
                else if (compType === 5123) (out as Uint16Array)[d] = src.getUint16(s, true);
                else (out as Uint16Array)[d] = src.getUint8(s);
            }
        }
        return out as Float32Array | Uint16Array | Uint32Array;
    }

    private decodeBase64(dataUri: string): ArrayBuffer {
        const base64 = dataUri.split(',')[1];
        const bin    = atob(base64);
        const bytes  = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
    }
}