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

export type Color = {
    r: number;
    g: number;
    b: number;
};

export interface RenderableSprite {
    position: Vec2;
    scale: number;
    color: Color;
    frame: number;
    orientation: number;
}

export type SpriteUpdate = {
    index: number;
    properties: Partial<RenderableSprite>;
};

export enum ShaderType {
    VERTEX = WebGL2RenderingContext.VERTEX_SHADER,
    FRAGMENT = WebGL2RenderingContext.FRAGMENT_SHADER
}

export type WebGLError = {
    type: 'shader' | 'program' | 'buffer' | 'texture';
    message: string;
    details?: string;
}

export interface TileBufferData {
    posX: number;
    posY: number;
    scale: number;
    colorR: number;
    colorG: number;
    colorB: number;
    depth: number;
}

export interface SpriteBufferData {
    posX: number;
    posY: number;
    scale: number;
    colorR: number;
    colorG: number;
    colorB: number;
    frame: number;
    orientation: number;
}

export interface RectangleBufferData {
    posX: number;
    posY: number;
    scaleX: number;
    scaleY: number;
    colorR: number;
    colorG: number;
    colorB: number;
}