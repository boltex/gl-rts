import { TEntity, GLResources, ShaderType, TRectangle, TSelectAnim } from "./types";
import { CONFIG } from './config';
import { SHADERS } from './shaders';
import { CameraManager } from "./camera-manager";

abstract class BaseRenderer {

    program: WebGLProgram;

    protected gl: WebGL2RenderingContext;
    protected vao: WebGLVertexArrayObject;
    protected dirtyTransforms: boolean; // Flag to update bufferData from transformData in the render method.
    protected resources: GLResources = {
        buffers: [],
        textures: [],
        shaders: []
    };

    constructor(gl: WebGL2RenderingContext, vertexShader: string, fragmentShader: string) {
        this.gl = gl;
        this.program = this.createProgram(vertexShader, fragmentShader);
        this.gl.useProgram(this.program);
        this.vao = this.gl.createVertexArray()!;
        this.dirtyTransforms = false;
    }

    protected createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
        const program = this.gl.createProgram()!;
        let errorLog = '';

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        if (!vertexShader || !fragmentShader) {
            errorLog += '\nFailed to create shaders';
        }

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        // Error checking
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            errorLog += `\nProgram linking failed: ${this.gl.getProgramInfoLog(program)}`;
        }
        this.gl.validateProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.VALIDATE_STATUS)) {
            errorLog += `\nProgram validation failed: ${this.gl.getProgramInfoLog(program)}`;
        }
        const activeAttributes = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);
        const activeUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
        if (activeAttributes === 0 && activeUniforms === 0) {
            errorLog += '\nWarning: Program has no active attributes or uniforms';
        }
        if (errorLog) {
            throw new Error(`WebGL Program creation failed: ${errorLog}`);
        }

        return program;
    }

    protected createShader(type: ShaderType, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) {
            throw new Error('Failed to create shader');
        }
        this.resources.shaders.push(shader);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(this.gl.getShaderInfoLog(shader));
            throw new Error('Shader compilation failed');
        }
        return shader;
    }

    protected setupBufferWithAttributes(
        buffer: WebGLBuffer,
        data: BufferSource,
        usage: number,
        attributes: Array<[number, number, number, number, number?]>
    ): void {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, usage);
        attributes.forEach(([location, size, stride, offset, divisor = 0]) => {
            this.setupAttribute(location, size, stride, offset, divisor);
        });
    }

    protected createBuffer(): WebGLBuffer {
        const buffer = this.gl.createBuffer()!;
        this.resources.buffers.push(buffer);
        return buffer;
    }

    protected createTexture(): WebGLTexture {
        const texture = this.gl.createTexture()!;
        this.resources.textures.push(texture);
        return texture;
    }

    protected setupAttribute(
        location: number,
        size: number,
        stride: number,
        offset: number,
        divisor: number = 0
    ): void {
        this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, stride, offset);
        this.gl.enableVertexAttribArray(location);
        this.gl.vertexAttribDivisor(location, divisor);
    }

    abstract updateTransformData(data: any[], camera?: CameraManager): void; // This will also set dirtyTransforms to true.

    abstract render(): void; // Before rendering, update bufferData from transformData if dirtyTransforms is true.

    dispose(): void {
        // Delete all resources in reverse order
        this.resources.textures.forEach(texture => this.gl.deleteTexture(texture));
        this.resources.buffers.forEach(buffer => this.gl.deleteBuffer(buffer));
        this.resources.shaders.forEach(shader => this.gl.deleteShader(shader));
        this.gl.deleteProgram(this.program);
        this.gl.deleteVertexArray(this.vao);

        // Clear arrays
        this.resources.textures = [];
        this.resources.buffers = [];
        this.resources.shaders = [];
    }
}

export class TileRenderer extends BaseRenderer {
    private transformBuffer: WebGLBuffer;
    private modelBuffer: WebGLBuffer;
    private transformData: Float32Array;
    private image: HTMLImageElement
    private texture: WebGLTexture;
    private renderMax: number = 0;

