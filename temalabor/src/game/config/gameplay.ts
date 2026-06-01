//palya meret
export const GROUND_SIZE = 50;
//player test offset
export const GROUND_LIMIT = 49.7;

//player
export const PLAYER_HEIGHT = 1.7;
export const PLAYER_RADIUS = 0.3;
export const GRAVITY       = -9.81;
export const JUMP_FORCE    = 5.0;
export const GROUND_Y      = 0.0;

export const PLAYER_START_HP = 2;
export const PLAYER_MAX_HP   = 10;

export const NORMAL_SPEED = 5.0;
export const SPRINT_SPEED = 7.0;

//parry es sebzodes
export const DAMAGE_COOLDOWN = 1.0;
export const PARRY_WINDOW     = 0.5;
export const PARRY_COOLDOWN   = 1.5;

//weapon sway
export const SWAY_STRENGTH = 0.012;
export const SWAY_MAX      = 0.06;
export const SWAY_RETURN   = 8.0;

//enemy/wave
export const MAX_ENEMIES      = 20;
export const WAVE_MULTIPLIER  = 1.15;
export const WAVE_MARGIN      = 5;
export const ENEMY_HALF       = 0.5;
export const CREDITS_PER_HIT  = 10;

//perk arak
export const AUTO_WEAPON_COST = 900;
export const SPEED_BOOST_COST = 500;

//hang path
export const SOUNDS: Record<string, string> = {
    skeleton_death: '/sounds/skeleton_death.mp3',
    gunshot:        '/sounds/gunshot.mp3',
    gunreload:      '/sounds/gunreload.mp3',
    player_damaged: '/sounds/playerdamaged.mp3',
    parry:          '/sounds/parry.mp3',
};
