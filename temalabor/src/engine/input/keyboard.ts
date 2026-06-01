export class Keyboard {
    private keys = new Set<string>();
    private justPressed  = new Set<string>();
    private justReleased = new Set<string>();

    constructor() {
        document.addEventListener('keydown', (e) => {
            if (!this.keys.has(e.code)) this.justPressed.add(e.code);
            this.keys.add(e.code);
        });
        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
            this.justReleased.add(e.code);
        });
    }

    isDown(code: string): boolean {
        return this.keys.has(code);
    }

    wasPressed(code: string): boolean {
        return this.justPressed.has(code);
    }

    wasReleased(code: string): boolean {
        return this.justReleased.has(code);
    }

    //frame vegen hivando
    flush(): void {
        this.justPressed.clear();
        this.justReleased.clear();
    }

    get moveForward():  boolean { return this.isDown('KeyW') || this.isDown('ArrowUp');    }
    get moveBack():     boolean { return this.isDown('KeyS') || this.isDown('ArrowDown');  }
    get moveLeft():     boolean { return this.isDown('KeyA') || this.isDown('ArrowLeft');  }
    get moveRight():    boolean { return this.isDown('KeyD') || this.isDown('ArrowRight'); }
    get sprint():       boolean { return this.isDown('ShiftLeft') || this.isDown('ShiftRight'); }
    get jump():         boolean { return this.wasPressed('Space'); }
    get reload():       boolean { return this.wasPressed('KeyR'); }
    get interact():     boolean { return this.wasPressed('KeyE'); }
    get block():        boolean { return this.isDown('KeyX'); }
    get switchWeapon1():boolean { return this.wasPressed('Digit1'); }
    get switchWeapon2():boolean { return this.wasPressed('Digit2'); }
}