export type Vec2 = { x: number, y: number };

export type TCommand = {
    order: number;
    x: number;
    y: number;
    entityId: number;
}

export type TEntity = {
    id: number;
    // states
    type: number;
    hitPoints: number;
    state: number;
    x: number;
    y: number;
    oldX: number; // For interpolation. Meaning that the entity is moving from oldX, oldY to x, y
    oldY: number;
    orientation: number;
    frameIndex: number;
    // Ten queuable commands
    orderQty: number;
    orderIndex: number;
    orderPool: [
        TCommand, TCommand, TCommand, TCommand, TCommand,
        TCommand, TCommand, TCommand, TCommand, TCommand
    ];
    active: boolean;
}

export type TSelectAnim = {
    x: number;
    y: number;
    orientation: number;
    frameIndex: number;
    active: boolean;
}

export type TRectangle = {
    x: number;
    y: number;
    width: number;
    height: number;
    r: number;
    g: number;
    b: number;
    a: number;
}

export type TParameters =
    | {
        uniform: true;
        location: WebGLUniformLocation;
        type: number;
    }
    | {
        uniform: false;
        location: number;
        type: number;
    };


export interface GLResources {
    buffers: WebGLBuffer[];
    textures: WebGLTexture[];
    shaders: WebGLShader[];
}

export enum ShaderType {
    VERTEX = WebGL2RenderingContext.VERTEX_SHADER,
    FRAGMENT = WebGL2RenderingContext.FRAGMENT_SHADER
}

export type WebGLError = {
    type: 'shader' | 'program' | 'buffer' | 'texture';
    message: string;
    details?: string;
}

export enum EntityType {
    ALIEN = 1,
    // ...
}
