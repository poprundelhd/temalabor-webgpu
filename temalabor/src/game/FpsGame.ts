import { Game }       from '../engine/game';
import { GameObject } from '../engine/game-object';
import { Transform }  from '../engine/transform';

import { Player }             from './player/Player';
import { PhysicsObject }      from './physics/PhysicsObject';
import { SkeletonEnemy }      from './enemies/SkeletonEnemy';
import { WorldManager }       from './world/WorldManager';
import { GameRenderer }       from './render/GameRenderer';
import { EnemyRenderer }      from './render/EnemyRenderer';
import { ProjectileRenderer } from './render/ProjectileRenderer';
import { SceneRenderer }      from './render/SceneRenderer';
import { WaveSystem }         from './systems/WaveSystem';
import { MageSystem }         from './systems/MageSystem';
import { PickupSystem }       from './systems/PickupSystem';
import { PerkSystem }         from './systems/PerkSystem';
import { CombatSystem }       from './systems/CombatSystem';
import { HudController }      from './ui/HudController';
import { AutoWeaponPerk, SpeedBoostPerk } from './interact/InteractableComponent';
import type { GameContext }   from './core/GameContext';
import { CREDITS_PER_HIT, SOUNDS } from './config/gameplay';

export class FpsGame extends Game {
    private player!:  Player;
    private world!:   WorldManager;

    private gameRenderer!:       GameRenderer;
    private enemyRenderer!:      EnemyRenderer;
    private projectileRenderer!: ProjectileRenderer;
    private sceneRenderer!:      SceneRenderer;

    private waveSystem!:   WaveSystem;
    private mageSystem!:   MageSystem;
    private pickupSystem!: PickupSystem;
    private perkSystem!:   PerkSystem;
    private combat!:       CombatSystem;
    private hudController!: HudController;

    private legacyEnemy!: SkeletonEnemy;
    private ctx!: GameContext;
    private enemyMovementEnabled = true;
    private lastDt = 0.016;

    async onInit(): Promise<void> {
        this.gameRenderer = new GameRenderer(this.device, this.context, this.format);

        this.player = new Player(this.input);
        this.scene.add(this.player);

        this.world = new WorldManager(this.gameRenderer, this.device);
        this.player.body.colliders = this.world.colliders;
        await this.world.loadAll();
        this.world.colliders.forEach(c => this.physics.addStatic(c));

        //sarga kocka
        this.player.body.pushables.push(new PhysicsObject(2, 0.5, -2));

        this.legacyEnemy = new SkeletonEnemy(-2, 0.5, -6, 3.0);

        this.enemyRenderer      = new EnemyRenderer(this.gameRenderer, this.device);
        this.projectileRenderer = new ProjectileRenderer(this.gameRenderer);
        this.mageSystem         = new MageSystem();

        this.waveSystem = new WaveSystem(
            this.scene,
            this.world.colliders,
            () => [this.player.body.position[0], this.player.body.position[1], this.player.body.position[2]],
        );

        this.pickupSystem = new PickupSystem(this.gameRenderer, this.device);
        this.waveSystem.onStatueSpawn = (pos) => this.pickupSystem.spawn(pos);
        this.waveSystem.onStatueHide  = ()    => this.pickupSystem.hide();

        this.perkSystem = new PerkSystem(this.player, this.player.controller, this.player.body);
        const gp = this.world.gravestonePos;
        const bp = this.world.barrelPos;
        const autoWeaponObj = new GameObject('perk', Transform.at(gp[0], gp[1], gp[2]));
        this.perkSystem.addPerk(autoWeaponObj.addComponent(new AutoWeaponPerk()));
        this.scene.add(autoWeaponObj);
        const speedBoostObj = new GameObject('perk', Transform.at(bp[0], bp[1], bp[2]));
        this.perkSystem.addPerk(speedBoostObj.addComponent(new SpeedBoostPerk()));
        this.scene.add(speedBoostObj);

        this.combat = new CombatSystem(this.player, this.player.controller, this.player.body, this.audio);

        this.player.weapon.onShoot  = () => this.audio.play('gunshot',   0.6);
        this.player.weapon.onReload = () => this.audio.play('gunreload', 0.7);

        this.hudController = new HudController(this.hud, this.player, this.perkSystem);
        this.hudController.setup();

        this.audio.loadAll(SOUNDS);

        this.sceneRenderer = new SceneRenderer(
            this.gameRenderer, this.device,
            this.world, this.pickupSystem,
            this.enemyRenderer, this.projectileRenderer,
        );
        this.sceneRenderer.loadWeapons([
            this.player.weapon.weapons[0]?.modelUrl ?? '/models/weapon/blaster-b.glb',
            this.player.weapon.weapons[1]?.modelUrl ?? '/models/weapon/blaster-p.glb',
        ]);

        //debug
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyG') {
                this.enemyMovementEnabled = !this.enemyMovementEnabled;
                console.log(`Enemy mozgás: ${this.enemyMovementEnabled ? 'BE' : 'KI'}`);
            }
            if (e.code === 'KeyH') {
                this.player.addCredits(1000);
                console.log('[DEBUG] +1000 kredit');
            }
        });

        this.ctx = {
            scene:   this.scene,
            player:  this.player,
            audio:   this.audio,
            colliders: this.world.colliders,
            enemyMovementEnabled: this.enemyMovementEnabled,
        };
    }

    onUpdate(dt: number): void {
        this.lastDt = dt;
        this.ctx.enemyMovementEnabled = this.enemyMovementEnabled;

        //wave spawn
        this.waveSystem.update(dt, this.ctx);
        const enemies     = this.waveSystem.enemies;
        const mageIndices = this.waveSystem.mageIndices;

        //death event
        const wasAlive = enemies.map(be => !be.dead);

        //lovoldozes
        const allEnemies = [this.legacyEnemy, ...enemies];
        const hits = this.player.tick(dt, allEnemies);
        if (hits > 0) this.player.addCredits(hits * CREDITS_PER_HIT);

        //halal hang
        enemies.forEach((be, i) => {
            if (wasAlive[i] && be.dead) this.audio.play('skeleton_death', 0.8);
        });

        if (!this.player.isLocked()) return;

        const body = this.player.body;
        const px = body.position[0], py = body.position[1], pz = body.position[2];

        //enemy mozgas
        if (this.enemyMovementEnabled) {
            this.legacyEnemy.update(dt, px, pz, this.ctx.colliders, [], body.pushables);
            this.waveSystem.moveEnemies(dt, this.ctx);
        }

        //mage lovoldozes
        const mageHit = this.mageSystem.update(dt, enemies, mageIndices, px, py, pz, this.ctx.colliders);
        if (mageHit) this.combat.handleHit();

        //melee combat
        this.combat.beginFrame(dt);
        this.combat.meleeCheck(enemies);

        if (this.player.isDead) { location.reload(); return; }

        //pickup
        this.pickupSystem.update(dt, this.ctx);
        this.enemyRenderer.update(dt);
    }

    onRender(): void {
        const aliveCount = this.waveSystem.enemies.filter(e => !e.dead).length;
        this.hudController.update(this.waveSystem.currentRound, aliveCount);

        this.sceneRenderer.renderFrame(
            this.lastDt,
            this.player,
            this.waveSystem.enemies,
            this.waveSystem.mageIndices,
            this.mageSystem.projectiles,
            this.combat.isBlocking,
        );
    }
}
