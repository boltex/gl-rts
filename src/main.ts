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

    htmlClassList: DOMTokenList;
    curClass = ""; //"cur-pointer", "cur-target", "cur-select" ...

    lastDisplayWidth: number = 0;
    lastDisplayHeight: number = 0;
    canvas: HTMLCanvasElement;
    canvasRect: DOMRect;
    gl: WebGL2RenderingContext;
    startButton: HTMLButtonElement = document.createElement("button");
    resolutionSelect: HTMLSelectElement = document.createElement("select");

    aspectRatio: number = 1; // set in startGame, this is display aspect ratio

    gameScreenW: number = 0; // set in startGame, this is game screen size
    gameScreenH: number = 0;

    gameWRatio: number = 0; // set in startGame, this is game screen ratio to the canvas size
    gameHRatio: number = 0;

    xscr_e = 0; // set in startGame, constants for finding trigger zone
    yscr_e = 0;

    tileBmpSize = 1024;  // size of a square bitmap of tiles
    tileSize = 128;      // size of an individual square TILE 
    tileRatio = this.tileBmpSize / this.tileSize;

    initRangeX = (this.gameScreenW / this.tileSize) + 1; // set in startGame
    initRangeY = (this.gameScreenH / this.tileSize) + 1;

    gameMapWidth = 9; // game map width in TILES 
    gameMapHeight = 9; // game map height in TILES 
    maxMapX = (this.gameMapWidth * this.tileSize) - 1;
    maxMapY = (this.gameMapHeight * this.tileSize) - 1;
    maxScrollX = 1 + this.maxMapX - this.gameScreenW;
    maxScrollY = 1 + this.maxMapY - this.gameScreenH;

    // Game state
    started = false;
    gameAction = 0    // 0 = none

    // Current mouse position in window
    curX = 0
    curY = 0
    // Current mouse position in game
    gameCurX = 0
    gameCurY = 0
    gameSelX = 0
    gameSelY = 0

    // Cursor animation variables
    curAnim = 0
    curAnimTotal = 6
    curAnimX = 0
    curAnimY = 0

    // Cursor selection state
    selecting: boolean = false;
    selX = 0; // Started selection at specific coords
    selY = 0;

    scrollX = 0; // Current scroll position 
    scrollY = 0;
    scrollNowX = 0; // Scroll amount to be applied to scroll when processing
    scrollNowY = 0;

    // Key press state
    keysPressed: Record<string, any> = {};

    // Image assets
    creaturesImage!: HTMLImageElement;
    tilesImage!: HTMLImageElement;

    // GAME-STATE TICKS AT 8 FPS
    tickAccumulator = 0; // What remained in deltaTime after last update 
    currentTick = 0;
    timePerTick = 125; // dt in ms (125 is 8 per second)
    timerTriggerAccum = this.timePerTick * 3; // 3 times the timePerTick

    // ANIMATIONS AT 15 FPS
    animAccumulator = 0; // What remained in deltaTime after last update 
    currentAnim = 0;
    timePerAnim = 67; // dt in ms (66.66 is 15 per second)

    // FPS counter
    lastTime = 0;
    fps = 0;
    fpsInterval = 1000; // Update FPS every 1 second
    fpsLastTime = 0;

    static SCROLLSPEED = 50;   // speed in pixels for scrolling
    static SCROLLBORDER = 10; // 5;   // pixels from screen to trigger scrolling

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

        this.htmlClassList = document.documentElement.classList;

        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);

        this.canvasRect = this.canvas.getBoundingClientRect();
        this.setDimensionsVars();

        this.gl = this.canvas.getContext('webgl2')!;

        // Prevent right-click context menu
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        const resizeObserver = new ResizeObserver(this.resize.bind(this));
        resizeObserver.observe(this.canvas, { box: 'content-box' });

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

    resize(entries: ResizeObserverEntry[]): void {

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
        console.log(this.lastDisplayWidth, this.lastDisplayHeight);
    }

    setDimensionsVars(): DOMRect {
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.gameWRatio = (this.gameScreenW / this.canvasRect.width);
        this.gameHRatio = (this.gameScreenH / this.canvasRect.height)
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenW;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenH;
        return this.canvasRect;
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
        if (this.curClass !== newClass) {
            if (this.curClass) {
                this.htmlClassList.remove(this.curClass); // Remove from html
            }
            this.htmlClassList.add(newClass); // Add to html
            this.curClass = newClass; // Update the tracked cursor class
        }
    }

    public animateCursor(): void {
        // Animate at 15 FPS

        // Cursor
        if (this.curAnim) {
            this.curAnim += 1;
            if (this.curAnim > this.curAnimTotal)
                this.curAnim = 0
        }

    }

    interpolate(min: Point, max: Point, fract: number): Point {
        return new Point(max.x + (min.x - max.x) * fract, max.y + (min.y - max.y) * fract);
    }

    render(interpolation: number): void {

        // Before rendering, resize canvas to display size. (in case of changing window size)
        this.resizeCanvasToDisplaySize(this.canvas);

        // Clear the canvas
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // Set base buffer color to black 
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // Set base buffer color to black fully transparent

        // Render the game

        // TODO: Render the game map
        // TODO: Render the game entities

        // Finished
        this.gl.flush();
    }

    mainMenu(): void {
        // The images have loaded, so it's time to show the pre-game menu

        // Create the start button
        this.startButton.textContent = "Start Game";
        this.startButton.classList.add("btn-start");

        document.body.appendChild(this.startButton);

        // Create the dropdown for screen resolution
        this.resolutionSelect.classList.add("resolution-select");


        // Populate the dropdown with options
        for (const { label, width, height } of Game.AVAILABLE_RESOLUTIONS) {
            const option = document.createElement("option");
            option.value = `${width}x${height}`;
            option.textContent = label;
            this.resolutionSelect.appendChild(option);
        }
        document.body.appendChild(this.resolutionSelect);

        // Use resolutionSelect.selectedIndex to get the selected resolution

        this.startButton.addEventListener("click", this.startGame.bind(this));

    }

    startGame(): void {
        const resolution = Game.AVAILABLE_RESOLUTIONS[this.resolutionSelect.selectedIndex];
        this.aspectRatio = resolution.width / resolution.height;
        this.gameScreenW = resolution.width;
        this.gameScreenH = resolution.height;
        this.xscr_e = this.gameScreenW - Game.SCROLLBORDER; // constants for finding trigger zone
        this.yscr_e = this.gameScreenH - Game.SCROLLBORDER;

        // Re-set 
        this.initRangeX = (this.gameScreenW / this.tileSize) + 1;
        this.initRangeY = (this.gameScreenH / this.tileSize) + 1;
        this.maxScrollX = 1 + this.maxMapX - this.gameScreenW;
        this.maxScrollY = 1 + this.maxMapY - this.gameScreenH;

        console.log('Starting the game with aspect ratio', this.aspectRatio);

        this.setCursor("cur-pointer");

        this.addGameEventListeners();

        this.startButton.style.display = 'none';
        this.resolutionSelect.style.display = 'none';
        this.started = true;
        // Setup timer in case RAF Skipped when minimized or not in foreground.
        setInterval(() => { this.checkUpdate(); }, 500);
        this.loop(0);
    }

    addGameEventListeners(): void {
        window.addEventListener("keydown", this.keyDown.bind(this));
        window.addEventListener("keyup", this.keyUp.bind(this));
        window.addEventListener("mousemove", this.mouseMove.bind(this));
        window.addEventListener("mousedown", this.mouseDown.bind(this));
        window.addEventListener("mouseup", this.mouseUp.bind(this));
        window.addEventListener("wheel", this.mouseWheel.bind(this), { passive: false });
    }

    toggleGameMenu(): void {
        console.log('Toggle Game Menu'); // Todo: Implement Game Menu
    }

    keyDown(e: KeyboardEvent): void {
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

    keyUp(e: KeyboardEvent): void {
        this.keysPressed[e.key] = false;
    }

    checkKeys(): void {
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

    mouseMove(event: MouseEvent): void {
        this.setCursorPos(event);
        this.scrollNowX = 0;
        this.scrollNowY = 0;
        if (this.curX > this.xscr_e) {
            this.scrollNowX = Game.SCROLLSPEED;
        }
        if (this.curY > this.yscr_e) {
            this.scrollNowY = Game.SCROLLSPEED;
        }
        if (this.curX < Game.SCROLLBORDER) {
            this.scrollNowX = -Game.SCROLLSPEED;
        }
        if (this.curY < Game.SCROLLBORDER) {
            this.scrollNowY = -Game.SCROLLSPEED;
        }
    }

    mouseDown(event: MouseEvent): void {
        this.setCursorPos(event);
        this.gameCurX = this.curX + this.scrollX;
        this.gameCurY = this.curY + this.scrollY;
        if (!this.selecting) {
            if (event.button == 0) {
                this.selecting = true;
                this.setCursor("cur-target");
                this.selX = this.curX;
                this.selY = this.curY;
            }
            if (event.button == 2) {
                this.gameAction = Game.GAME_ACTIONS.DEFAULT;
            }
        }
    }

    mouseUp(event: MouseEvent): void {
        this.setCursorPos(event);
        this.gameSelX = this.selX + this.scrollX;
        this.gameSelY = this.selY + this.scrollY;
        this.gameCurX = this.curX + this.scrollX;
        this.gameCurY = this.curY + this.scrollY;
        if (event.button == 0) {
            this.selecting = false;
            this.setCursor("cur-pointer");
            this.gameAction = Game.GAME_ACTIONS.RELEASESEL;
        }

    }

    mouseWheel(event: WheelEvent): void {
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
        this.curX = event.clientX * (this.gameScreenW / this.canvasRect.width);
        this.curY = event.clientY * (this.gameScreenH / this.canvasRect.height);
    }

    public procGame(): void {

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

        // Scroll if not selected    
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

        this.checkKeys();

        // Update currentTick count
        this.currentTick += 1;
    }

    loop(timestamp: number): void {
        this.update(timestamp);
        requestAnimationFrame(this.loop.bind(this));
    }

    public trydefault(): void {

        // TODO : Replace with test cursor animation with the real default action
        // TEST CURSOR ANIMATION ON DEFAULT ACTION
        this.curAnim = 1;
        this.curAnimX = this.gameCurX - 32;
        this.curAnimY = this.gameCurY - 32;

    }

    public tryselect(): void {
        // Called from procGame
    }


}


