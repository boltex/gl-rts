// import * as Constants from "./constants";
// import * as utils from "./utils";
import { Point, M3x3 } from "./maths";
import { TEntity, } from "./type";

// VERTEX SHADER
const vertexShaderSource = /*glsl*/ `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec2 aTexCoord;
layout(location=2) in vec3 aOffset;
layout(location=3) in float aScale;
layout(location=4) in vec2 aUV;

out vec2 vTexCoord;

void main()
{
    vTexCoord = vec2(aTexCoord * 0.015625) + aUV;
    gl_Position = vec4(aPosition.xyz * aScale + aOffset, 1.0);
}`;

// FRAGMENT SHADER
const fragmentShaderSource = /*glsl*/ `#version 300 es

precision mediump float;

uniform mediump sampler2D uSampler;

in vec2 vTexCoord;

out vec4 fragColor;

void main()
{
    fragColor = texture(uSampler, vTexCoord);
}`;

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = src;
    });
}

(async () => {

    console.log('Hello World!');

    const canvas = document.querySelector('canvas')!;
    const gl = canvas.getContext('webgl2')!;

    const program = gl.createProgram()!;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    gl.attachShader(program, vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(fragmentShader));
        console.log(gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    // * Start Program *

    const image = await loadImage('images/alien.png');

    let lastDisplayWidth = 0;
    let lastDisplayHeight = 0;

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas, { box: 'content-box' });

    /**
     * Call before rendering in draw loop to resize canvas to display size. (in case of changing window size)
     * @param canvas 
     */
    function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
        // Get the size the browser is displaying the canvas in device pixels.
        const [displayWidth, displayHeight] = [lastDisplayWidth, lastDisplayHeight];

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

    function onResize(entries: any) {

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
                    // legacy
                    width = entry.contentBoxSize.inlineSize;
                    height = entry.contentBoxSize.blockSize;
                }
            } else {
                // legacy
                width = entry.contentRect.width;
                height = entry.contentRect.height;
            }
            const displayWidth = Math.round(width * dpr);
            const displayHeight = Math.round(height * dpr);
            [lastDisplayWidth, lastDisplayHeight] = [displayWidth, displayHeight];
        }
        console.log(lastDisplayWidth, lastDisplayHeight);
    }

    document.addEventListener('DOMContentLoaded', (event) => {
        if (!window.game) {
            window.game = new Game();
            window.game.resize(
                window.innerWidth,
                window.innerHeight,
                true // First resize not debounced.
            );
        } else {
            console.log('Game instance already started');
        }
    });

    window.addEventListener('resize', (event) => {
        if (window.game) {
            window.game.resize(
                window.innerWidth,
                window.innerHeight
            );
        }
    });

    function loop(timestamp: number): void {
        window.game.update(timestamp);
        requestAnimationFrame(loop);
    }


})();

export class Game {

    public started = false;
    public canvasRect: DOMRect;
    public optionsVisible = false;
    public menu: HTMLElement;


    public canvasElement: HTMLCanvasElement;
    public gl!: WebGL2RenderingContext;

    public worldSpaceMatrix: M3x3;

    // Game States
    public entities!: Entities;

    // Key press state
    public keysPressed: Record<string, any> = {};

    // Game Map
    public gamemap: number[] = [];

    // Screen States
    public screenx = 1920;
    public screeny = 1080;

    public selecting: boolean = false;
    public selx = 0; // Started selection at specific coords
    public sely = 0;

    public scrollx = 0; // Current scroll position 
    public scrolly = 0;

    public SCROLLSPEED = 50;   // speed in pixels for scrolling
    public SCROLLBORDER = 10; // 5;   // pixels from screen to trigger scrolling
    public xscr_e = this.screenx - this.SCROLLBORDER; // constants for finding trigger zone
    public yscr_e = this.screeny - this.SCROLLBORDER;


    public tilebmpsize = 1024;  // size of a bitmap of tiles
    public tilesize = 128;      // size of an individual square TILE 
    public tileratio = this.tilebmpsize / this.tilesize;
    public initrangex = (this.screenx / this.tilesize) + 1;
    public initrangey = (this.screeny / this.tilesize) + 1;

