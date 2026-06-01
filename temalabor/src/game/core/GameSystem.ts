import type { GameContext } from './GameContext';

export interface GameSystem {
    init?(): Promise<void> | void;
    update(dt: number, ctx: GameContext): void;
}
