import * as utils from "./utils";
import { Vec2, TEntity, TParameters, GLResources, ShaderType, TileBufferData, SpriteUpdate, SpriteBufferData } from "./type";
import { CONFIG } from './config';
import { SHADERS } from './shaders';

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
    gl: WebGL2RenderingContext;
    worldBuffer: WebGLBuffer | null = null;

    // Game Screen Properties
    aspectRatio = 1; // set in startGame, this is display aspect ratio
    gameScreenWidth = 0; // set in startGame, this is game screen size, used as uWorldX.
    gameScreenHeight = 0; // Used as uWorldY.
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
    tileRenderer: TileRenderer | null = null;
    spriteRenderer: SpriteRenderer | null = null;
    mapChanged = false;

    // Game state Properties
    gamemap: number[] = [];
    started = false;
    gameAction = 0;    // 0 = none
    entities!: Entities;
    entityBehaviors!: EntityBehavior;

    // Mouse Cursor Properties
    documentElementClassList: DOMTokenList; // Css rules rely on this to change cursor.
    currentCursorClass = ""; // "cur-pointer", "cur-target", "cur-select" ...

    // Command Acknowledged Widget Animation Properties
    widgetAnim = 0;
    widgetAnimTotal = 6;
    widgetAnimX = 0;
    widgetAnimY = 0;

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

        this.gl = this.canvasElement.getContext('webgl2')!;
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // transparent black

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
            this.resizeCanvasToDisplaySize(this.canvasElement);
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

            // Set the viewport to fill the canvas
            this.gl.viewport(0, 0, canvas.width, canvas.height); // This will also clear the canvas  
            this.setUboWorldTransforms();
        }

        return needResize;
    }

    setUboWorldTransforms() {

        // Set ubo values for world transform
        const worldData = new Float32Array([2 / this.gameScreenWidth, 2 / -this.gameScreenHeight]);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.worldBuffer);
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, worldData);

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
            // Gather renderable data and interpolate
            this.render(this.tickAccumulator / this.timePerTick);
        }

        // Calculate FPS
        if (timestamp - this.fpsLastTime > this.fpsInterval) {
            this.fps = Math.round(1000 / deltaTime);
            this.fpsLastTime = timestamp;
            // console.log('RAF FPS ', this.fps); // 30
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
                this.widgetAnim = 0;
        }

    }

    render(interpolation: number): void {

        // Set clear color to black
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        // Before rendering, resize canvas to display size. (in case of changing window size)
        if (!this.resizeCanvasToDisplaySize(this.canvasElement)) {
            // If it did not resize and call gl.viewport which clears the canvas, we need to clear it again.
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        }

        // Render the game


        // 1 Render the game map. Map states are in this.gamemap and rarely change.
        if (this.tileRenderer) {
            if (this.mapChanged) {
                this.tileRenderer.updateTransformData(this.gamemap);
                this.mapChanged = false;
            }
            this.tileRenderer.render();
        }

        // TODO: 2 Render the game entities. Entity states are in this.entities.pool and change often.
        if (this.spriteRenderer) {
            this.spriteRenderer.updateTransformData(this.entities.pool);

            this.spriteRenderer.render();

        }


        // TODO: 3 Render Selection lines, if user is selecting.

        // Finished
        this.gl.flush();
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

        // Start the game
        this.initGameStates();
        this.started = true;

        // Setup timer in case RAF Skipped when minimized or not in foreground.
        setInterval(() => { this.checkUpdate(); }, 500);
        this.loop(0);
    }

    initGameStates(): void {

        // For now, we will just create a TileRenderer
        console.log(this.gameScreenWidth, this.gameScreenHeight);
        this.tileRenderer = new TileRenderer(this.gl, this.tilesImage, this.initRangeX * this.initRangeY);
        this.spriteRenderer = new SpriteRenderer(this.gl, this.creaturesImage, CONFIG.GAME.ENTITY.INITIAL_POOL_SIZE); // TODO: Implement SpriteRenderer
        // const lineRenderer = new RectangleRenderer(this.gl); // TODO: Implement RectangleRenderer

        // Create a uniform buffer
        this.worldBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.worldBuffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, 2 * Float32Array.BYTES_PER_ELEMENT, this.gl.DYNAMIC_DRAW);

        // Bind the buffer to binding point 0
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.worldBuffer);

        // Set the uniform block binding for both programs
        const tileProgram = this.tileRenderer.program;
        const spriteProgram = this.spriteRenderer.program;
        // const lineProgram = lineRenderer.program;

        const worldIndex = 0; // Binding point 0

        const tileBlockIndex = this.gl.getUniformBlockIndex(tileProgram, 'World');
        this.gl.uniformBlockBinding(tileProgram, tileBlockIndex, worldIndex);

        const spriteBlockIndex = this.gl.getUniformBlockIndex(spriteProgram, 'World');
        this.gl.uniformBlockBinding(spriteProgram, spriteBlockIndex, worldIndex);

        // const lineBlockIndex = this.gl.getUniformBlockIndex(lineProgram, 'World');
        // this.gl.uniformBlockBinding(lineProgram, lineBlockIndex, worldIndex);

        this.setUboWorldTransforms(); // Initial set of ubo values

        window.addEventListener('unload', () => {
            this.tileRenderer?.dispose();
            this.spriteRenderer?.dispose();
            // lineRenderer?.dispose();
        });

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
        alien1.frameIndex = 33;
        const alien2 = this.entities.spawn();
        alien2.type = 1;
        alien2.hitPoints = 100;
        alien2.x = 0;
        alien2.y = 0;
        alien2.orientation = 4;
        const alien3 = this.entities.spawn();
        alien3.type = 1;
        alien3.hitPoints = 100;
        alien3.x = 64;
        alien3.y = 64;
        alien3.orientation = 9;

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

        this.mapChanged = true;
    }

    toggleGameMenu(): void {
        console.log('Toggle Game Menu'); // Todo: Implement Game Menu
    }

    procGame(): void {

        // procgame processes a game frame, animating each RAF.
        // Note: This is not a game-states tick, at timePerTick intervals.

        if (this.gameAction) {

            switch (this.gameAction) {
                case CONFIG.GAME.ACTIONS.DEFAULT:
                    this.trydefault();
                    break;
                case CONFIG.GAME.ACTIONS.RELEASESEL:
                    this.tryselect();
                    break;

                default:
                    break;
            }

        }

        this.gameAction = 0; // -------------- no more game actions to do

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

    /**
     * Advance game states in pool from currentTick count, to the next one.
     */
    tick(): void {

        // Process Entities
        let processed = 0;
        let entity;
        for (let i = 0; processed < this.entities.active || i < this.entities.total; i++) {
            entity = this.entities.pool[i];
            if (entity.active) {
                processed += 1;
                this.entityBehaviors.process(entity);
            }
        }

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

export class InputManager {
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
                oldX: 0,
                oldY: 0,
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
                this.alien(entity);
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

abstract class BaseRenderer {
    protected gl: WebGL2RenderingContext;
    public program: WebGLProgram;
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
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource)!;
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource)!;

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
        const shader = this.gl.createShader(type)!;
        this.resources.shaders.push(shader);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(this.gl.getShaderInfoLog(shader));
            throw new Error('Shader compilation failed');
        }
        return shader;
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

    abstract updateTransformData(data: any[]): void; // This will also set dirtyTransforms to true.

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

class TileRenderer extends BaseRenderer {
    private transformBuffer: WebGLBuffer;
    private modelBuffer: WebGLBuffer;
    private transformData: Float32Array;
    private image: HTMLImageElement
    private texture: WebGLTexture;
    private renderMax: number = 0;

    constructor(gl: WebGL2RenderingContext, image: HTMLImageElement, size: number) {
        super(gl, SHADERS.TILE_VERTEX_SHADER, SHADERS.TILE_FRAGMENT_SHADER);

        // Move existing shader setup & buffer creation here
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

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.modelBuffer); // Bind the buffer (meaning "use this buffer" for the following operations)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, CONFIG.TEXTURE_MODEL_DATA, this.gl.STATIC_DRAW); // Put data in the buffer
        this.setupAttribute(0, 2, 16, 0);
        this.setupAttribute(1, 2, 16, 8);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer); // Bind the buffer (meaning "use this buffer for the following operations")
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.transformData, this.gl.DYNAMIC_DRAW); // Change to DYNAMIC_DRAW to allow updates);
        this.setupAttribute(2, 2, 28, 0, 1);
        this.setupAttribute(3, 1, 28, 8, 1);
        this.setupAttribute(4, 3, 28, 12, 1);
        this.setupAttribute(5, 1, 28, 24, 1);

        this.gl.bindVertexArray(null); // All done, unbind the VAO

    }

    updateTransformData(data: number[]): void {
        console.log('Updating TileRenderer with new data');
        const bufferData: TileBufferData[] = []
        for (let i = 0; i < data.length; i++) {
            bufferData.push({
                posX: (i % 9) * CONFIG.GAME.TILE.SIZE,
                posY: Math.floor(i / 9) * CONFIG.GAME.TILE.SIZE,
                scale: CONFIG.GAME.TILE.SIZE,
                colorR: 1,
                colorG: 1,
                colorB: 1,
                depth: data[i]
            });
        }

        // TileBufferData
        for (let i = 0; i < bufferData.length; i++) {
            const offset = i * 7;
            const d = bufferData[i];
            this.transformData[offset] = d.posX;
            this.transformData[offset + 1] = d.posY;
            this.transformData[offset + 2] = d.scale;
            this.transformData[offset + 3] = d.colorR;
            this.transformData[offset + 4] = d.colorG;
            this.transformData[offset + 5] = d.colorB;
            this.transformData[offset + 6] = d.depth;
        }
        this.renderMax = data.length;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.transformData, 0);

    }

    render(): void {
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.renderMax);
    }

}

