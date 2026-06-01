import { UIElement } from './ui-element';

export class HUDSystem {
    private elements = new Map<string, UIElement>();

    register(name: string, id: string): UIElement | null {
        const el = UIElement.fromId(id);
        if (el) this.elements.set(name, el);
        return el;
    }

    get(name: string): UIElement | null {
        return this.elements.get(name) ?? null;
    }

    setText(name: string, text: string): void {
        this.elements.get(name)?.el && (this.elements.get(name)!.text = text);
    }

    setVisible(name: string, visible: boolean): void {
        this.elements.get(name)?.el && (this.elements.get(name)!.visible = visible);
    }

    setPrompt(name: string, text: string | null): void {
        this.elements.get(name)?.setPrompt(text);
    }

    show(name: string): void { this.elements.get(name)?.show(); }
    hide(name: string): void { this.elements.get(name)?.hide(); }
}