    public gamemapw = 9; // game map width in TILES 
    public gamemaph = 9;
    public maxmapx = (this.gamemapw * this.tilesize) - 1;
    public maxmapy = (this.gamemaph * this.tilesize) - 1;
    public maxscrollx = 1 + this.maxmapx - this.screenx;
    public maxscrolly = 1 + this.maxmapy - this.screeny;

    public scrollnowx = 0; // Scroll amount to be applied to scroll when processing
    public scrollnowy = 0;



    public htmlClassList: DOMTokenList;
    public curClass = ""; //"cur-pointer", "cur-target", "cur-select" ...

    public curx = 0 // Current mouse position
    public cury = 0

    public gamestate = 0   // 0=SPLASH
    // 1=Lobby (main menu)
    // 2=game Lobby
    // 3=play Loop
    // 4=Game over/stats
    // 5=EDITION ANIMS
    // 6=EDITION MAP
    // 7=OPTIONS

    public gameaction = 0    // 0=none
    public DEFAULTACTION = 1 // game actions CONSTANTS, zero means none
    public RELEASESEL = 2

    public gamecurx = 0
    public gamecury = 0
    public gameselx = 0
    public gamesely = 0

    // Test Cursor vatiables
    public curanim = 0
    public curanimtotal = 6
    public curanimx = 0
    public curanimy = 0

    // Test Orientation vatiable
    public testSpriteOrientation = 0;

    // FPS counter
    public lastTime = 0;
    public fps = 0;
    public fpsInterval = 1000; // Update FPS every 1 second
    public fpsLastTime = 0;

    // GAME-STATE TICKS AT 8 FPS
    public tickAccumulator = 0; // What remained in deltaTime after last update 
    public currentTick = 0;
    public timePerTick = 125; // dt in ms (125 is 8 per second)
    public timerTriggerAccum = this.timePerTick * 3; // 3 times the timePerTick

    // ANIMATIONS AT 15 FPS
    public animAccumulator = 0; // What remained in deltaTime after last update 
    public currentAnim = 0;
    public timePerAnim = 67; // dt in ms (66.66 is 15 per second)



