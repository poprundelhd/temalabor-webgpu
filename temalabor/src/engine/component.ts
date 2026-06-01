import type { GameObject } from './game-object';

export abstract class Component {
    gameObject!: GameObject;

    onAttach(): void {}
    abstract update(dt: number, ...args: any[]): void;
    onDestroy(): void {}
}