export class AssetCache {
    private cache = new Map<string, unknown>();

    has(url: string): boolean {
        return this.cache.has(url);
    }

    get<T>(url: string): T | undefined {
        return this.cache.get(url) as T | undefined;
    }

    set<T>(url: string, asset: T): void {
        this.cache.set(url, asset);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}