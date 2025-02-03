import { RendererManager } from "./renderer-manager";
import { UIManager } from "./ui-manager";
import { InputManager } from "./input-manager";
import { Behaviors } from "./behaviors";
import { Entities } from "./entities";
import { CONFIG } from './config';
import { TRectangle } from "./types";
import { CameraManager } from "./camera-manager";
import { TimeManager } from "./time-manager";
import * as utils from "./utils";

export class Game {

    // Manager classes
    inputManager: InputManager;
    rendererManager: RendererManager;
    uiManager: UIManager;
    cameraManager: CameraManager;
    timeManager: TimeManager;

    // Canvas Properties
    lastDisplayWidth = 0;
    lastDisplayHeight = 0;
    canvasElement: HTMLCanvasElement;
    canvasBoundingRect: DOMRect;
    gl: WebGL2RenderingContext;

    // Game state Properties
    gamemap: number[] = [];
    started = false;
    gameAction = 0;    // 0 = none
    entities!: Entities;
    entityBehaviors!: Behaviors;

    private startGameHandler = this.startGame.bind(this);
    private handleContextMenu = (event: MouseEvent) => event.preventDefault();
    private resizeObserver: ResizeObserver;

    constructor(sprites: HTMLImageElement, tiles: HTMLImageElement) {

        this.canvasElement = document.createElement('canvas');
        document.body.appendChild(this.canvasElement);

        this.canvasBoundingRect = this.canvasElement.getBoundingClientRect();

        const gl = this.canvasElement.getContext('webgl2');
        if (gl) {
            this.gl = gl; // ok, we have a WebGL2 context
        } else {
            throw new Error('WebGL2 not supported in this browser'); // Error handling
        }

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // transparent black

        // Prevent right-click context menu
        this.canvasElement.addEventListener('contextmenu', this.handleContextMenu);

        // Canvas has style width: 100vw; and style height: 100vh; so we need to handle resizes!
        const debouncedResize = utils.debounce(this.handleCanvasResize.bind(this), 250);
        this.resizeObserver = new ResizeObserver(debouncedResize);
        this.resizeObserver.observe(this.canvasElement, { box: 'content-box' });

        this.timeManager = new TimeManager(
            CONFIG.GAME.TIMING.TICK_RATE,
            CONFIG.GAME.TIMING.ANIM_RATE,
            CONFIG.GAME.TIMING.FPS_UPDATE_INTERVAL
        );
        this.cameraManager = new CameraManager();
        this.rendererManager = new RendererManager(this.gl, tiles, sprites);
        this.inputManager = new InputManager(this);
        this.resizeCanvasToDisplaySize(this.canvasElement);
        this.uiManager = new UIManager();
        this.uiManager.mainMenu();
        this.uiManager.getStartButtonElement().addEventListener("click", this.startGameHandler);
    }

    dispose(): void {
        this.rendererManager.dispose();
        this.canvasElement.removeEventListener('contextmenu', this.handleContextMenu);
        this.uiManager.getStartButtonElement().removeEventListener("click", this.startGameHandler);
        this.resizeObserver.unobserve(this.canvasElement);
        this.resizeObserver.disconnect();
    }

    handleCanvasResize(entries: ResizeObserverEntry[]): void {
        for (const entry of entries) {
            const { width: displayWidth, height: displayHeight } = utils.getDisplaySize(entry);
            this.lastDisplayWidth = displayWidth;
            this.lastDisplayHeight = displayHeight;
            this.canvasBoundingRect = this.canvasElement.getBoundingClientRect();
            this.cameraManager.updateProperties(this.canvasBoundingRect);
        }
    }

    resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
        const displayWidth = this.lastDisplayWidth;
        const displayHeight = this.lastDisplayHeight;

        const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
        if (needResize) {
            // Set the canvas dimensions to the display size
            canvas.width = displayWidth;
            canvas.height = displayHeight;

            // Set the viewport to fill the canvas
            this.gl.viewport(0, 0, canvas.width, canvas.height); // This will also clear the canvas  
            if (this.rendererManager && this.rendererManager.worldBuffer) {
                this.rendererManager.setUboWorldTransforms(this.cameraManager.gameScreenWidth, this.cameraManager.gameScreenHeight);
            }
        }
        return needResize;
    }

    startGame(): void {
        this.cameraManager.setResolution(CONFIG.DISPLAY.RESOLUTIONS[this.uiManager.getResolutionSelectElement().selectedIndex]);
        this.cameraManager.updateProperties(this.canvasBoundingRect);
        this.rendererManager.setUboWorldTransforms(this.cameraManager.gameScreenWidth, this.cameraManager.gameScreenHeight);

        this.uiManager.setCursor("cur-pointer");
        this.inputManager.init();

        this.uiManager.getStartButtonElement().style.display = 'none';
        this.uiManager.getResolutionSelectElement().style.display = 'none';

        this.initGameStates();
        this.started = true;
        this.timeManager.lastTime = performance.now();
        setInterval(() => { this.checkUpdate(); }, 500); // Setup timer in case RAF Skipped when minimized
        this.loop(0);
    }

    initGameStates(): void {
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

        this.inputManager.processInputs();

    }

    update(timestamp: number, skipRender?: boolean): void {

        // 1. Update time
        const deltaTime = this.timeManager.update(timestamp);

        // 2. Process immediate inputs/actions
        this.procGame();

        // 3. Update animations if needed
        if (this.timeManager.shouldAnimUpdate()) {
            this.uiManager.animateCursor();
        }

        // 4. Update game logic if needed
        if (this.timeManager.shouldTickUpdate()) {
            this.tick();
        }

        // 5. Render
        if (!skipRender) {
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

            this.rendererManager.render(this.gamemap, this.entities.pool, cursor, this.timeManager.getInterpolation());
        }

        // 6. FPS
        this.timeManager.updateFps(timestamp, deltaTime);
    }

    checkUpdate(): void {
        // Checks for needed ticks to be computed if game is minimized
        const timestamp = performance.now();
        if (this.timeManager.needCatchUp(timestamp)) {
            this.update(timestamp, true);
        }
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
        // TODO : Add selection logic here

    }


}

