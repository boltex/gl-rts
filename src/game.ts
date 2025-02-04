import { RendererManager } from "./renderer-manager";
import { UIManager } from "./ui-manager";
import { InputManager } from "./input-manager";
import { Behaviors } from "./behaviors";
import { Entities } from "./entities";
import { CONFIG } from './config';
import { EntityType, TRectangle, TSelectAnim } from "./types";
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
    selectAnim: [TSelectAnim] = [{
        x: 0,
        y: 0,
        orientation: 0,
        frameIndex: 0,
        active: false
    }];
    test: boolean = false;

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
        this.cameraManager = new CameraManager(this);
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
        this.inputManager.dispose();
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
        alien1.type = EntityType.ALIEN;
        alien1.hitPoints = 100;
        alien1.x = 1100;
        alien1.y = 1100;
        alien1.frameIndex = 33;
        alien1.orientation = 6;

        const alien2 = this.entities.spawn();
        alien2.type = EntityType.ALIEN;
        alien2.hitPoints = 100;
        alien2.x = 0;
        alien2.y = 0;
        alien2.frameIndex = 212;
        alien2.orientation = 5;

        const alien3 = this.entities.spawn();
        alien3.type = EntityType.ALIEN;
        alien3.hitPoints = 100;
        alien3.x = 455;
        alien3.y = 455;
        alien3.frameIndex = 122;
        alien3.orientation = 14;

        // Build Map (Will later be bigger maps loaded from file)
        // Use Config.GAME.MAP.WIDTH and Config.GAME.MAP.HEIGHT
        // For now, just fill with random tiles
        this.gamemap = []; // AS a linear array of size Config.GAME.MAP.WIDTH * Config.GAME.MAP.HEIGHT
        for (let i = 0; i < CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.MAP.HEIGHT; i++) {
            this.gamemap.push(Math.floor(Math.random() * 16));
        }
    }

    procGame(): void {

        // procgame processes a game frame, animating each RAF.
        // Note: This is not a game-states tick, at timePerTick intervals.

        if (this.gameAction) {

            switch (this.gameAction) {
                case CONFIG.GAME.ACTIONS.DEFAULT:
                    this.defaultAction();
                    break;
                case CONFIG.GAME.ACTIONS.RELEASESEL:
                    this.selectUnits();
                    break;

                default:
                    break;
            }

        }

        this.gameAction = 0; // -------------- no more game actions to do

        this.inputManager.processInputs(); // So far this scrolls the map only

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

            const visibleTiles: [number, number, number][] = []; // X, Y and Tile Index
            const tilesize = CONFIG.GAME.TILE.SIZE;
            const tileoffx = Math.floor(this.cameraManager.scrollX / tilesize);
            const tileoffy = Math.floor(this.cameraManager.scrollY / tilesize);
            const screenx = this.cameraManager.gameScreenWidth;
            const screeny = this.cameraManager.gameScreenHeight;
            let rangex = (screenx / tilesize) + 1;
            let rangey = (screeny / tilesize) + 1;
            if (this.cameraManager.scrollX % tilesize > tilesize - (screenx % tilesize)) {
                rangex += 1;
            }
            if (this.cameraManager.scrollY % tilesize > tilesize - (screeny % tilesize)) {
                rangey += 1;
            }
            for (let y = 0; y < rangey; y++) {
                for (let x = 0; x < rangex; x++) {
                    const a = this.gamemap[(tileoffx + x) + ((tileoffy + y) * (CONFIG.GAME.MAP.WIDTH))];
                    visibleTiles.push(
                        [x * tilesize - (this.cameraManager.scrollX % tilesize),
                        y * tilesize - (this.cameraManager.scrollY % tilesize),
                            a]
                    );

                }
            }

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

            // Animated selection widget, if any. Uses same renderer and texture as sprites.
            if (this.uiManager.widgetAnim > 0) {
                this.selectAnim[0].x = this.uiManager.widgetAnimX;
                this.selectAnim[0].y = this.uiManager.widgetAnimY;
                this.selectAnim[0].frameIndex = 249 + this.uiManager.widgetAnim;
                this.selectAnim[0].orientation = 1; // 0  = thin, 1 = wide
                this.selectAnim[0].active = true;

            } else {
                this.selectAnim[0].active = false;
            }

            this.rendererManager.render(
                visibleTiles,
                this.entities.pool,
                cursor,
                this.selectAnim,
                this.cameraManager,
                this.timeManager.getInterpolation()
            );
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

    defaultAction(): void {
        const gamePosition = this.inputManager.gamePosition;
        console.log('default action at: ', gamePosition.x, gamePosition.y);

        // TODO : Replace test cursor animation with the real default action
        // FOR NOW: START WIDGET ANIMATION ON DEFAULT ACTION
        this.uiManager.widgetAnim = 1;
        this.uiManager.widgetAnimX = this.inputManager.mouseX - 64;
        this.uiManager.widgetAnimY = this.inputManager.mouseY - 64;
        this.test = !this.test;
    }

    selectUnits(): void {

        // Called from procGame
        const selectionStart = this.inputManager.selectionStart;
        const selectionEnd = this.inputManager.selectionEnd;

        console.log('select', selectionStart.x, selectionStart.y, selectionEnd.x, selectionEnd.y);
        // TODO : Add selection logic here

    }

}

