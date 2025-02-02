import { RendererManager } from "./renderer-manager";
import { UIManager } from "./ui-manager";
import { InputManager } from "./input-manager";
import { Behaviors } from "./behaviors";
import { Entities } from "./entities";
import { CONFIG } from './config';
import { TRectangle } from "./types";

export class Game {

    // Manager classes
    inputManager: InputManager;
    rendererManager: RendererManager;
    uiManager: UIManager;

    // Canvas Properties
    lastDisplayWidth = 0;
    lastDisplayHeight = 0;
    canvasElement: HTMLCanvasElement;
    canvasBoundingRect: DOMRect;
    gl: WebGL2RenderingContext;

    // Game Screen Properties
    resolution: { label: string, width: number, height: number } = CONFIG.DISPLAY.RESOLUTIONS[0];
    aspectRatio = 1; // this is display aspect ratio
    gameScreenWidth = 0; // this is game screen size, used as uWorldX.
    gameScreenHeight = 0; // Used as uWorldY.
    gameWidthRatio = 0; // this is game screen ratio to the canvas size
    gameHeightRatio = 0;
    scrollEdgeX = 0; // constants for finding trigger zone
    scrollEdgeY = 0;
    zoomLevel = 1; // 1 is normal, 0.5 is zoomed out, 2 is zoomed in

    // Map Tile Properties
    readonly tileRatio = CONFIG.GAME.TILE.BITMAP_SIZE / CONFIG.GAME.TILE.SIZE; // Constants for tile size
    readonly maxMapX = (CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.TILE.SIZE) - 1; // Constants for tile size
    readonly maxMapY = (CONFIG.GAME.MAP.HEIGHT * CONFIG.GAME.TILE.SIZE) - 1; // Constants for tile size

    initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1;
    initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
    maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
    maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;
    scrollX = 0; // Current scroll position 
    scrollY = 0;

    // Game state Properties
    gamemap: number[] = [];
    started = false;
    gameAction = 0;    // 0 = none
    entities!: Entities;
    entityBehaviors!: Behaviors;

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

    constructor(sprites: HTMLImageElement, tiles: HTMLImageElement) {

        this.uiManager = new UIManager();

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

        this.creaturesImage = sprites;
        this.tilesImage = tiles;
        this.resizeCanvasToDisplaySize(this.canvasElement);
        this.rendererManager = new RendererManager(this.gl, this.tilesImage, this.creaturesImage);
        this.inputManager = new InputManager(this);
        this.uiManager = new UIManager();
        this.uiManager.mainMenu();
        this.uiManager.getStartButtonElement().addEventListener("click", this.startGame.bind(this));
    }

    handleCanvasResize(entries: ResizeObserverEntry[]): void {

        // Canvas has style width: 100vw; and height: 100vh; so we need to handle window resizes!
        for (const entry of entries) {
            let width;
            let height;
            let dpr = window.devicePixelRatio;
            if (entry.devicePixelContentBoxSize) {
                // NOTE: Only this path gives the correct answer
                // The other 2 paths are an imperfect fallback
                // for browsers that don't provide anyway to do this
                [width, height] = [entry.devicePixelContentBoxSize[0].inlineSize, entry.devicePixelContentBoxSize[0].blockSize];
                dpr = 1; // it's already in width and height
            } else if (entry.contentBoxSize) {
                if (entry.contentBoxSize[0]) {
                    [width, height] = [entry.contentBoxSize[0].inlineSize, entry.contentBoxSize[0].blockSize];
                } else {
                    // legacy mozilla impl using only contentBox
                    // @ts-expect-error
                    [width, height] = [entry.contentBoxSize.inlineSize, entry.contentBoxSize.blockSize];
                }
            } else {
                // legacy
                [width, height] = [entry.contentRect.width, entry.contentRect.height];
            }
            const displayWidth = Math.round(width * dpr);
            const displayHeight = Math.round(height * dpr);
            [this.lastDisplayWidth, this.lastDisplayHeight] = [displayWidth, displayHeight];
            this.canvasBoundingRect = this.canvasElement.getBoundingClientRect();
            this.updateGameScreenProperties();
        }
    }

    resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {

        // Get the size the browser is displaying the canvas in device pixels.
        const [displayWidth, displayHeight] = [this.lastDisplayWidth, this.lastDisplayHeight];

        // Check if the canvas is not the same size.
        const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;

        if (needResize) {

            // Make the canvas the same size
            canvas.width = displayWidth;
            canvas.height = displayHeight;

            // Set the viewport to fill the canvas
            this.gl.viewport(0, 0, canvas.width, canvas.height); // This will also clear the canvas  
            if (this.rendererManager && this.rendererManager.worldBuffer) {
                this.rendererManager.setUboWorldTransforms(this.gameScreenWidth, this.gameScreenHeight);
            }
        }
        return needResize;
    }

    startGame(): void {
        this.resolution = CONFIG.DISPLAY.RESOLUTIONS[this.uiManager.getResolutionSelectElement().selectedIndex];
        this.aspectRatio = this.resolution.width / this.resolution.height;

        this.updateGameScreenProperties();

        this.rendererManager.setUboWorldTransforms(this.gameScreenWidth, this.gameScreenHeight);

        this.uiManager.setCursor("cur-pointer");
        this.inputManager.init();

        this.uiManager.getStartButtonElement().style.display = 'none';
        this.uiManager.getResolutionSelectElement().style.display = 'none';

        // Start the game
        this.initGameStates();
        this.started = true;

        // Setup timer in case RAF Skipped when minimized or not in foreground.
        setInterval(() => { this.checkUpdate(); }, 500);
        this.loop(0);
    }

