export interface UIElementOptions {
    id?:        string;
    text?:      string;
    visible?:   boolean;
    className?: string;
}

export class UIElement {
    readonly el: HTMLElement;

    constructor(el: HTMLElement) {
        this.el = el;
    }

    //DOM
    static fromId(id: string): UIElement | null {
        const el = document.getElementById(id);
        if (!el) { console.warn(`[UI] Elem nem található: #${id}`); return null; }
        return new UIElement(el);
    }

    show(): void { this.el.style.display = 'block'; }
    hide(): void { this.el.style.display = 'none';  }

    set text(value: string) { this.el.textContent = value; }
    get text(): string       { return this.el.textContent ?? ''; }

    set visible(value: boolean) {
        this.el.style.display = value ? 'block' : 'none';
    }
    get visible(): boolean {
        return this.el.style.display !== 'none';
    }

    setPrompt(text: string | null): void {
        if (text) {
            this.el.style.display  = 'block';
            this.el.textContent    = text;
        } else {
            this.el.style.display  = 'none';
        }
    }
}