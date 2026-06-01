import { RenderDevice } from '../../engine/render/render-device';
import SquareWGSL     from '../../shaders/square.vx.wgsl?raw';
import BlueFragWGSL   from '../../shaders/blue.frag.wgsl?raw';
import GltfVxWGSL     from '../../shaders/gltf.vx.wgsl?raw';
import GltfFragWGSL   from '../../shaders/gltf.frag.wgsl?raw';
import SkinnedVxWGSL  from '../../shaders/skinned.vx.wgsl?raw';
import SkinnedFragWGSL from '../../shaders/skinned.frag.wgsl?raw';
import SkyVxWGSL      from '../../shaders/sky.vx.wgsl?raw';
import SkyFragWGSL    from '../../shaders/sky.frag.wgsl?raw';
import GroundVxWGSL   from '../../shaders/ground.vx.wgsl?raw';
import GroundFragWGSL from '../../shaders/ground.frag.wgsl?raw';

//megjegyzes: barmennyire syntax hibasnak tunik az egesz Renderer, mukodik. Csak az IDE miatt van alahuzva.
export class GameRenderer {
    readonly device:  GPUDevice;
    readonly format:  GPUTextureFormat;
    readonly context: GPUCanvasContext;
    readonly rd:      RenderDevice;

    readonly flatPipeline:    GPURenderPipeline;
    readonly gltfPipeline:    GPURenderPipeline;
    readonly weaponPipeline:  GPURenderPipeline;
    readonly skinnedPipeline: GPURenderPipeline;
    readonly skyPipeline:     GPURenderPipeline;
    readonly groundPipeline:  GPURenderPipeline;

    static readonly JOINT_COUNT      = 23;
    static readonly SKINNED_UB_SIZE  = 144 + GameRenderer.JOINT_COUNT * 64;

    constructor(device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) {
        this.device  = device;
        this.context = context;
        this.format  = format;
        this.rd      = new RenderDevice(device, context, format);

        this.flatPipeline    = this.createFlatPipeline();
        this.gltfPipeline    = this.createGltfPipeline(false);
        this.weaponPipeline  = this.createGltfPipeline(true);
        this.skinnedPipeline = this.createSkinnedPipeline();
        this.skyPipeline     = this.createSkyPipeline();
        this.groundPipeline  = this.createGroundPipeline();
    }

