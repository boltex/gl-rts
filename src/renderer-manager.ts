import { TileRenderer, SpriteRenderer, RectangleRenderer } from "./renderers";
import { CONFIG } from "./config";
import { TEntity, TRectangle, TSelectAnim } from "./types";

export class RendererManager {
    private gl: WebGL2RenderingContext;
    public worldBuffer: WebGLBuffer | null = null;
    private tileRenderer: TileRenderer | null = null;
    private spriteRenderer: SpriteRenderer | null = null;
    private rectangleRenderer: RectangleRenderer | null = null;

    constructor(gl: WebGL2RenderingContext, tilesImage: HTMLImageElement, creaturesImage: HTMLImageElement) {
        this.gl = gl;
        this.initRenderers(tilesImage, creaturesImage);
    }

    initRenderers(tilesImage: HTMLImageElement, creaturesImage: HTMLImageElement): void {
        this.tileRenderer = new TileRenderer(this.gl, tilesImage, CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.MAP.HEIGHT);
        this.spriteRenderer = new SpriteRenderer(this.gl, creaturesImage, CONFIG.GAME.ENTITY.INITIAL_POOL_SIZE);
        this.rectangleRenderer = new RectangleRenderer(this.gl, 4);

        this.worldBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.worldBuffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, 2 * Float32Array.BYTES_PER_ELEMENT, this.gl.DYNAMIC_DRAW);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.worldBuffer);

        const worldIndex = 0;
        const tileBlockIndex = this.gl.getUniformBlockIndex(this.tileRenderer.program, 'World');
        this.gl.uniformBlockBinding(this.tileRenderer.program, tileBlockIndex, worldIndex);
        const spriteBlockIndex = this.gl.getUniformBlockIndex(this.spriteRenderer.program, 'World');
        this.gl.uniformBlockBinding(this.spriteRenderer.program, spriteBlockIndex, worldIndex);
        const rectBlockIndex = this.gl.getUniformBlockIndex(this.rectangleRenderer.program, 'World');
        this.gl.uniformBlockBinding(this.rectangleRenderer.program, rectBlockIndex, worldIndex);
    }

    setUboWorldTransforms(gameScreenWidth: number, gameScreenHeight: number): void {
        // Update the uniform buffer with current world transform values.
        const worldData = new Float32Array([2 / gameScreenWidth, 2 / -gameScreenHeight]);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.worldBuffer);
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, worldData);
    }

    render(
        visibleTiles: [number, number, number][],
        entitiesPool: TEntity[],
        selectionRectangles: TRectangle[],
        selectAnimPool: TSelectAnim[],
        interpolation: number
    ): void {

        // TODO : Use interpolation for smooth rendering.

        // Clear canvas before rendering.
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Render tile layer.
        if (this.tileRenderer) {
            // Update tile transform data if needed.
            this.tileRenderer.updateTransformData(visibleTiles);
            this.tileRenderer.render();
        }

        // Render sprites.
        if (this.spriteRenderer) {
            this.spriteRenderer.updateTransformData(entitiesPool);
            this.spriteRenderer.render();
        }

        // Render fog of war, if any.
        // TODO: Implement Fog of War at some point :)

        // Render selection rectangles, if any.
        if (this.rectangleRenderer && selectionRectangles.length) {
            this.rectangleRenderer.updateTransformData(selectionRectangles);
            this.rectangleRenderer.render();
        }

        // Render cursor, if any. Uses same renderer and texture as sprites.
        if (this.spriteRenderer && selectAnimPool[0].active) {
            this.spriteRenderer.updateTransformData(selectAnimPool);
            this.spriteRenderer.render();
        }

        this.gl.flush();
    }

    dispose(): void {
        this.tileRenderer?.dispose();
        this.spriteRenderer?.dispose();
        this.rectangleRenderer?.dispose();
    }

}

