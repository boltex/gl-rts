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

    lastDisplayWidth: number = 0;
    lastDisplayHeight: number = 0;
    canvas: HTMLCanvasElement;
    canvasRect: DOMRect;
    gl: WebGL2RenderingContext;
    aspectRatio: number = Game.AVAILABLE_RESOLUTIONS[0].width / Game.AVAILABLE_RESOLUTIONS[0].height;
    startButton: HTMLButtonElement = document.createElement("button");
    resolutionSelect: HTMLSelectElement = document.createElement("select");
    gameScreenW: number = 0;
    gameScreenH: number = 0;
    gameWRatio: number;
    gameHRatio: number;

    tileBmpSize = 1024;  // size of a square bitmap of tiles
    tileSize = 128;      // size of an individual square TILE 
    tileRatio = this.tileBmpSize / this.tileSize;
    initRangeX = (this.gameScreenW / this.tileSize) + 1;
    initRangeY = (this.gameScreenH / this.tileSize) + 1;

    gameMapWidth = 9; // game map width in TILES 
    gameMapHeight = 9; // game map height in TILES 
    maxmapx = (this.gameMapWidth * this.tileSize) - 1;
    maxmapy = (this.gameMapHeight * this.tileSize) - 1;
    maxscrollx = 1 + this.maxmapx - this.gameScreenW;
    maxscrolly = 1 + this.maxmapy - this.gameScreenH;

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

        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);

        // Todo: This next few lines are repeated in the code! Refactor!
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.gameWRatio = (this.gameScreenW / this.canvasRect.width);
        this.gameHRatio = (this.gameScreenH / this.canvasRect.height)
        this.maxscrollx = 1 + this.maxmapx - this.gameScreenW;
        this.maxscrolly = 1 + this.maxmapy - this.gameScreenH;

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

            // Todo: This next few lines are repeated in the code! Refactor!
            this.canvasRect = this.canvas.getBoundingClientRect();
            this.gameWRatio = (this.gameScreenW / this.canvasRect.width);
            this.gameHRatio = (this.gameScreenH / this.canvasRect.height)
            this.maxscrollx = 1 + this.maxmapx - this.gameScreenW;
            this.maxscrolly = 1 + this.maxmapy - this.gameScreenH;
        }
        console.log(this.lastDisplayWidth, this.lastDisplayHeight);
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
        // Before rendering, resize canvas to display size. (in case of changing window size)
        this.resizeCanvasToDisplaySize(this.canvas);

        // Clear the canvas
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Render the game
        // Todo: render game entities
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

        console.log('Starting the game with aspect ratio', this.aspectRatio);
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
        this.curX = event.clientX * (this.gameScreenW / this.canvasRect.width);
        this.curY = event.clientY * (this.gameScreenH / this.canvasRect.height);
    }

    mouseDown(event: MouseEvent): void {
        //
        console.log(this.curX, this.curY);
    }

    mouseUp(event: MouseEvent): void {
        //
    }

    mouseWheel(event: WheelEvent): void {
        // Use the event's deltaY property to detect scroll direction
        if (event.deltaY < 0) {
            console.log("CTRL+Scroll Up"); // You could trigger a specific game action here
        } else if (event.deltaY > 0) {
            console.log("CTRL+Scroll Down");
        }

        if (event.ctrlKey) {
            event.preventDefault(); // Prevents the default zoom behavior
        }
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
            if (this.scrollX > this.maxscrollx) {
                this.scrollX = this.maxscrollx;
            }
            if (this.scrollX < 0) {
                this.scrollX = 0;
            }
            if (this.scrollY > this.maxscrolly) {
                this.scrollY = this.maxscrolly;
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
        // this.curanim = 1;
        // this.curanimx = this.gamecurx - 32;
        // this.curanimy = this.gamecury - 32;

    }

    public tryselect(): void {
        // Called from procGame
    }


}