    private createFlatPipeline(): GPURenderPipeline {
        return this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: this.device.createShaderModule({ code: SquareWGSL }),
                buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }],
            },
            fragment: {
                module: this.device.createShaderModule({ code: BlueFragWGSL }),
                targets: [{ format: this.format }],
            },
            depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
        });
    }

    private createGltfPipeline(forWeapon: boolean): GPURenderPipeline {
        return this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: this.device.createShaderModule({ code: GltfVxWGSL }),
                buffers: [{
                    arrayStride: 32,
                    attributes: [
                        { shaderLocation: 0, offset:  0, format: 'float32x3' },
                        { shaderLocation: 1, offset: 12, format: 'float32x3' },
                        { shaderLocation: 2, offset: 24, format: 'float32x2' },
                    ],
                }],
            },
            fragment: {
                module: this.device.createShaderModule({ code: GltfFragWGSL }),
                targets: [{ format: this.format }],
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: forWeapon ? 'less' : 'less',
            },
        });
    }

    private createSkinnedPipeline(): GPURenderPipeline {
        const vx = this.device.createShaderModule({ code: SkinnedVxWGSL });
        const fr = this.device.createShaderModule({ code: SkinnedFragWGSL });
        vx.getCompilationInfo().then(info => {
            for (const msg of info.messages)
                console.error(`[SkinnedVx] ${msg.type} L${msg.lineNum}: ${msg.message}`);
        });
        return this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: vx,
                buffers: [{
                    arrayStride: 64,
                    attributes: [
                        { shaderLocation: 0, offset:  0, format: 'float32x3' },
                        { shaderLocation: 1, offset: 12, format: 'float32x3' },
                        { shaderLocation: 2, offset: 24, format: 'float32x2' },
                        { shaderLocation: 3, offset: 32, format: 'float32x4' },
                        { shaderLocation: 4, offset: 48, format: 'float32x4' },
                    ],
                }],
            },
            fragment: { module: fr, targets: [{ format: this.format }] },
            depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
        });
    }

    private createSkyPipeline(): GPURenderPipeline {
        return this.device.createRenderPipeline({
            layout: 'auto',
            vertex:   { module: this.device.createShaderModule({ code: SkyVxWGSL }) },
            fragment: { module: this.device.createShaderModule({ code: SkyFragWGSL }), targets: [{ format: this.format }] },
            depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less-equal' },
            primitive: { topology: 'triangle-list' },
        });
    }

    private createGroundPipeline(): GPURenderPipeline {
        return this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: this.device.createShaderModule({ code: GroundVxWGSL }),
                buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }],
            },
            fragment: { module: this.device.createShaderModule({ code: GroundFragWGSL }), targets: [{ format: this.format }] },
            depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
        });
    }

    makeVertexBuffer(data: Float32Array): GPUBuffer {
        const buf = this.device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(buf, 0, data);
        return buf;
    }

    makeIndexBuffer(data: Uint16Array): GPUBuffer {
        const size = Math.ceil(data.byteLength / 4) * 4;
        const buf  = this.device.createBuffer({ size, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(buf, 0, data);
        return buf;
    }

    makeFlatUB(): GPUBuffer {
        return this.device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    }

    makeGltfUB(): GPUBuffer {
        return this.device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    }

    makeSkinnedUB(): GPUBuffer {
        return this.device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    }

    makeSkinnedJointBuf(): GPUBuffer {
        return this.device.createBuffer({
            size:  GameRenderer.JOINT_COUNT * 16 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
    }

    makeFlatBG(ub: GPUBuffer): GPUBindGroup {
        return this.device.createBindGroup({
            layout:  this.flatPipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: ub } }],
        });
    }

    makeGltfBG(ub: GPUBuffer, texture: GPUTexture, sampler: GPUSampler): GPUBindGroup {
        return this.device.createBindGroup({
            layout:  this.gltfPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: ub } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: texture.createView() },
            ],
        });
    }

    makeWeaponBG(ub: GPUBuffer, texture: GPUTexture, sampler: GPUSampler): GPUBindGroup {
        return this.device.createBindGroup({
            layout:  this.weaponPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: ub } },
                { binding: 1, resource: sampler },
                { binding: 2, resource: texture.createView() },
            ],
        });
    }

    makeSkinnedBG(ub: GPUBuffer, jb: GPUBuffer): GPUBindGroup {
        return this.device.createBindGroup({
            layout:  this.skinnedPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: ub, size: 144 } },
                { binding: 1, resource: { buffer: jb } },
            ],
        });
    }

    makeGroundBG(ub: GPUBuffer): GPUBindGroup {
        return this.device.createBindGroup({
            layout:  this.groundPipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: ub } }],
        });
    }

    writeFlatUniforms(ub: GPUBuffer, mvp: Float32Array, color: [number,number,number,number]): void {
        this.device.queue.writeBuffer(ub,   0, mvp);
        this.device.queue.writeBuffer(ub,  64, new Float32Array(color));
    }

    writeGltfUniforms(ub: GPUBuffer, mvp: Float32Array, model: Float32Array, color: [number,number,number,number]): void {
        this.device.queue.writeBuffer(ub,   0, mvp);
        this.device.queue.writeBuffer(ub,  64, model);
        this.device.queue.writeBuffer(ub, 128, new Float32Array(color));
    }

    writeSkinnedUniforms(ub: GPUBuffer, jb: GPUBuffer, mvp: Float32Array, model: Float32Array,
                          color: [number,number,number,number], joints: Float32Array): void {
        this.device.queue.writeBuffer(ub,  0, mvp);
        this.device.queue.writeBuffer(ub, 64, model);
        this.device.queue.writeBuffer(ub, 128, new Float32Array(color));
        this.device.queue.writeBuffer(jb,  0, joints);
    }

    createDepthTexture(width: number, height: number): GPUTexture {
        return this.device.createTexture({
            size: [width, height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    beginMainPass(
        encoder:      GPUCommandEncoder,
        depthTexture: GPUTexture,
        clearColor:   [number,number,number,number] = [0,0,0,1],
    ): GPURenderPassEncoder {
        return encoder.beginRenderPass({
            colorAttachments: [{
                view:       this.context.getCurrentTexture().createView(),
                clearValue: clearColor,
                loadOp:     'clear',
                storeOp:    'store',
            }],
            depthStencilAttachment: {
                view:             depthTexture.createView(),
                depthClearValue:  1.0,
                depthLoadOp:      'clear',
                depthStoreOp:     'store',
            },
        });
    }

    beginWeaponPass(encoder: GPUCommandEncoder, depthTexture: GPUTexture): GPURenderPassEncoder {
        return encoder.beginRenderPass({
            colorAttachments: [{
                view:    this.context.getCurrentTexture().createView(),
                loadOp:  'load',
                storeOp: 'store',
            }],
            depthStencilAttachment: {
                view:            depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp:     'clear',
                depthStoreOp:    'store',
            },
        });
    }
}