import * as utils from "./utils";
import { Point, M3x3 } from "./maths";
import { TEntity, TParameters } from "./type";
import { CONFIG } from './config';

// TILE MAP VERTEX SHADER
const tileMapVertexShaderSource = /*glsl*/ `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aOffset;
layout(location=2) in float aScale;
layout(location=3) in vec4 aColor;
layout(location=4) in vec2 aTexCoord;
layout(location=5) in float aDepth;

out vec4 vColor;
out vec2 vTexCoord;
out float vDepth;

void main()
{
    vColor = aColor;
    vTexCoord = aTexCoord;
    vDepth = aDepth;
    gl_Position = vec4(aPosition.xyz * aScale + aOffset, 1.0);
}`;

// TILE MAP FRAGMENT SHADER
const tileMapFragmentShaderSource = /*glsl*/ `#version 300 es

precision mediump float;

uniform mediump sampler2DArray uSampler;

in vec4 vColor;
in vec2 vTexCoord;
in float vDepth;

out vec4 fragColor;

void main()
{
    fragColor = texture(uSampler, vec3(vTexCoord, vDepth));
}`;

// ENTITIES VERTEX SHADER
const entityVertexShaderSource = /*glsl*/ `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec2 aTexCoord;
layout(location=2) in vec3 aOffset;
layout(location=3) in float aScale;
layout(location=4) in vec2 aUV;
layout(location=5) in vec4 aColor;

out vec2 vTexCoord;
out vec4 vColor;

void main()
{
    vColor = aColor;
    vTexCoord = vec2(aTexCoord * 0.015625) + aUV;
    gl_Position = vec4(aPosition.xyz * aScale + aOffset, 1.0);
}`;

// ENTITIES FRAGMENT SHADER
const entityFragmentShaderSource = /*glsl*/ `#version 300 es

precision mediump float;

uniform mediump sampler2D uSampler;

in vec4 vColor;
in vec2 vTexCoord;

out vec4 fragColor;

void main()
{
    fragColor = texture(uSampler, vTexCoord);
}`;

document.addEventListener('DOMContentLoaded', (event) => {
    if (!window.game) {
        window.game = new Game();
    } else {
        console.log('Game instance already started');
    }
});

export class Game {

    inputManager: InputManager;

    // HTML Elements
    startButtonElement: HTMLButtonElement = document.createElement("button");
    resolutionSelectElement: HTMLSelectElement = document.createElement("select");

    // Canvas Properties
    lastDisplayWidth = 0;
    lastDisplayHeight = 0;
    canvasElement: HTMLCanvasElement;
    canvasBoundingRect: DOMRect;
    glContext: WebGL2RenderingContext;

    // Game Screen Properties
    worldSpaceMatrix: M3x3;
    aspectRatio = 1; // set in startGame, this is display aspect ratio
    gameScreenWidth = 0; // set in startGame, this is game screen size
    gameScreenHeight = 0;
    gameWidthRatio = 0; // set in startGame, this is game screen ratio to the canvas size
    gameHeightRatio = 0;
    scrollEdgeX = 0; // set in startGame, constants for finding trigger zone
    scrollEdgeY = 0;

    // Map Tile Properties
    tileRatio = CONFIG.GAME.TILE.BITMAP_SIZE / CONFIG.GAME.TILE.SIZE;
    initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1; // set in startGame
    initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
    maxMapX = (CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.TILE.SIZE) - 1;
    maxMapY = (CONFIG.GAME.MAP.HEIGHT * CONFIG.GAME.TILE.SIZE) - 1;
    maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
    maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;

    // Game state Properties
    gamemap: number[] = [];
    started = false;
    gameAction = 0    // 0 = none
    entities!: Entities;
    entityBehaviors!: EntityBehavior;

    // Mouse Cursor Properties
    documentElementClassList: DOMTokenList; // Css rules rely on this to change cursor.
    currentCursorClass = ""; // "cur-pointer", "cur-target", "cur-select" ...

    // Command Acknowledged Widget Animation Properties
    widgetAnim = 0
    widgetAnimTotal = 6
    widgetAnimX = 0
    widgetAnimY = 0

