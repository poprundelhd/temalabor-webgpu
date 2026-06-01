import type { GameObject } from './game-object';
import type { Component } from './component';

export class Scene {
    private objects: GameObject[] = [];

    add(obj: GameObject): void {
        this.objects.push(obj);
    }

    remove(obj: GameObject): void {
        obj.destroy();
    }

    findByTag(tag: string): GameObject[] {
        return this.objects.filter(o => o.active && o.tag === tag);
    }

    findFirstByTag(tag: string): GameObject | null {
        return this.objects.find(o => o.active && o.tag === tag) ?? null;
    }

    findByComponent<T extends Component>(type: new (...args: any[]) => T): GameObject[] {
        return this.objects.filter(o => o.active && o.getComponent(type) !== null);
    }

    get all(): GameObject[] {
        return this.objects.filter(o => o.active);
    }

    update(dt: number): void {
        this.objects = this.objects.filter(o => o.active);
        for (const obj of [...this.objects]) {
            if (obj.active) obj.update(dt, this);
        }
    }
}