class SpriteRenderer extends BaseRenderer {
    private transformBuffer: WebGLBuffer;
    private modelBuffer: WebGLBuffer;
    private transformData: Float32Array;
    private image: HTMLImageElement
    private texture: WebGLTexture;
    private renderMax: number = 0;

    constructor(gl: WebGL2RenderingContext, image: HTMLImageElement, size: number) {
        super(gl, SHADERS.SPRITE_VERTEX_SHADER, SHADERS.SPRITE_FRAGMENT_SHADER);

        // Move existing shader setup & buffer creation here
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
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 4096, 4096, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.image);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR); // TODO : TRY MORE FILTERS ?
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR); // TODO : TRY MORE FILTERS ?
        this.gl.generateMipmap(this.gl.TEXTURE_2D);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.modelBuffer); // Bind the buffer (meaning "use this buffer" for the following operations)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, CONFIG.TEXTURE_MODEL_DATA, this.gl.STATIC_DRAW); // Put data in the buffer
        this.setupAttribute(0, 2, 16, 0);
        this.setupAttribute(1, 2, 16, 8);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer); // Bind the buffer (meaning "use this buffer for the following operations")
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.transformData, this.gl.DYNAMIC_DRAW); // Change to DYNAMIC_DRAW to allow updates
        this.setupAttribute(2, 2, 32, 0, 1);
        this.setupAttribute(3, 1, 32, 8, 1);
        this.setupAttribute(4, 3, 32, 12, 1);

        this.gl.bindVertexArray(null); // All done, unbind the VAO

    }

    updateTransformData(data: TEntity[]): void {

        const bufferData: SpriteBufferData[] = []
        for (let i = 0; i < data.length; i++) {
            if (data[i].active) {
                const item = data[i];
                bufferData.push({
                    posX: item.x,
                    posY: item.y,
                    scale: 128, // default entity size
                    colorR: 1, // default color
                    colorG: 1, // default color
                    colorB: 1, // default color
                    frame: item.frameIndex,
                    orientation: item.orientation
                });
            }
        }

        // Those are used to calculate the UVs for the sprite sheet
        // SPRITES_PER_ROW: 16,
        // ORIENTATIONS_PER_ROW: 4,
        // UV_UNIT: 0.015625 // (1/64) Pre-calculated

        const u = (sprite: number, orientation: number) => ((sprite % 16) * 0.015625) + (orientation % 4) * 0.25;
        const v = (sprite: number, orientation: number) => (Math.floor(sprite / 16) * 0.015625) + Math.floor(orientation / 4) * 0.25;

        for (let i = 0; i < bufferData.length; i++) {
            const offset = i * 8;
            const d = bufferData[i];
            this.transformData[offset] = d.posX;
            this.transformData[offset + 1] = d.posY;
            this.transformData[offset + 2] = d.scale;
            this.transformData[offset + 3] = d.colorR;
            this.transformData[offset + 4] = d.colorG;
            this.transformData[offset + 5] = d.colorB;
            this.transformData[offset + 6] = u(d.frame, d.orientation);
            this.transformData[offset + 7] = v(d.frame, d.orientation);
        };
        this.renderMax = bufferData.length;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.transformData, 0); // TODO : Limit length to active entities
    }

    render(): void {
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer);
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.renderMax);
    }

}