    // Scroll Properties
    scrollX = 0; // Current scroll position 
    scrollY = 0;

    // Image Assets
    creaturesImage!: HTMLImageElement;
    tilesImage!: HTMLImageElement;

    // Game-State Ticks (at 8 fps)
    tickAccumulator = 0; // What remained in deltaTime after last update 
    currentTick = 0;
    timePerTick = 1000 / CONFIG.GAME.TIMING.TICK_RATE; // dt in ms (125 is 8 per second)
    timerTriggerAccum = this.timePerTick * 3; // 3 times the timePerTick

    // Graphic Animations (at 15 fps)
    animAccumulator = 0; // What remained in deltaTime after last update 
    currentAnim = 0;
    timePerAnim = 1000 / CONFIG.GAME.TIMING.ANIM_RATE; // dt in ms (66.66 is 15 per second)

    // FPS counter
    lastTime = 0;
    fps = 0;
    fpsInterval = CONFIG.GAME.TIMING.FPS_UPDATE_INTERVAL; // Update FPS every 1 second
    fpsLastTime = 0;

    constructor() {
        console.log("constructing game");

        this.documentElementClassList = document.documentElement.classList;

        this.canvasElement = document.createElement('canvas');
        document.body.appendChild(this.canvasElement);

        this.canvasBoundingRect = this.canvasElement.getBoundingClientRect();
        this.setDimensionsVars();

        this.glContext = this.canvasElement.getContext('webgl2')!;

        this.worldSpaceMatrix = new M3x3();

        // Prevent right-click context menu
        this.canvasElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        // Canvas has style width: 100vw; and style height: 100vh;
        const resizeObserver = new ResizeObserver(this.handleCanvasResize.bind(this));
        resizeObserver.observe(this.canvasElement, { box: 'content-box' });

        // Create a 'loading...' text element centered on screen
        const loadingText = document.createElement('div');
        loadingText.classList.add("loading-text");
        loadingText.textContent = 'Loading...';

        document.body.appendChild(loadingText);

        // Using promises, after both image assets have loaded, call mainMenu
        const creaturesPromise = utils.loadImage('images/alien.png');
        const tilesPromise = utils.loadImage('images/plancher-vertical.png');
        Promise.all([creaturesPromise, tilesPromise]).then((images) => {
            document.body.removeChild(loadingText);
            this.creaturesImage = images[0];
            this.tilesImage = images[1];
            this.mainMenu();
        });

        this.inputManager = new InputManager(this);

    }

    handleCanvasResize(entries: ResizeObserverEntry[]): void {
        // Canvas has style width: 100vw; and style height: 100vh;
        // So we need to handle a window resize which changes the canvas size.
        for (const entry of entries) {
            let width;
            let height;
            let dpr = window.devicePixelRatio;
            if (entry.devicePixelContentBoxSize) {
                // NOTE: Only this path gives the correct answer
                // The other 2 paths are an imperfect fallback
                // for browsers that don't provide anyway to do this
                width = entry.devicePixelContentBoxSize[0].inlineSize;
                height = entry.devicePixelContentBoxSize[0].blockSize;
                dpr = 1; // it's already in width and height
            } else if (entry.contentBoxSize) {
                if (entry.contentBoxSize[0]) {
                    width = entry.contentBoxSize[0].inlineSize;
                    height = entry.contentBoxSize[0].blockSize;
                } else {
                    // legacy mozilla impl using only contentBox
                    // @ts-expect-error
                    width = entry.contentBoxSize.inlineSize;
                    // @ts-expect-error
                    height = entry.contentBoxSize.blockSize;
                }
            } else {
                // legacy
                width = entry.contentRect.width;
                height = entry.contentRect.height;
            }
            const displayWidth = Math.round(width * dpr);
            const displayHeight = Math.round(height * dpr);
            [this.lastDisplayWidth, this.lastDisplayHeight] = [displayWidth, displayHeight];

            this.setDimensionsVars();
        }
    }

