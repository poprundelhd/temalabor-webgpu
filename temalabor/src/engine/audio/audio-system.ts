export class AudioSystem {
    private ctx:     AudioContext;
    private buffers: Map<string, AudioBuffer> = new Map();

    constructor() {
        this.ctx = new AudioContext();
    }

    async load(name: string, url: string): Promise<void> {
        try {
            const resp   = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
            const data   = await resp.arrayBuffer();
            const buffer = await this.ctx.decodeAudioData(data);
            this.buffers.set(name, buffer);
            console.log(`[AudioSystem] Betöltve: ${name}`);
        } catch (err) {
            console.warn(`[AudioSystem] Hiba: ${name}`, err);
        }
    }

    async loadAll(sounds: Record<string, string>): Promise<void> {
        await Promise.all(
            Object.entries(sounds).map(([name, url]) => this.load(name, url))
        );
    }

    play(name: string, volume = 1.0): void {
        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`[AudioSystem] Ismeretlen hang: ${name}`);
            return;
        }
        const source = this.ctx.createBufferSource();
        const gain   = this.ctx.createGain();
        source.buffer   = buffer;
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    has(name: string): boolean {
        return this.buffers.has(name);
    }
}