    constructor(gl: WebGL2RenderingContext, image: HTMLImageElement, size: number) {
        super(gl, SHADERS.TILE_VERTEX_SHADER, SHADERS.TILE_FRAGMENT_SHADER);

        this.image = image;
        this.texture = this.createTexture();
        this.modelBuffer = this.createBuffer(); // Create a buffer
        this.transformBuffer = this.createBuffer()!;

        // posX, posY, scale, colorR, colorG, colorB, depth. A stride of 28 bytes.
        this.transformData = new Float32Array(size * 7); // Init with 0s
        this.setupVAO();
    }

    private setupVAO() {
        this.gl.bindVertexArray(this.vao);
        this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, this.texture);
        this.gl.texImage3D(this.gl.TEXTURE_2D_ARRAY, 0, this.gl.RGBA, CONFIG.GAME.TILE.SIZE, CONFIG.GAME.TILE.SIZE, CONFIG.GAME.TILE.DEPTH, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.image); // 64 textures of 128x128 pixels
        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR); // TODO : TRY MORE FILTERS ?
        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR); // TODO : TRY MORE FILTERS ?
        this.gl.generateMipmap(this.gl.TEXTURE_2D_ARRAY);
        this.setupBufferWithAttributes(this.modelBuffer, CONFIG.TEXTURE_MODEL_DATA, this.gl.STATIC_DRAW, [
            [0, 2, 16, 0],
            [1, 2, 16, 8]
        ]);
        this.setupBufferWithAttributes(this.transformBuffer, this.transformData, this.gl.DYNAMIC_DRAW, [
            [2, 2, 28, 0, 1],
            [3, 1, 28, 8, 1],
            [4, 3, 28, 12, 1],
            [5, 1, 28, 24, 1]
        ]);
        this.gl.bindVertexArray(null); // All done, unbind the VAO
    }

    updateTransformData(data: [number, number, number][] = []): void {
        // data is Array of X, Y and Tile Index triplets
        for (let i = 0; i < data.length; i++) {
            const offset = i * 7;
            this.transformData[offset] = data[i][0];
            this.transformData[offset + 1] = data[i][1];
            this.transformData[offset + 2] = CONFIG.GAME.TILE.SIZE;
            this.transformData[offset + 3] = 1;
            this.transformData[offset + 4] = 1;
            this.transformData[offset + 5] = 1;
            this.transformData[offset + 6] = data[i][2];
        }
        this.renderMax = data.length;
        this.dirtyTransforms = true;
    }

    render(): void {
        this.gl.useProgram(this.program);
        this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, this.texture);
        this.gl.bindVertexArray(this.vao);
        if (this.dirtyTransforms) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.transformData, 0, 7 * this.renderMax);
            this.dirtyTransforms = false;
        }
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.renderMax);
    }

}

export class WidgetRenderer extends BaseRenderer {
    private transformBuffer: WebGLBuffer;
    private modelBuffer: WebGLBuffer;
    private transformData: Float32Array;
    private image: HTMLImageElement
    private texture: WebGLTexture;
    private renderMax: number = 0;

    constructor(gl: WebGL2RenderingContext, image: HTMLImageElement, size: number) {
        super(gl, SHADERS.TILE_VERTEX_SHADER, SHADERS.TILE_FRAGMENT_SHADER);

        this.image = image;
        this.texture = this.createTexture();
        this.modelBuffer = this.createBuffer(); // Create a buffer
        this.transformBuffer = this.createBuffer()!;

        // posX, posY, scale, colorR, colorG, colorB, depth. A stride of 28 bytes.
        this.transformData = new Float32Array(size * 7); // Init with 0s
        this.setupVAO();
    }