    setDimensionsVars(): DOMRect {
        this.canvasBoundingRect = this.canvasElement.getBoundingClientRect();
        this.gameWidthRatio = (this.gameScreenWidth / this.canvasBoundingRect.width);
        this.gameHeightRatio = (this.gameScreenHeight / this.canvasBoundingRect.height)
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;

        const wRatio = this.lastDisplayWidth / (this.lastDisplayHeight / this.gameScreenHeight);
        this.worldSpaceMatrix = new M3x3().translation(-1, 1).scale(2 / wRatio, -2 / this.gameScreenHeight);

        return this.canvasBoundingRect;
    }

    resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
        // Get the size the browser is displaying the canvas in device pixels.
        const [displayWidth, displayHeight] = [this.lastDisplayWidth, this.lastDisplayHeight];

        // Check if the canvas is not the same size.
        const needResize = canvas.width !== displayWidth ||
            canvas.height !== displayHeight;

        if (needResize) {
            // Make the canvas the same size
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }

        return needResize;
    }

    update(timestamp: number, skipRender?: boolean): void {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.tickAccumulator += deltaTime;
        this.animAccumulator += deltaTime;

        this.procGame();

        while (this.animAccumulator >= this.timePerAnim) {
            this.animateCursor();
            this.animAccumulator -= this.timePerAnim;
        }

        while (this.tickAccumulator >= this.timePerTick) {
            this.tick();
            this.tickAccumulator -= this.timePerTick;
        }

        if (!skipRender) {
            // Gather render data and interpolate
            this.render(this.tickAccumulator / this.timePerTick);
        }

        // Calculate FPS
        if (timestamp - this.fpsLastTime > this.fpsInterval) {
            this.fps = Math.round(1000 / deltaTime);
            this.fpsLastTime = timestamp;
            // console.log('RFA FPS ', this.fps); // 30
        }

    }

    setCursor(newClass: string) {
        if (this.currentCursorClass !== newClass) {
            if (this.currentCursorClass) {
                this.documentElementClassList.remove(this.currentCursorClass); // Remove from html
            }
            this.documentElementClassList.add(newClass); // Add to html
            this.currentCursorClass = newClass; // Update the tracked cursor class
        }
    }

    animateCursor(): void {
        // Animate at 15 FPS

        // Cursor
        if (this.widgetAnim) {
            this.widgetAnim += 1;
            if (this.widgetAnim > this.widgetAnimTotal)
                this.widgetAnim = 0
        }

    }

    interpolate(min: Point, max: Point, fract: number): Point {
        return new Point(max.x + (min.x - max.x) * fract, max.y + (min.y - max.y) * fract);
    }

    render(interpolation: number): void {

        // Before rendering, resize canvas to display size. (in case of changing window size)
        this.resizeCanvasToDisplaySize(this.canvasElement);

        // Clear the canvas
        this.glContext.clearColor(0.0, 0.0, 0.0, 1.0); // Set base buffer color to black 
        this.glContext.clear(this.glContext.COLOR_BUFFER_BIT);

        this.glContext.clearColor(0.0, 0.0, 0.0, 0.0); // Set base buffer color to black fully transparent

        // Render the game

        // TODO: Render the game map
        // TODO: Render the game entities

        // Finished
        this.glContext.flush();
    }

    mainMenu(): void {
        // The images have loaded, so it's time to show the pre-game menu

        // Create the start button
        this.startButtonElement.textContent = "Start Game";
        this.startButtonElement.classList.add("btn-start");

        document.body.appendChild(this.startButtonElement);

        // Create the dropdown for screen resolution
        this.resolutionSelectElement.classList.add("resolution-select");


        // Populate the dropdown with options
        for (const { label, width, height } of CONFIG.DISPLAY.RESOLUTIONS) {
            const option = document.createElement("option");
            option.value = `${width}x${height}`;
            option.textContent = label;
            this.resolutionSelectElement.appendChild(option);
        }
        document.body.appendChild(this.resolutionSelectElement);

        // Use resolutionSelect.selectedIndex to get the selected resolution

        this.startButtonElement.addEventListener("click", this.startGame.bind(this));

    }

    startGame(): void {
        const resolution = CONFIG.DISPLAY.RESOLUTIONS[this.resolutionSelectElement.selectedIndex];
        this.aspectRatio = resolution.width / resolution.height;
        this.gameScreenWidth = resolution.width;
        this.gameScreenHeight = resolution.height;
        this.scrollEdgeX = this.gameScreenWidth - CONFIG.DISPLAY.SCROLL.BORDER; // constants for finding trigger zone
        this.scrollEdgeY = this.gameScreenHeight - CONFIG.DISPLAY.SCROLL.BORDER;

        // Re-set 
        this.initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1;
        this.initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;

        console.log('Starting the game with aspect ratio', this.aspectRatio);

        this.setCursor("cur-pointer");

        this.inputManager.init();

        this.startButtonElement.style.display = 'none';
        this.resolutionSelectElement.style.display = 'none';
        this.started = true;
        // Setup timer in case RAF Skipped when minimized or not in foreground.
        setInterval(() => { this.checkUpdate(); }, 500);
        this.loop(0);
    }

    initGameStates(): void {
        // Build entities pool
        this.entities = new Entities(100);
        this.entityBehaviors = new EntityBehavior(this);

        // Fill Entities pool
        // EXPERIMENTAL TEST: Create 3 test Aliens
        const alien1 = this.entities.spawn();
        alien1.type = 1;
        alien1.hitPoints = 100;
        alien1.x = 515;
        alien1.y = 100;
        const alien2 = this.entities.spawn();
        alien2.type = 1;
        alien2.hitPoints = 100;
        alien2.x = 0;
        alien2.y = 0;
        const alien3 = this.entities.spawn();
        alien3.type = 1;
        alien3.hitPoints = 100;
        alien3.x = 64;
        alien3.y = 64;

        // Build Map (Will later be bigger maps loaded from file)
        // EXPERIMENTAL TEST: temp map 9 by 9 tiles 
        for (let temp1 = 0; temp1 < 8; temp1++) { // start with 8 ROWS 
            this.gamemap.push(temp1 * 8); // added row total 1 width COLUMN
            for (let temp2 = 0; temp2 < 8; temp2++) {  // + 8 COLUMNS
                this.gamemap.push(temp2 + temp1 * 8); // here add for total of 9 width COLUMNS
            }
        }
        this.gamemap[21] = 3; // Proof CHANGE THOSE GAMEMAPS TO PROVE THEY ARE TILES
        for (let temp = 0; temp < 9; temp++) { // add last row for total of 9 ROWS
            this.gamemap.push(temp + 56);
        }
    }

    toggleGameMenu(): void {
        console.log('Toggle Game Menu'); // Todo: Implement Game Menu
    }

    procGame(): void {

        // procgame processes a game frame, animating each RFA.
        // Note: This is not a game-states tick, at timePerTick intervals.

        if (this.gameAction) {

            switch (this.gameAction) {
                case CONFIG.GAME.ACTIONS.DEFAULT:
                    this.trydefault()
                    break;
                case CONFIG.GAME.ACTIONS.RELEASESEL:
                    this.tryselect()
                    break;

                default:
                    break;
            }

        }

        this.gameAction = 0 // -------------- no more game actions to do

        // Scroll if not currently dragging a selection.
        if (!this.inputManager.isSelecting) {
            const scrollVelocity = this.inputManager.scrollVelocity;
            this.scrollX += scrollVelocity.x;
            this.scrollY += scrollVelocity.y;
            if (this.scrollX > this.maxScrollX) {
                this.scrollX = this.maxScrollX;
            }
            if (this.scrollX < 0) {
                this.scrollX = 0;
            }
            if (this.scrollY > this.maxScrollY) {
                this.scrollY = this.maxScrollY;
            }
            if (this.scrollY < 0) {
                this.scrollY = 0;
            }
        }
    }

    checkUpdate(): void {
        // Checks for needed ticks to be computed if game is minimized
        const timestamp = performance.now();
        const deltaTime = timestamp - this.lastTime;
        if ((this.tickAccumulator + deltaTime) < this.timerTriggerAccum) {
            return;
        }
        // It's been a while, game is minimized: update without rendering.
        this.update(timestamp, true);
    }

    tick(): void {

        // Advance game states in pool:
        // meaning, from currentTick count, to the next one.

        // #########################################

        /*
        let processed = 0;
        let entity;
        for (let i = 0; processed < this.entities.active || i < this.entities.total; i++) {
            entity = this.entities.pool[i];
            if (entity.active) {
                processed += 1;
                this.ai.process(entity);
            }
        }
        */

        this.inputManager.processInputs();

        // Update currentTick count
        this.currentTick += 1;
    }

    loop(timestamp: number): void {
        this.update(timestamp);
        requestAnimationFrame(this.loop.bind(this));
    }

    trydefault(): void {
        const gamePosition = this.inputManager.gamePosition;
        console.log('default', gamePosition.x, gamePosition.y);
        // TODO : Replace with test cursor animation with the real default action
        // TEST START WIDGET ANIMATION ON DEFAULT ACTION
        this.widgetAnim = 1;
        this.widgetAnimX = gamePosition.x - 32;
        this.widgetAnimY = gamePosition.y - 32;

    }

    tryselect(): void {
        // Called from procGame
        const selectionStart = this.inputManager.selectionStart;
        const selectionEnd = this.inputManager.selectionEnd;
        console.log('select', selectionStart.x, selectionStart.y, selectionEnd.x, selectionEnd.y);
    }


}