    updateGameScreenProperties(): void {
        // Called when the mouse-wheel zoomed in or out, or when the game is started.
        this.gameScreenWidth = this.resolution.width / this.zoomLevel;
        this.gameScreenHeight = this.resolution.height / this.zoomLevel;
        this.scrollEdgeX = this.gameScreenWidth - CONFIG.DISPLAY.SCROLL.BORDER; // constants for finding trigger zone
        this.scrollEdgeY = this.gameScreenHeight - CONFIG.DISPLAY.SCROLL.BORDER;

        this.initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1;
        this.initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;
        this.gameWidthRatio = this.gameScreenWidth / this.canvasBoundingRect.width;
        this.gameHeightRatio = this.gameScreenHeight / this.canvasBoundingRect.height;
    }

    initGameStates(): void {

        window.addEventListener('unload', () => {
            this.rendererManager.dispose();
        });

        // Build entities pool
        this.entities = new Entities(100);
        this.entityBehaviors = new Behaviors(this);

        // Fill Entities pool
        // EXPERIMENTAL TEST: Create 3 test Aliens
        const alien1 = this.entities.spawn();
        alien1.type = 1;
        alien1.hitPoints = 100;
        alien1.x = 515;
        alien1.y = 100;
        alien1.frameIndex = 33;
        alien1.orientation = 6;

        const alien2 = this.entities.spawn();
        alien2.type = 1;
        alien2.hitPoints = 100;
        alien2.x = 0;
        alien2.y = 0;
        alien2.frameIndex = 212;
        alien2.orientation = 5;

        const alien3 = this.entities.spawn();
        alien3.type = 1;
        alien3.hitPoints = 100;
        alien3.x = 64;
        alien3.y = 455;
        alien3.frameIndex = 122;
        alien3.orientation = 14;

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

        // TODO: Instead create a 32x32 map with random tiles!

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

    update(timestamp: number, skipRender?: boolean): void {

        // 1. Calculate timing and delta
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // 2. Accumulate time for different update frequencies
        this.tickAccumulator += deltaTime;  // For game logic (8 FPS)
        this.animAccumulator += deltaTime;  // For animations (15 FPS)

        // 3. Process immediate inputs/actions
        this.procGame();  // Handle mouse clicks, selection, etc.

        // 4. Update animations at 15 FPS
        while (this.animAccumulator >= this.timePerAnim) {
            this.uiManager.animateCursor();
            this.animAccumulator -= this.timePerAnim;
        }

        // 5. Update game state at 8 FPS 
        while (this.tickAccumulator >= this.timePerTick) {
            this.tick(); // Updates entity positions, AI, etc.
            this.tickAccumulator -= this.timePerTick;
        }

        // 6. Render at full frame rate: Pass interpolation value for smooth movement.
        if (!skipRender) {
            const interpolation = this.tickAccumulator / this.timePerTick;
            // Before rendering, resize canvas to display size. (in case of changing window size)
            this.resizeCanvasToDisplaySize(this.canvasElement)

            // Selection lines with four thin rectangles, if user is selecting.
            const cursor: TRectangle[] = [];
            if (this.inputManager.isSelecting) {
                // Draw selection rectangle with lines
                const cx1 = Math.min(this.inputManager.selX, this.inputManager.mouseX);
                const cx2 = Math.max(this.inputManager.selX, this.inputManager.mouseX);
                const cy1 = Math.min(this.inputManager.selY, this.inputManager.mouseY);
                const cy2 = Math.max(this.inputManager.selY, this.inputManager.mouseY);

                // Top, bottom, left, right lines
                cursor.push(
                    { x: cx1, y: cy1, width: cx2 - cx1, height: 2, r: 0, g: 1, b: 0, },
                    { x: cx1, y: cy2, width: cx2 - cx1, height: 2, r: 0, g: 1, b: 0, },
                    { x: cx1, y: cy1, width: 2, height: cy2 - cy1, r: 0, g: 1, b: 0, },
                    { x: cx2, y: cy1, width: 2, height: cy2 - cy1, r: 0, g: 1, b: 0, }
                );
            }

            this.rendererManager.render(this.gamemap, this.entities.pool, cursor);
        }

        // Calculate FPS
        if (timestamp - this.fpsLastTime > this.fpsInterval) {
            this.fps = Math.round(1000 / deltaTime);
            this.fpsLastTime = timestamp;
            // console.log('RAF FPS ', this.fps); // 30
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
        // Advance game states in pool from currentTick count, to the next one.
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
        console.log('default action at: ', gamePosition.x, gamePosition.y);

        // TODO : Replace with test cursor animation with the real default action
        // TEST START WIDGET ANIMATION ON DEFAULT ACTION
        this.uiManager.widgetAnim = 1;
        this.uiManager.widgetAnimX = gamePosition.x - 32;
        this.uiManager.widgetAnimY = gamePosition.y - 32;
    }

    tryselect(): void {

        // Called from procGame
        const selectionStart = this.inputManager.selectionStart;
        const selectionEnd = this.inputManager.selectionEnd;
        console.log('select', selectionStart.x, selectionStart.y, selectionEnd.x, selectionEnd.y);
    }


}