    private setupVAO() {
        this.gl.bindVertexArray(this.vao);
        this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, this.texture);
        this.gl.texImage3D(this.gl.TEXTURE_2D_ARRAY, 0, this.gl.RGBA, CONFIG.GAME.WIDGETS.SIZE, CONFIG.GAME.WIDGETS.SIZE, CONFIG.GAME.WIDGETS.DEPTH, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.image);
        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR); // TODO : TRY MORE FILTERS ?
        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR); // TODO : TRY MORE FILTERS ?
        this.gl.generateMipmap(this.gl.TEXTURE_2D_ARRAY);
        this.setupBufferWithAttributes(this.modelBuffer, CONFIG.TEXTURE_MODEL_DATA, this.gl.STATIC_DRAW, [
            [0, 2, 16, 0],
            [1, 2, 16, 8]
        ]);
        this.setupBufferWithAttributes(this.transformBuffer, this.transformData, this.gl.DYNAMIC_DRAW, [
            [2, 2, 28, 0, 1],
            [3, 1, 28, 8, 1],
            [4, 3, 28, 12, 1],
            [5, 1, 28, 24, 1]
        ]);
        this.gl.bindVertexArray(null); // All done, unbind the VAO
    }

    updateTransformData(data: [number, number, number, number][] = []): void {
        // data is Array of X, Y and Tile Index triplets
        for (let i = 0; i < data.length; i++) {
            const offset = i * 7;
            this.transformData[offset] = data[i][0];
            this.transformData[offset + 1] = data[i][1];
            this.transformData[offset + 2] = data[i][3];
            this.transformData[offset + 3] = 1;
            this.transformData[offset + 4] = 1;
            this.transformData[offset + 5] = 1;
            this.transformData[offset + 6] = data[i][2];
        }
        this.renderMax = data.length;
        this.dirtyTransforms = true;
    }

    render(): void {
        this.gl.useProgram(this.program);
        this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, this.texture);
        this.gl.bindVertexArray(this.vao);
        if (this.dirtyTransforms) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.transformData, 0, 7 * this.renderMax);
            this.dirtyTransforms = false;
        }
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.renderMax);
    }

}

export class SpriteRenderer extends BaseRenderer {
    private transformBuffer: WebGLBuffer;
    private modelBuffer: WebGLBuffer;
    private transformData: Float32Array;
    private image: HTMLImageElement
    private texture: WebGLTexture;
    private renderMax: number = 0;

    constructor(gl: WebGL2RenderingContext, image: HTMLImageElement, size: number) {
        super(gl, SHADERS.SPRITE_VERTEX_SHADER, SHADERS.SPRITE_FRAGMENT_SHADER);
        this.image = image;
        this.texture = this.createTexture()!;
        this.modelBuffer = this.createBuffer()!; // Create a buffer
        this.transformBuffer = this.createBuffer()!;
        this.transformData = new Float32Array(size * 8); // 8 floats per sprite, Init with 0s
        this.setupVAO();
    }

