import * as utils from "./utils";
import { Point, M3x3 } from "./maths";
import { TEntity } from "./type";

document.addEventListener('DOMContentLoaded', (event) => {
    if (!window.game) {
        window.game = new Game();
    } else {
        console.log('Game instance already started');
    }
});

export class Game {

    // HTML Elements
    startButtonElement: HTMLButtonElement = document.createElement("button");
    resolutionSelectElement: HTMLSelectElement = document.createElement("select");

    // Canvas Properties
    lastDisplayWidth: number = 0;
    lastDisplayHeight: number = 0;
    canvasElement: HTMLCanvasElement;
    canvasBoundingRect: DOMRect;
    glContext: WebGL2RenderingContext;

    // Game Screen Properties
    aspectRatio: number = 1; // set in startGame, this is display aspect ratio
    gameScreenWidth: number = 0; // set in startGame, this is game screen size
    gameScreenHeight: number = 0;
    gameWidthRatio: number = 0; // set in startGame, this is game screen ratio to the canvas size
    gameHeightRatio: number = 0;
    scrollEdgeX = 0; // set in startGame, constants for finding trigger zone
    scrollEdgeY = 0;

    // Map Tile Properties
    tileBmpSize = 1024;  // size of a square bitmap of tiles
    tileSize = 128;      // size of an individual square TILE 
    tileRatio = this.tileBmpSize / this.tileSize;
    initRangeX = (this.gameScreenWidth / this.tileSize) + 1; // set in startGame
    initRangeY = (this.gameScreenHeight / this.tileSize) + 1;
    gameMapWidth = 9; // game map width in TILES 
    gameMapHeight = 9; // game map height in TILES 
    maxMapX = (this.gameMapWidth * this.tileSize) - 1;
    maxMapY = (this.gameMapHeight * this.tileSize) - 1;
    maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
    maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;

    // Game state Properties
    gamemap: number[] = [];
    started = false;
    gameAction = 0    // 0 = none
    entities!: Entities;
    entityBehaviors!: EntityBehavior;

    // Mouse Properties
    mouseX: number = 0; // Current mouse position in screen
    mouseY: number = 0;
    gameMouseX: number = 0; // Current mouse position in game
    gameMouseY: number = 0;

    // Mouse Cursor Properties
    documentElementClassList: DOMTokenList; // Css rules rely on this to change cursor.
    currentCursorClass = ""; // "cur-pointer", "cur-target", "cur-select" ...

    // Command Acknowledged Widget Animation Properties
    widgetAnim = 0
    widgetAnimTotal = 6
    widgetAnimX = 0
    widgetAnimY = 0

    // Cursor Selection States
    selecting: boolean = false;
    selX = 0; // Started selection at specific screen coords (end is current mouse pos)
    selY = 0;
    gameSelStartX: number = 0; // Started selection at specific game coords
    gameSelStartY: number = 0;
    gameSelEndX: number = 0; // Ended selection at specific game coords
    gameSelEndY: number = 0;

    // Scroll Properties
    scrollX = 0; // Current scroll position 
    scrollY = 0;
    scrollNowX = 0; // Scroll amount to be applied to scroll when processing
    scrollNowY = 0;

    // Key Press States
    keysPressed: Record<string, any> = {};

    // Image Assets
    creaturesImage!: HTMLImageElement;
    tilesImage!: HTMLImageElement;

    // Game-State Ticks (at 8 fps)
    tickAccumulator = 0; // What remained in deltaTime after last update 
    currentTick = 0;
    timePerTick = 125; // dt in ms (125 is 8 per second)
    timerTriggerAccum = this.timePerTick * 3; // 3 times the timePerTick

    // Graphic Animations (at 15 fps)
    animAccumulator = 0; // What remained in deltaTime after last update 
    currentAnim = 0;
    timePerAnim = 67; // dt in ms (66.66 is 15 per second)

    // FPS counter
    lastTime = 0;
    fps = 0;
    fpsInterval = 1000; // Update FPS every 1 second
    fpsLastTime = 0;

    static SCROLLSPEED = 50;   // speed in pixels for scrolling
    static SCROLLBORDER = 10;  // pixels from screen to trigger scrolling

    static GAME_ACTIONS = {
        DEFAULT: 1,
        RELEASESEL: 2
    };

    static AVAILABLE_RESOLUTIONS = [
        {
            label: "16:9 (1920x1080)",
            width: 1920, height: 1080
        },
        {
            label: "16:10 (1920x1200)",
            width: 1920, height: 1200
        },
        {
            label: "4:3 (1440x1080)",
            width: 1440, height: 1080
        },
    ];

