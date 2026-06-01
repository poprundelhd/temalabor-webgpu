export class RenderDevice {
    readonly device:  GPUDevice;
    readonly context: GPUCanvasContext;
    readonly format:  GPUTextureFormat;

    private depthTexture!: GPUTexture;

    constructor(device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) {
        this.device  = device;
        this.context = context;
        this.format  = format;
        this.createDepthTexture();
    }

    private createDepthTexture(): void {
        const canvas = this.context.canvas as HTMLCanvasElement;
        this.depthTexture = this.device.createTexture({
            size:   [canvas.width, canvas.height],
            format: 'depth24plus',
            usage:  GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    resizeDepth(): void {
        this.depthTexture.destroy();
        this.createDepthTexture();
    }

    get depth(): GPUTexture { return this.depthTexture; }

    createVertexBuffer(data: Float32Array): GPUBuffer {
        const buf = this.device.createBuffer({
            size:  data.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(buf, 0, data);
        return buf;
    }

    createIndexBuffer(data: Uint16Array | Uint32Array): GPUBuffer {
        const size = Math.ceil(data.byteLength / 4) * 4;
        const buf  = this.device.createBuffer({
            size,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(buf, 0, data);
        return buf;
    }

    createUniformBuffer(size: number): GPUBuffer {
        return this.device.createBuffer({
            size:  Math.ceil(size / 16) * 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    createStorageBuffer(size: number): GPUBuffer {
        return this.device.createBuffer({
            size:  Math.ceil(size / 16) * 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
    }

    writeBuffer(buf: GPUBuffer, offset: number, data: BufferSource): void {
        this.device.queue.writeBuffer(buf, offset, data);
    }

    createShader(code: string): GPUShaderModule {
        const module = this.device.createShaderModule({ code });
        module.getCompilationInfo().then(info => {
            for (const msg of info.messages) {
                if (msg.type === 'error')
                    console.error(`[Shader] L${msg.lineNum}: ${msg.message}`);
            }
        });
        return module;
    }

    beginFrame(clearColor: [number,number,number,number] = [0,0,0,1]): {
        encoder: GPUCommandEncoder;
        pass:    GPURenderPassEncoder;
    } {
        const encoder = this.device.createCommandEncoder();
        const pass    = encoder.beginRenderPass({
            colorAttachments: [{
                view:       this.context.getCurrentTexture().createView(),
                clearValue: clearColor,
                loadOp:     'clear',
                storeOp:    'store',
            }],
            depthStencilAttachment: {
                view:            this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp:     'clear',
                depthStoreOp:    'store',
            },
        });
        return { encoder, pass };
    }

    beginOverlayPass(encoder: GPUCommandEncoder): GPURenderPassEncoder {
        return encoder.beginRenderPass({
            colorAttachments: [{
                view:    this.context.getCurrentTexture().createView(),
                loadOp:  'load',
                storeOp: 'store',
            }],
            depthStencilAttachment: {
                view:            this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp:     'clear',
                depthStoreOp:    'store',
            },
        });
    }

    submit(encoder: GPUCommandEncoder): void {
        this.device.queue.submit([encoder.finish()]);
    }
}