class InputManager {
    private game: Game;
    private keysPressed: Record<string, boolean> = {};
    private selecting: boolean = false;
    private mouseX = 0;
    private mouseY = 0;
    private gameMouseX = 0;
    private gameMouseY = 0;
    private selX = 0;
    private selY = 0;
    private gameSelStartX = 0;
    private gameSelStartY = 0;
    private gameSelEndX = 0;
    private gameSelEndY = 0;
    private scrollNowX = 0;
    private scrollNowY = 0;

    constructor(game: Game) {
        this.game = game;
    }

    public get mousePosition(): { x: number, y: number } {
        return { x: this.mouseX, y: this.mouseY };
    }

    public get gamePosition(): { x: number, y: number } {
        return { x: this.gameMouseX, y: this.gameMouseY };
    }

    public get selectionStart(): { x: number, y: number } {
        return { x: this.gameSelStartX, y: this.gameSelStartY };
    }

    public get selectionEnd(): { x: number, y: number } {
        return { x: this.gameSelEndX, y: this.gameSelEndY };
    }

    public get scrollVelocity(): { x: number, y: number } {
        return { x: this.scrollNowX, y: this.scrollNowY };
    }


    public init(): void {
        window.addEventListener("keydown", this.handleKeyDown.bind(this));
        window.addEventListener("keyup", this.handleKeyUp.bind(this));
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mousedown", this.handleMouseDown.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
        window.addEventListener("wheel", this.handleMouseWheel.bind(this), { passive: false });
    }
    private handleKeyDown(e: KeyboardEvent): void {
        this.keysPressed[e.key] = true;
        if (e.key === 'F10') {
            e.preventDefault();
            this.game.toggleGameMenu();
        }
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
            e.preventDefault();
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.keysPressed[e.key] = false;
    }