    private setupVAO() {
        this.gl.bindVertexArray(this.vao);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, CONFIG.GAME.SPRITES.BITMAP_SIZE, CONFIG.GAME.SPRITES.BITMAP_SIZE, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.image);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR); // TODO : TRY MORE FILTERS ?
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR); // TODO : TRY MORE FILTERS ?
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.setupBufferWithAttributes(this.modelBuffer, CONFIG.TEXTURE_MODEL_DATA, this.gl.STATIC_DRAW, [
            [0, 2, 16, 0],
            [1, 2, 16, 8]
        ]);
        this.setupBufferWithAttributes(this.transformBuffer, this.transformData, this.gl.DYNAMIC_DRAW, [
            [2, 2, 32, 0, 1],
            [3, 1, 32, 8, 1],
            [4, 3, 32, 12, 1],
            [5, 2, 32, 24, 1]
        ]);
        this.gl.bindVertexArray(null); // All done, unbind the VAO
    }

    updateTransformData(data: Array<TEntity | TSelectAnim>, camera: CameraManager): void {
        const scrollX = camera.scrollX;
        const scrollY = camera.scrollY;
        const screenWidth = camera.gameScreenWidth;
        const screenHeight = camera.gameScreenHeight;
        let index = 0;

        // Inline u and v functions to avoid repeated function calls
        for (let i = 0, len = data.length; i < len; i++) {
            const item = data[i];
            if (!item.active) {
                continue;
            };
            const x = item.x;
            const y = item.y;

            // Early exclusion using precomputed camera bounds
            if ((x + 128) < scrollX || x > (scrollX + screenWidth) ||
                (y + 128) < scrollY || y > (scrollY + screenHeight)) {
                continue;
            }

            const offset = index * 8;
            // Pre-calculate sprite and orientation values
            const sprite = item.frameIndex;
            const orientation = item.orientation;
            const u = ((sprite % 16) * 0.015625) + ((orientation % 4) * 0.25);
            const v = (Math.floor(sprite / 16) * 0.015625) + (Math.floor(orientation / 4) * 0.25);

            // Adjust position with camera scroll (addition order adjusted)
            this.transformData[offset] = x - scrollX;
            this.transformData[offset + 1] = y - scrollY;
            this.transformData[offset + 2] = 128; // default entity size
            this.transformData[offset + 3] = 1;   // default color
            this.transformData[offset + 4] = 1;   // default color
            this.transformData[offset + 5] = 1;   // default color
            this.transformData[offset + 6] = u;
            this.transformData[offset + 7] = v;
            index++;
        }
        this.renderMax = index;
        this.dirtyTransforms = true;
    }

    render(): void {
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        if (this.dirtyTransforms) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.transformData, 0, 8 * this.renderMax);
            this.dirtyTransforms = false;
        }
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.renderMax);
    }

}

export class RectangleRenderer extends BaseRenderer {
    private transformBuffer: WebGLBuffer;
    private modelBuffer: WebGLBuffer;
    private transformData: Float32Array;
    private renderMax: number = 0;

    constructor(gl: WebGL2RenderingContext, size: number) {
        super(gl, SHADERS.RECTANGLE_VERTEX_SHADER, SHADERS.RECTANGLE_FRAGMENT_SHADER);
        this.modelBuffer = this.createBuffer(); // Create a buffer
        this.transformBuffer = this.createBuffer()!;
        this.transformData = new Float32Array(size * 8); // Init with 0s
        this.setupVAO();
    }

    updateTransformData(data: TRectangle[]): void {
        for (let i = 0; i < data.length; i++) {
            const offset = i * 8;
            this.transformData[offset] = data[i].x;
            this.transformData[offset + 1] = data[i].y;
            this.transformData[offset + 2] = data[i].width;
            this.transformData[offset + 3] = data[i].height;
            this.transformData[offset + 4] = data[i].r;
            this.transformData[offset + 5] = data[i].g;
            this.transformData[offset + 6] = data[i].b;
            this.transformData[offset + 7] = data[i].a;
        }
        this.renderMax = data.length;
        this.dirtyTransforms = true;
    }

    private setupVAO() {
        this.gl.bindVertexArray(this.vao);
        this.setupBufferWithAttributes(this.modelBuffer, CONFIG.RECTANGLE_MODEL_DATA, this.gl.STATIC_DRAW, [
            [0, 2, 8, 0]
        ]);
        this.setupBufferWithAttributes(this.transformBuffer, this.transformData, this.gl.DYNAMIC_DRAW, [
            [1, 2, 32, 0, 1],
            [2, 1, 32, 8, 1],
            [3, 1, 32, 12, 1],
            [4, 4, 32, 16, 1]
        ]);
        this.gl.bindVertexArray(null); // All done, unbind the VAO
    }

    render(): void {
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        if (this.dirtyTransforms) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.transformData, 0, 8 * this.renderMax);
            this.dirtyTransforms = false;
        }
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.renderMax); // Draw the model of 6 vertex that form 2 triangles, 3 times
    }

}