    constructor() {
        console.log("constructing game");

        this.documentElementClassList = document.documentElement.classList;

        this.canvasElement = document.createElement('canvas');
        document.body.appendChild(this.canvasElement);

        this.canvasBoundingRect = this.canvasElement.getBoundingClientRect();
        this.setDimensionsVars();

        this.glContext = this.canvasElement.getContext('webgl2')!;

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
        for (const { label, width, height } of Game.AVAILABLE_RESOLUTIONS) {
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
        const resolution = Game.AVAILABLE_RESOLUTIONS[this.resolutionSelectElement.selectedIndex];
        this.aspectRatio = resolution.width / resolution.height;
        this.gameScreenWidth = resolution.width;
        this.gameScreenHeight = resolution.height;
        this.scrollEdgeX = this.gameScreenWidth - Game.SCROLLBORDER; // constants for finding trigger zone
        this.scrollEdgeY = this.gameScreenHeight - Game.SCROLLBORDER;

        // Re-set 
        this.initRangeX = (this.gameScreenWidth / this.tileSize) + 1;
        this.initRangeY = (this.gameScreenHeight / this.tileSize) + 1;
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenWidth;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenHeight;

        console.log('Starting the game with aspect ratio', this.aspectRatio);

        this.setCursor("cur-pointer");

        this.addGameEventListeners();

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

    addGameEventListeners(): void {
        window.addEventListener("keydown", this.handleKeyDown.bind(this));
        window.addEventListener("keyup", this.handleKeyUp.bind(this));
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mousedown", this.handleMouseDown.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
        window.addEventListener("wheel", this.handleMouseWheel.bind(this), { passive: false });
    }

    toggleGameMenu(): void {
        console.log('Toggle Game Menu'); // Todo: Implement Game Menu
    }

    handleKeyDown(e: KeyboardEvent): void {
        this.keysPressed[e.key] = true;
        if (e.key === 'F10') {
            e.preventDefault();  // Prevent default F10 behavior
            this.toggleGameMenu();
        }
        // Prevent keyboard zoom.
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
            e.preventDefault();
        }
    }


    handleKeyUp(e: KeyboardEvent): void {
        this.keysPressed[e.key] = false;
    }

    processKeyInputs(): void {
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
    }

    handleMouseMove(event: MouseEvent): void {
        this.setCursorPos(event);
        this.scrollNowX = 0;
        this.scrollNowY = 0;

        // Scroll if cursor is near the edge of the screen
        if (this.mouseX > this.scrollEdgeX) {
            this.scrollNowX = Game.SCROLLSPEED;
        }
        if (this.mouseY > this.scrollEdgeY) {
            this.scrollNowY = Game.SCROLLSPEED;
        }
        if (this.mouseX < Game.SCROLLBORDER) {
            this.scrollNowX = -Game.SCROLLSPEED;
        }
        if (this.mouseY < Game.SCROLLBORDER) {
            this.scrollNowY = -Game.SCROLLSPEED;
        }
    }

    handleMouseDown(event: MouseEvent): void {
        this.setCursorPos(event);

        if (!this.selecting) {
            if (event.button == 0) {
                this.selecting = true;
                this.setCursor("cur-target");
                this.selX = this.mouseX; // Start selection at mouse coords
                this.selY = this.mouseY;
                this.gameSelStartX = this.selX + this.scrollX;
                this.gameSelStartY = this.selY + this.scrollY;
            }
            if (event.button == 2) {
                this.gameAction = Game.GAME_ACTIONS.DEFAULT;
            }
        }
    }

    handleMouseUp(event: MouseEvent): void {
        this.setCursorPos(event);

        if (event.button == 0) {
            this.gameSelEndX = this.mouseX + this.scrollX;
            this.gameSelEndY = this.mouseY + this.scrollY;
            this.selecting = false;
            this.setCursor("cur-pointer");
            this.gameAction = Game.GAME_ACTIONS.RELEASESEL;
        }

    }

    handleMouseWheel(event: WheelEvent): void {
        if (event.deltaY < 0) {
            // Todo: Zoom in
            console.log("CTRL+Scroll Up"); // You could trigger a specific game action here
        } else if (event.deltaY > 0) {
            // Todo: Zoom out
            console.log("CTRL+Scroll Down");
        }

        // Prevents the default zoom behavior
        if (event.ctrlKey) {
            event.preventDefault();
        }
    }

    setCursorPos(event: MouseEvent): void {
        this.mouseX = event.clientX * (this.gameScreenWidth / this.canvasBoundingRect.width);
        this.mouseY = event.clientY * (this.gameScreenHeight / this.canvasBoundingRect.height);
        this.gameMouseX = this.mouseX + this.scrollX;
        this.gameMouseY = this.mouseY + this.scrollY;
    }

    procGame(): void {

        // procgame processes a game frame, animating each RFA
        // Note: This is not a game-states tick, at timePerTick intervals.

        if (this.gameAction) {

            switch (this.gameAction) {
                case Game.GAME_ACTIONS.DEFAULT:
                    this.trydefault()
                    break;
                case Game.GAME_ACTIONS.RELEASESEL:
                    this.tryselect()
                    break;

                default:
                    break;
            }

        }

        this.gameAction = 0 // -------------- no more game actions to do

        // Scroll if not currently dragging a selection.
        if (!this.selecting) {
            this.scrollX += this.scrollNowX;
            this.scrollY += this.scrollNowY;
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

        this.processKeyInputs();

        // Update currentTick count
        this.currentTick += 1;
    }

    loop(timestamp: number): void {
        this.update(timestamp);
        requestAnimationFrame(this.loop.bind(this));
    }

    trydefault(): void {
        console.log('default', this.gameMouseX, this.gameMouseY);
        // TODO : Replace with test cursor animation with the real default action
        // TEST START WIDGET ANIMATION ON DEFAULT ACTION
        this.widgetAnim = 1;
        this.widgetAnimX = this.gameMouseX - 32;
        this.widgetAnimY = this.gameMouseY - 32;

    }

    tryselect(): void {
        // Called from procGame
        console.log('select', this.gameSelStartX, this.gameSelStartY, this.gameSelEndX, this.gameSelEndY);
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