    private handleMouseMove(event: MouseEvent): void {
        this.setCursorPos(event);
        this.scrollNowX = 0;
        this.scrollNowY = 0;

        if (this.mouseX > this.game.scrollEdgeX) {
            this.scrollNowX = CONFIG.DISPLAY.SCROLL.SPEED;
        }
        if (this.mouseY > this.game.scrollEdgeY) {
            this.scrollNowY = CONFIG.DISPLAY.SCROLL.SPEED;
        }
        if (this.mouseX < CONFIG.DISPLAY.SCROLL.BORDER) {
            this.scrollNowX = -CONFIG.DISPLAY.SCROLL.SPEED;
        }
        if (this.mouseY < CONFIG.DISPLAY.SCROLL.BORDER) {
            this.scrollNowY = -CONFIG.DISPLAY.SCROLL.SPEED;
        }
    }

    private handleMouseDown(event: MouseEvent): void {
        this.setCursorPos(event);
        if (!this.selecting) {
            if (event.button === 0) {
                this.selecting = true;
                this.game.setCursor('cur-target');
                this.selX = this.mouseX;
                this.selY = this.mouseY;
                this.gameSelStartX = this.selX + this.game.scrollX;
                this.gameSelStartY = this.selY + this.game.scrollY;
            }
            if (event.button === 2) {
                this.game.gameAction = CONFIG.GAME.ACTIONS.DEFAULT;
            }
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        this.setCursorPos(event);
        if (event.button === 0) {
            this.gameSelEndX = this.mouseX + this.game.scrollX;
            this.gameSelEndY = this.mouseY + this.game.scrollY;
            this.selecting = false;
            this.game.setCursor('cur-pointer');
            this.game.gameAction = CONFIG.GAME.ACTIONS.RELEASESEL;
        }
    }
    private handleMouseWheel(event: WheelEvent): void {
        if (event.ctrlKey) {
            event.preventDefault();
        }
        if (event.deltaY < 0) {
            // Todo: Zoom in
            console.log("CTRL+Scroll Up"); // You could trigger a specific game action here
        } else if (event.deltaY > 0) {
            // Todo: Zoom out
            console.log("CTRL+Scroll Down");
        }
    }

    private setCursorPos(event: MouseEvent): void {
        this.mouseX = event.clientX * (this.game.gameScreenWidth / this.game.canvasBoundingRect.width);
        this.mouseY = event.clientY * (this.game.gameScreenHeight / this.game.canvasBoundingRect.height);
        this.gameMouseX = this.mouseX + this.game.scrollX;
        this.gameMouseY = this.mouseY + this.game.scrollY;
    }

    public processInputs(): void {
        if (this.keysPressed['ArrowUp'] || this.keysPressed['w']) {
            //
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['s']) {
            //
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['a']) {
            // 
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['d']) {
            //
        }
        if (!this.selecting) {
            this.updateScroll();
        }
    }

    private updateScroll(): void {
        this.game.scrollX += this.scrollNowX;
        this.game.scrollY += this.scrollNowY;

        // Clamp scroll values
        this.game.scrollX = Math.max(0, Math.min(this.game.scrollX, this.game.maxScrollX));
        this.game.scrollY = Math.max(0, Math.min(this.game.scrollY, this.game.maxScrollY));
    }

    public get isSelecting(): boolean {
        return this.selecting;
    }


}

/**
 * Singleton Entities Object Pool
 */
export class Entities {

