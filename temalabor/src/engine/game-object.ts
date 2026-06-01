import { Transform } from './transform';
import type { Component } from './component';
import type { Scene } from './scene';

let nextId = 0;

export class GameObject {
    readonly id:  number;
    readonly tag: string;
    transform:    Transform;
    active:       boolean = true;

    private components: Component[] = [];

    constructor(tag = 'object', transform?: Transform) {
        this.id        = nextId++;
        this.tag       = tag;
        this.transform = transform ?? new Transform();
    }

    addComponent<T extends Component>(component: T): T {
        component.gameObject = this;
        component.onAttach();
        this.components.push(component);
        return component;
    }

    getComponent<T extends Component>(type: new (...args: any[]) => T): T | null {
        return (this.components.find(c => c instanceof type) as T) ?? null;
    }

    getComponents<T extends Component>(type: new (...args: any[]) => T): T[] {
        return this.components.filter(c => c instanceof type) as T[];
    }

    removeComponent<T extends Component>(type: new (...args: any[]) => T): void {
        const idx = this.components.findIndex(c => c instanceof type);
        if (idx >= 0) {
            this.components[idx].onDestroy();
            this.components.splice(idx, 1);
        }
    }

    update(dt: number, scene?: Scene): void {
        if (!this.active) return;
        for (const comp of this.components) comp.update(dt, scene);
    }

    destroy(): void {
        this.active = false;
        for (const comp of this.components) comp.onDestroy();
    }
}