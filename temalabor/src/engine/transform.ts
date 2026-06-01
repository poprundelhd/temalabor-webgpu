import { mat4, quat } from 'wgpu-matrix';

export class Transform {
    position: [number, number, number] = [0, 0, 0];
    rotation: [number, number, number, number] = [0, 0, 0, 1]; //xyzw
    scale:    [number, number, number] = [1, 1, 1];

    static at(x: number, y: number, z: number): Transform {
        const t = new Transform();
        t.position = [x, y, z];
        return t;
    }

    static identity(): Transform {
        return new Transform();
    }

    setPosition(x: number, y: number, z: number): this {
        this.position = [x, y, z];
        return this;
    }

    setScale(s: number): this {
        this.scale = [s, s, s];
        return this;
    }

    setRotationY(radians: number): this {
        const s = Math.sin(radians * 0.5);
        const c = Math.cos(radians * 0.5);
        this.rotation = [0, s, 0, c];
        return this;
    }

    // TRS szabvany alapjan: Translation × Rotation × Scale
    getMatrix(): Float32Array {
        const T = mat4.translation(this.position);
        const R = mat4.fromQuat(quat.create(...this.rotation));
        const S = mat4.scaling(this.scale);
        return mat4.multiply(mat4.multiply(T, R), S) as Float32Array;
    }
}