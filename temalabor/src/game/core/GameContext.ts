import type { AABB } from '../../engine/physics/aabb';
import type { Player } from '../player/Player';
import type { Scene } from '../../engine/scene';
import type { AudioSystem } from '../../engine/audio/audio-system';

export interface GameContext {
    readonly scene:   Scene;
    readonly player:  Player;
    readonly audio:   AudioSystem;
    colliders:        AABB[];
    enemyMovementEnabled: boolean;
}
