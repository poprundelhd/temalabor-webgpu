import { mat4 } from 'wgpu-matrix';

export class EngineCamera {
    fov:    number = Math.PI / 3;
    near:   number = 0.1;
    far:    number = 200;

    getProjectionMatrix(aspect: number): Float32Array {
        return mat4.perspective(this.fov, aspect, this.near, this.far) as Float32Array;
    }

    getViewProjection(viewMatrix: Float32Array, aspect: number): Float32Array {
        const proj = this.getProjectionMatrix(aspect);
        return mat4.multiply(proj, viewMatrix) as Float32Array;
    }
}