    public total: number;
    public active: number = 0;
    public pool: Array<TEntity> = [];
    private lastId = 0;

    constructor(initialPoolSize: number) {
        this.total = initialPoolSize;
        for (let i = 0; i < initialPoolSize; i++) {
            this.pool.push({
                id: 0,
                type: 0,
                hitPoints: 0,
                state: 0,
                x: 0,
                y: 0,
                orderQty: 0,
                orderIndex: 0,
                orderPool: [
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                ],
                orientation: 0,
                frameIndex: 0,
                active: false,
            });
        }

    }

    spawn(): TEntity {
        if (this.active === this.total) {
            throw new Error("Pool Full");
        }
        const entity = this.pool.find(e => !e.active);
        if (entity) {
            entity.active = true;
            entity.id = ++this.lastId;
            this.active++;
            return entity;
        } else {
            throw new Error("Pool Full");
        }
    }

    remove(entity: TEntity): void {
        this.active--;
        entity.active = false;
    }


}

export class EntityBehavior {

    public game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    public process(entity: TEntity): void {
        switch (entity.type) {
            case 1:
                this.alien(entity)
                break;

            default:
                break;
        }
    }

    private alien(entity: TEntity): void {
        // test by just incrementing forward in animations
        // 249 is the number of frames in the sprite sheet
        entity.frameIndex = (entity.frameIndex + 1) % 249;
        // TODO : Add real behaviors!
    }


}

export class ShaderProgram {

    public gl!: WebGL2RenderingContext;
    public program!: WebGLProgram;
    public parameters: Record<string, TParameters> = {};

