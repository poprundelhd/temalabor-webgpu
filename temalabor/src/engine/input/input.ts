import { Keyboard } from './keyboard';
import { Mouse }    from './mouse';

export class Input {
    readonly keyboard: Keyboard;
    readonly mouse:    Mouse;

    constructor(canvas: HTMLCanvasElement) {
        this.keyboard = new Keyboard();
        this.mouse    = new Mouse(canvas);
    }

    //frame vegen hivando
    flush(): void {
        this.keyboard.flush();
        this.mouse.flush();
    }

    get isLocked():     boolean { return this.mouse.isLocked; }
    get moveForward():  boolean { return this.keyboard.moveForward;  }
    get moveBack():     boolean { return this.keyboard.moveBack;     }
    get moveLeft():     boolean { return this.keyboard.moveLeft;     }
    get moveRight():    boolean { return this.keyboard.moveRight;    }
    get sprint():       boolean { return this.keyboard.sprint;       }
    get jump():         boolean { return this.keyboard.jump;         }
    get reload():       boolean { return this.keyboard.reload;       }
    get interact():     boolean { return this.keyboard.interact;     }
    get block():        boolean { return this.keyboard.block;        }
    get shoot():        boolean { return this.mouse.leftDown;        }
    get shootJustDown():boolean { return this.mouse.justDown;        }
    get mouseDeltaX():  number  { return this.mouse.deltaX;         }
    get mouseDeltaY():  number  { return this.mouse.deltaY;         }
}