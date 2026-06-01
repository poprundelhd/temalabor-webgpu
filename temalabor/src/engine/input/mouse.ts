export class Mouse {
    deltaX:   number  = 0;
    deltaY:   number  = 0;
    isLocked: boolean = false;

    private _leftDown  = false;
    private _justDown  = false;
    private _justUp    = false;

    constructor(private canvas: HTMLCanvasElement) {
        canvas.addEventListener('click', () => canvas.requestPointerLock());

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === canvas;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;
            this.deltaX += e.movementX;
            this.deltaY += e.movementY;
        });

        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this._leftDown = true;
                if (this.isLocked) this._justDown = true;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this._leftDown = false;
                this._justUp   = true;
            }
        });
    }

    get leftDown():  boolean { return this._leftDown; }
    get justDown():  boolean { return this._justDown; }
    get justUp():    boolean { return this._justUp;   }

    //frame vegen hivando
    flush(): void {
        this.deltaX    = 0;
        this.deltaY    = 0;
        this._justDown = false;
        this._justUp   = false;
    }
}