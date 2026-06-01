export abstract class Weapon {
    abstract readonly name:        string;
    abstract readonly displayName: string;
    abstract readonly magSize:  number;
    abstract readonly auto:     boolean;
    abstract readonly fireRate: number;
    abstract readonly modelUrl: string;

    ammo:        number  = 0;
    reloading:   boolean = false;
    reloadTimer: number  = 0;
    fireTimer:   number  = 0;

    readonly reloadTime: number = 1.0;

    onShoot?: () => void;
    onReload?: () => void;

    constructor() {
        //leszarmazott onEquip()
    }

    canShoot(): boolean {
        return !this.reloading && this.ammo > 0;
    }

    shoot(): boolean {
        if (!this.canShoot()) return false;
        this.ammo--;
        this.onShoot?.();
        if (this.ammo <= 0) this.startReload();
        return true;
    }

    startReload(): void {
        if (this.reloading || this.ammo >= this.magSize) return;
        this.reloading   = true;
        this.reloadTimer = this.reloadTime;
        this.onReload?.();
    }

    update(dt: number): void {
        if (this.reloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.ammo      = this.magSize;
                this.reloading = false;
            }
        }
    }

    onEquip(): void {
        this.ammo        = this.magSize;
        this.reloading   = false;
        this.reloadTimer = 0;
        this.fireTimer   = 0;
    }

    getHudText(): string {
        return this.reloading
            ? `Lőszer: Töltés...`
            : `Lőszer: ${this.ammo} / ${this.magSize}`;
    }

    getWeaponText(): string {
        return `Fegyver: ${this.displayName}`;
    }
}