    constructor() {
        console.log('Init WebGL2 Game !');
        console.log('initrangex', this.initrangex);
        console.log('initrangey', this.initrangey);
        console.log('tileratio', this.tileratio);

        this.menu = document.getElementById('game-menu')!;

        this.htmlClassList = document.documentElement.classList;
        this.setCursor("cur-pointer");
        // this.canvasElement = document.createElement("canvas");

        this.canvasElement = document.querySelector('canvas')!;
        this.canvasElement.width = this.screenx;
        this.canvasElement.height = this.screeny;
        this.canvasRect = this.canvasElement.getBoundingClientRect();

        this.worldSpaceMatrix = new M3x3();

        this.gl = this.canvasElement.getContext('webgl2', {
            // antialias: false,
            // alpha: false,
            // depth: false,
        })!;
        // this.gl.enable(this.gl.BLEND);  // TODO: Check if needed

        // document.body.appendChild(this.canvasElement);

        // Prevent right-click context menu
        this.canvasElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });


        console.log('Starting the game!');

        document.addEventListener('keydown', (e) => {
            this.keysPressed[e.key] = true;
            if (e.key === 'F10') {
                e.preventDefault();  // Prevent default F10 behavior
                this.toggleGameMenu();
            }
            if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
                e.preventDefault();
            }
            // 107 Num Key  +
            // 109 Num Key  -
            // 173 Min Key  hyphen/underscore key
            // 61 Plus key  +/= key

        });
        document.addEventListener('keyup', (e) => {
            this.keysPressed[e.key] = false;
        });

        const resumeButton = document.getElementById('resume-btn');

        resumeButton!.addEventListener('click', () => {
            this.toggleGameMenu();  // Close the menu and resume the game
        });

        window.addEventListener("mousemove", (event) => {
            this.mouseMove(event);
        });
        window.addEventListener("mousedown", (event) => {
            this.mouseDown(event);
        });
        window.addEventListener("mouseup", (event) => {
            this.mouseUp(event);
        });

        window.addEventListener("wheel DOMMouseScroll", (event: any) => {
            if (event.ctrlKey) {
                event.preventDefault(); // Prevents the default zoom behavior
                // Use the event's deltaY property to detect scroll direction
                // if (event.deltaY < 0) {
                //     console.log("CTRL+Scroll Up"); // You could trigger a specific game action here
                // } else if (event.deltaY > 0) {
                //     console.log("CTRL+Scroll Down");
                // }
            }
        }, { passive: false });

        // startButton.style.display = 'none';
        // resolutionSelect.style.display = 'none';
        // document.body.style.cursor = 'none'; // ! HIDE NATIVE CURSOR !
        this.started = true;
        // Setup timer in case RAF Skipped when not in foreground or minimized.
        setInterval(() => { this.checkUpdate(); }, 500);


        // this.backBuffer16x9 = new BackBuffer(this.gl, { width: 1280, height: 720 });
        // this.backBuffer4x3 = new BackBuffer(this.gl, { width: 960, height: 720 });
        // this.finalBuffer16x9 = new BackBuffer(this.gl, { width: 1280, height: 720 });
        // this.finalBuffer4x3 = new BackBuffer(this.gl, { width: 960, height: 720 });

        // if (this.optionsAspectRatio === 0) {
        //     // 4:3
        //     this.backBuffer = this.backBuffer4x3
        //     this.finalBuffer = this.finalBuffer4x3;
        // } else {
        //     // 16:9
        //     this.backBuffer = this.backBuffer16x9
        //     this.finalBuffer = this.finalBuffer16x9
        // }

        // this.initGameStates();

        // TODO START ! 
        // loop(0); 

    }

    resize(w: number, h: number, noDebounce?: boolean): void {
        // if (noDebounce) {
        //     this.calculateResize(w, h);
        // } else {
        //     if (this._resizeTimer) {
        //         clearTimeout(this._resizeTimer);
        //     }
        //     this._resizeTimer = setTimeout(() => {
        //         this.calculateResize(w, h); // Debounced
        //     }, 100);
        // }
    }

    public toggleGameMenu(): void {

        if (this.menu.style.display === 'none') {
            this.menu.style.display = 'flex';  // Show the menu
            // Pause game logic here (if needed)
        } else {
            this.menu.style.display = 'none';  // Hide the menu
            // Resume game logic here (if needed)
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
    public mouseDown(event: MouseEvent): void {
        this.setCursorPos(event);
        this.gamecurx = this.curx + this.scrollx;
        this.gamecury = this.cury + this.scrolly;
        if (!this.selecting) {
            if (event.button == 0) {
                this.selecting = true;
                this.setCursor("cur-target");
                this.selx = this.curx;
                this.sely = this.cury;
            }
            if (event.button == 2) {
                this.gameaction = this.DEFAULTACTION;
            }
        }
    }

    public mouseUp(event: MouseEvent): void {
        this.setCursorPos(event);
        this.gameselx = this.selx + this.scrollx;
        this.gamesely = this.sely + this.scrolly;
        this.gamecurx = this.curx + this.scrollx;
        this.gamecury = this.cury + this.scrolly;
        if (event.button == 0) {
            this.selecting = false;
            this.setCursor("cur-pointer");
            this.gameaction = this.RELEASESEL;
        }
    }

    public mouseMove(event: MouseEvent): void {
        this.setCursorPos(event);
        this.scrollnowx = 0;
        this.scrollnowy = 0;
        if (this.curx > this.xscr_e) {
            this.scrollnowx = this.SCROLLSPEED;
        }
        if (this.cury > this.yscr_e) {
            this.scrollnowy = this.SCROLLSPEED;
        }
        if (this.curx < this.SCROLLBORDER) {
            this.scrollnowx = -this.SCROLLSPEED;
        }
        if (this.cury < this.SCROLLBORDER) {
            this.scrollnowy = -this.SCROLLSPEED;
        }
    }

    public setCursorPos(event: MouseEvent): void {
        this.curx = (event.clientX - this.canvasRect.left) * (this.screenx / this.canvasRect.width);
        this.cury = (event.clientY - this.canvasRect.top) * (this.screeny / this.canvasRect.height);
    }

    update(timestamp: number, skipRender?: boolean): void {
        // 
    }

    public checkUpdate(): void {
        // Checks for needed ticks to be computed if game is minimized
        const timestamp = performance.now();
        const deltaTime = timestamp - this.lastTime;
        if ((this.tickAccumulator + deltaTime) < this.timerTriggerAccum) {
            return;
        }
        // It's been a while, game is minimized: update without rendering.
        this.update(timestamp, true);
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

