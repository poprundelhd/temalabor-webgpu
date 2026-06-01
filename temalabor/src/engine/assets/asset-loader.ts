import { AssetCache } from './asset-cache';

export type { GltfModel } from './gltf-loader';
export type GltfAsset   = any[];   // lenyegeben GltfModel[]
export type AudioAsset  = AudioBuffer;
export type BinaryAsset = ArrayBuffer;

export class AssetLoader {
    private cache     = new AssetCache();
    private audioCtx  = new AudioContext();
    private device:   GPUDevice;
    private gltfLoader: any;

    constructor(device: GPUDevice) {
        this.device = device;
        //lazy import
        import('./gltf-loader').then(({ GltfLoader }) => {
            this.gltfLoader = new GltfLoader(device);
        });
    }

    async loadGltf(url: string): Promise<GltfAsset> {
        if (this.cache.has(url)) {
            return this.cache.get<GltfAsset>(url)!;
        }
        const models = await this.gltfLoader.load(url);
        this.cache.set(url, models);
        console.log(`[AssetLoader] GLB betöltve: ${url}`);
        return models;
    }

    async loadAudio(url: string): Promise<AudioAsset> {
        if (this.cache.has(url)) {
            return this.cache.get<AudioAsset>(url)!;
        }
        try {
            const resp   = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data   = await resp.arrayBuffer();
            const buffer = await this.audioCtx.decodeAudioData(data);
            this.cache.set(url, buffer);
            console.log(`[AssetLoader] Audio betöltve: ${url}`);
            return buffer;
        } catch (err) {
            console.warn(`[AssetLoader] Audio hiba: ${url}`, err);
            throw err;
        }
    }

    async loadAll(assets: Record<string, string>): Promise<void> {
        await Promise.all(
            Object.entries(assets).map(([, url]) => {
                if (url.endsWith('.glb'))
                    return this.loadGltf(url).catch(() => {});
                if (url.match(/\.(mp3|ogg|wav)$/))
                    return this.loadAudio(url).catch(() => {});
                return Promise.resolve();
            })
        );
    }

    playAudio(url: string, volume = 1.0): void {
        const buffer = this.cache.get<AudioAsset>(url);
        if (!buffer) {
            console.warn(`[AssetLoader] Nincs betöltve: ${url}`);
            return;
        }
        const source = this.audioCtx.createBufferSource();
        const gain   = this.audioCtx.createGain();
        source.buffer   = buffer;
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.audioCtx.destination);
        source.start();
    }

    //cache access
    getGltf(url: string): GltfAsset | undefined {
        return this.cache.get<GltfAsset>(url);
    }

    getAudio(url: string): AudioAsset | undefined {
        return this.cache.get<AudioAsset>(url);
    }

    get audioContext(): AudioContext {
        return this.audioCtx;
    }
}