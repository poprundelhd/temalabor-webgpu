import type { RenderDevice } from './render-device';

export interface MaterialOptions {
    vertexShader:   string; //wgsl
    fragmentShader: string; //wgsl
    arrayStride:    number;
    attributes:     GPUVertexAttribute[];
    depthWrite?:    boolean;
    depthCompare?:  GPUCompareFunction;
}

export class Material {
    readonly pipeline:  GPURenderPipeline;
    private  device:    RenderDevice;

    constructor(device: RenderDevice, options: MaterialOptions) {
        this.device   = device;
        this.pipeline = device.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module:  device.createShader(options.vertexShader),
                buffers: [{
                    arrayStride: options.arrayStride,
                    attributes:  options.attributes,
                }],
            },
            fragment: {
                module:  device.createShader(options.fragmentShader),
                targets: [{ format: device.format }],
            },
            depthStencil: {
                format:             'depth24plus',
                depthWriteEnabled:  options.depthWrite  ?? true,
                depthCompare:       options.depthCompare ?? 'less',
            },
        });
    }

    createBindGroup(entries: GPUBindGroupEntry[]): GPUBindGroup {
        return this.device.device.createBindGroup({
            layout:  this.pipeline.getBindGroupLayout(0),
            entries,
        });
    }

    bind(pass: GPURenderPassEncoder): void {
        pass.setPipeline(this.pipeline);
    }
}