    constructor(gl: WebGL2RenderingContext, vs: string, fs: string) {
        this.gl = gl;

        const vsShader = this.getShader(vs, gl.VERTEX_SHADER);
        const fsShader = this.getShader(fs, gl.FRAGMENT_SHADER);

        if (vsShader && fsShader) {
            this.program = gl.createProgram()!;
            gl.attachShader(this.program, vsShader);
            gl.attachShader(this.program, fsShader);
            gl.linkProgram(this.program);
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                console.error("Cannot load shader \n" + gl.getProgramInfoLog(this.program));
            }

            this.gatherParameters();

            gl.detachShader(this.program, vsShader);
            gl.detachShader(this.program, fsShader);
            gl.deleteShader(vsShader);
            gl.deleteShader(fsShader);

            gl.useProgram(null);
        }
    }

    getShader(script: string, type: number): WebGLShader | null {
        const gl = this.gl;
        const output = gl.createShader(type);
        if (output) {
            gl.shaderSource(output, script);
            gl.compileShader(output);
            if (!gl.getShaderParameter(output, gl.COMPILE_STATUS)) {
                console.error("Shader Error: \n" + gl.getShaderInfoLog(output));
                return null;
            }
        }
        return output;
    }

    gatherParameters(): void {
        const gl = this.gl;
        let isUniform = 0;

        this.parameters = {};
        while (isUniform < 2) {
            let paramType = isUniform ? gl.ACTIVE_UNIFORMS : gl.ACTIVE_ATTRIBUTES;
            let count = gl.getProgramParameter(this.program, paramType);

            for (let i = 0; i < count; i++) {
                let details;
                let location;
                if (isUniform) {
                    details = gl.getActiveUniform(this.program, i);
                    location = gl.getUniformLocation(this.program, details!.name);
                    this.parameters[details!.name] = {
                        location: location as WebGLUniformLocation,
                        uniform: true,
                        type: details!.type
                    };
                } else {
                    details = gl.getActiveAttrib(this.program, i);
                    location = gl.getAttribLocation(this.program, details!.name);
                    this.parameters[details!.name] = {
                        location: location as number,
                        uniform: false,
                        type: details!.type
                    };
                }

            }
            isUniform++;
        }

    }

    setParam(w_name: string, a?: any, b?: any, c?: any, d?: any) {

        if (!(w_name in this.parameters)) {
            return;
        }

        const gl = this.gl;
        const param = this.parameters[w_name];

        if (param.uniform) {
            this.setUniform(param, a, b, c, d);
        } else {
            this.setAttribute(param, a, b, c, d);
        }

    }

    private setUniform(param: TParameters & { uniform: true }, a?: any, b?: any, c?: any, d?: any) {
        const gl = this.gl;

        switch (param.type) {
            case gl.FLOAT:
                gl.uniform1f(param.location, a);
                break;
            case gl.FLOAT_VEC2:
                gl.uniform2f(param.location, a, b);
                break;
            case gl.FLOAT_VEC3:
                gl.uniform3f(param.location, a, b, c);
                break;
            case gl.FLOAT_VEC4:
                gl.uniform4f(param.location, a, b, c, d);
                break;
            case gl.FLOAT_MAT3:
                gl.uniformMatrix3fv(param.location, false, a);
                break;
            case gl.FLOAT_MAT4:
                gl.uniformMatrix4fv(param.location, false, a);
                break;
            case gl.SAMPLER_2D:
                gl.uniform1i(param.location, a);
                break;
            default:
                console.warn(`Unsupported uniform type: ${param.type}`);
        }
    }

    private setAttribute(param: TParameters & { uniform: false }, a?: any, b?: any, c?: any, d?: any) {
        const gl = this.gl;

        gl.enableVertexAttribArray(param.location);
        const type = a ?? gl.FLOAT;
        const normalized = b ?? false;
        const stride = c ?? 0;
        const offset = d ?? 0;

        switch (param.type) {
            case gl.FLOAT:
                gl.vertexAttribPointer(param.location, 1, type, normalized, stride, offset);
                break;
            case gl.FLOAT_VEC2:
                gl.vertexAttribPointer(param.location, 2, type, normalized, stride, offset);
                break;
            case gl.FLOAT_VEC3:
                gl.vertexAttribPointer(param.location, 3, type, normalized, stride, offset);
                break;
            case gl.FLOAT_VEC4:
                gl.vertexAttribPointer(param.location, 4, type, normalized, stride, offset);
                break;
            default:
                console.warn(`Unsupported attribute type: ${param.type}`);
        }
    }

}

