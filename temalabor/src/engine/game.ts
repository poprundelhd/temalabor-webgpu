import { Scene } from './scene';
import { RenderDevice } from './render/render-device';
import { AssetLoader } from './assets/asset-loader';
import { PhysicsSystem } from './physics/physics-system';
import { AudioSystem }   from './audio/audio-system';
import { Input }         from './input/input';
import { HUDSystem }     from './ui/hud-system';

export abstract class Game {
    readonly canvas:  HTMLCanvasElement;
    readonly scene:   Scene = new Scene();

    protected rd!:      RenderDevice;
    readonly assets!:  AssetLoader;
    readonly physics!: PhysicsSystem;
    readonly audio!:   AudioSystem;
    readonly input!:   Input;
    readonly hud!:     HUDSystem;

    get device():  GPUDevice         { return this.rd.device;  }
    get context(): GPUCanvasContext  { return this.rd.context; }
    get format():  GPUTextureFormat  { return this.rd.format;  }

    private lastTime = 0;
    private running  = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    abstract onInit(): Promise<void>;
    abstract onUpdate(dt: number): void;
    abstract onRender(): void;

    async start(): Promise<void> {
        await this.initWebGPU();
        await this.onInit();
        this.running  = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
        console.log('[Game] Elindult');
    }

    stop(): void { this.running = false; }

    private loop(now: number): void {
        if (!this.running) return;
        const dt      = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.scene.update(dt);
        this.onUpdate(dt);
        this.onRender();
        this.input.flush();

        requestAnimationFrame(this.loop.bind(this));
    }

    private async initWebGPU(): Promise<void> {
        const adapter = await navigator.gpu?.requestAdapter();
        if (!adapter) throw new Error('WebGPU nem támogatott');

        const device  = await adapter.requestDevice();
        const context = this.canvas.getContext('webgpu') as GPUCanvasContext;
        const format  = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format });

        this.rd     = new RenderDevice(device, context, format);
        (this as any).assets  = new AssetLoader(device);
        (this as any).physics = new PhysicsSystem();
        (this as any).audio   = new AudioSystem();
        (this as any).input   = new Input(this.canvas);
        (this as any).hud     = new HUDSystem();

        new ResizeObserver(() => {
            this.canvas.width  = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.rd.resizeDepth();
        }).observe(this.canvas);

        console.log('[Game] WebGPU inicializálva');
    }
}