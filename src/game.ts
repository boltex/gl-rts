import * as utils from "./utils";
import { TRectangle } from "./types";
import { CONFIG } from './config';
import { InputManager } from "./input-manager";
import { Behaviors } from "./behaviors";
import { Entities } from "./entities";
import { TileRenderer, SpriteRenderer, RectangleRenderer } from "./renderers";

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
    tileRatio = CONFIG.GAME.TILE.BITMAP_SIZE / CONFIG.GAME.TILE.SIZE;
    initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1;
    initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
    maxMapX = (CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.TILE.SIZE) - 1;
    maxMapY = (CONFIG.GAME.MAP.HEIGHT * CONFIG.GAME.TILE.SIZE) - 1;
    maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
    maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;
    tileRenderer: TileRenderer | null = null;
    spriteRenderer: SpriteRenderer | null = null;
    rectangleRenderer: RectangleRenderer | null = null;
    mapChanged = false;

    // Game state Properties
    gamemap: number[] = [];
    started = false;
    gameAction = 0;    // 0 = none
    entities!: Entities;
    entityBehaviors!: Behaviors;

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
            this.setDimensionsVars();
        }
    }

    setDimensionsVars(): DOMRect {
        this.canvasBoundingRect = this.canvasElement.getBoundingClientRect();
        this.gameWidthRatio = this.gameScreenWidth / this.canvasBoundingRect.width;
        this.gameHeightRatio = this.gameScreenHeight / this.canvasBoundingRect.height;
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;
        return this.canvasBoundingRect;
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
            if (this.worldBuffer) {
                this.setUboWorldTransforms();
            }
        }
        return needResize;
    }

    setUboWorldTransforms() {

        // Set ubo values for world transform
        const worldData = new Float32Array([2 / this.gameScreenWidth, 2 / -this.gameScreenHeight]);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.worldBuffer);
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, worldData);
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

        // Animate cursor at 15 FPS
        if (this.widgetAnim) {
            this.widgetAnim += 1;
            if (this.widgetAnim > this.widgetAnimTotal)
                this.widgetAnim = 0;
        }
    }

    toggleGameMenu(): void {
        console.log('Toggle Options Menu'); // Todo: Implement In-Game Option Menu
    }

    mainMenu(): void {

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

        // Use resolutionSelectElement.selectedIndex to get the selected resolution
        document.body.appendChild(this.resolutionSelectElement);

        this.startButtonElement.addEventListener("click", this.startGame.bind(this));
    }

    startGame(): void {
        this.resolution = CONFIG.DISPLAY.RESOLUTIONS[this.resolutionSelectElement.selectedIndex];

        this.aspectRatio = this.resolution.width / this.resolution.height;
        this.gameScreenWidth = this.resolution.width;
        this.gameScreenHeight = this.resolution.height;
        this.scrollEdgeX = this.gameScreenWidth - CONFIG.DISPLAY.SCROLL.BORDER; // constants for finding trigger zone
        this.scrollEdgeY = this.gameScreenHeight - CONFIG.DISPLAY.SCROLL.BORDER;

        // Re-set 
        this.initRangeX = (this.gameScreenWidth / CONFIG.GAME.TILE.SIZE) + 1;
        this.initRangeY = (this.gameScreenHeight / CONFIG.GAME.TILE.SIZE) + 1;
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;

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

    setGameScreenStates(): void {
        // Set the game screen width, scroll and zoom states.
        // Called when the window is resized, mouse-wheel zoomed in or out, or when the game is started.
        //

    }

    initGameStates(): void {
        this.tileRenderer = new TileRenderer(this.gl, this.tilesImage, this.initRangeX * this.initRangeY);
        this.spriteRenderer = new SpriteRenderer(this.gl, this.creaturesImage, CONFIG.GAME.ENTITY.INITIAL_POOL_SIZE);
        this.rectangleRenderer = new RectangleRenderer(this.gl, 4); // 4 rectangles make up a square selection rectangle

        // Create a uniform buffer
        this.worldBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.worldBuffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, 2 * Float32Array.BYTES_PER_ELEMENT, this.gl.DYNAMIC_DRAW);

        // Bind the buffer to binding point 0
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.worldBuffer);

        // Set the uniform block binding for both programs
        const tileProgram = this.tileRenderer.program;
        const spriteProgram = this.spriteRenderer.program;
        const rectangleProgram = this.rectangleRenderer.program;

        const worldIndex = 0; // Binding point 0

        const tileBlockIndex = this.gl.getUniformBlockIndex(tileProgram, 'World');
        this.gl.uniformBlockBinding(tileProgram, tileBlockIndex, worldIndex);

        const spriteBlockIndex = this.gl.getUniformBlockIndex(spriteProgram, 'World');
        this.gl.uniformBlockBinding(spriteProgram, spriteBlockIndex, worldIndex);

        const rectangleBlockIndex = this.gl.getUniformBlockIndex(rectangleProgram, 'World');
        this.gl.uniformBlockBinding(rectangleProgram, rectangleBlockIndex, worldIndex);

        this.setUboWorldTransforms(); // Initial set of ubo values

        window.addEventListener('unload', () => {
            this.tileRenderer?.dispose();
            this.spriteRenderer?.dispose();
            this.rectangleRenderer?.dispose();
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

        this.mapChanged = true;
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

    render(interpolation: number): void {

        // Set clear color to black
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        // Before rendering, resize canvas to display size. (in case of changing window size)
        if (!this.resizeCanvasToDisplaySize(this.canvasElement)) {
            // If it did not resize and call gl.viewport which clears the canvas, we need to clear it again.
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        }

        // 1 Render the game map. Map states are in this.gamemap and rarely change.
        if (this.tileRenderer) {
            if (this.mapChanged) {
                const backgroundTiles: any[] = [];

                // Todo: This is a temporary map test render, replace with the fixed commented code below!
                // const tileoffx = Math.floor(this.scrollx / this.tilesize);
                // const tileoffy = Math.floor(this.scrolly / this.tilesize);
                // let rangex = this.initrangex
                // let rangey = this.initrangey
                // if (this.scrollx % this.tilesize > this.tilesize - (this.screenx % this.tilesize)) {
                //     rangex += 1;
                // }
                // if (this.scrolly % this.tilesize > this.tilesize - (this.screeny % this.tilesize)) {
                //     rangey += 1;
                // }
                // for (let y = 0; y < rangey; y++) {
                //     for (let x = 0; x < rangex; x++) {
                //         const a = this.gamemap[(tileoffx + x) + ((tileoffy + y) * (this.gamemapw))];
                //         // console.log(a);
                //         backgroundTiles.push(
                //             {
                //                 sprite: "background", // bottom horizontal
                //                 position: {
                //                     x: x * this.tilesize - (this.scrollx % this.tilesize),
                //                     y: y * this.tilesize - (this.scrolly % this.tilesize)
                //                 },
                //                 oldPosition: {
                //                     x: x * this.tilesize - (this.scrollx % this.tilesize),
                //                     y: y * this.tilesize - (this.scrolly % this.tilesize)
                //                 },
                //                 frame: { x: a % this.tileratio, y: Math.floor(a / this.tileratio) },
                //                 flip: false,
                //                 blendmode: Game.BLENDMODE_ALPHA,
                //                 options: {}
                //             }
                //         );
                //     }
                // }
                // this.tileRenderer.updateTransformData(backgroundTiles);

                // Todo: replace this is a temporary map test render with the fixed commented code above!
                this.tileRenderer.updateTransformData(this.gamemap);

                this.mapChanged = false;
            }
            this.tileRenderer.render();
        }

        // 2 Render the game entities. Entity states are in this.entities.pool and change often.
        if (this.spriteRenderer) {
            this.spriteRenderer.updateTransformData(this.entities.pool);
            this.spriteRenderer.render();
        }

        // 3 Render fog of war, if any.
        // Todo: Implement Fog of War

        // Last, Render Selection lines with four thin rectangles, if user is selecting.
        const cursor: TRectangle[] = [];
        if (this.rectangleRenderer && this.inputManager.isSelecting) {
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

            this.rectangleRenderer.updateTransformData(cursor);
            this.rectangleRenderer.render();
        }

        this.gl.flush();
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
            this.animateCursor();
            this.animAccumulator -= this.timePerAnim;
        }

        // 5. Update game state at 8 FPS 
        while (this.tickAccumulator >= this.timePerTick) {
            this.tick(); // Updates entity positions, AI, etc.
            this.tickAccumulator -= this.timePerTick;
        }

        // 6. Render at full frame rate: Pass interpolation value for smooth movement.
        if (!skipRender) {
            this.render(this.tickAccumulator / this.timePerTick);
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
        console.log('default action at: ', gamePosition.x, gamePosition.y);

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

