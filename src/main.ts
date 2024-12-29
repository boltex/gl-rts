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

function loop(timestamp: number): void {
    window.game.update(timestamp);
    requestAnimationFrame(loop);
}

export class Game {

    lastDisplayWidth: number = 0;
    lastDisplayHeight: number = 0;
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    aspectRatio: number = Game.AVAILABLE_RESOLUTIONS[0].width / Game.AVAILABLE_RESOLUTIONS[0].height;

    // Game state
    started = false;

    // Key press state
    keysPressed: Record<string, any> = {};

    // Image assets
    creatures!: HTMLImageElement;
    tiles!: HTMLImageElement;

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
        this.gl = this.canvas.getContext('webgl2')!;
        // Prevent right-click context menu
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        const resizeObserver = new ResizeObserver(this.resize);
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
            this.creatures = images[0];
            this.tiles = images[1];
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
        // Todo: render game
    }

    mainMenu(): void {
        // The images have loaded, so it's time to show the pre-game menu

        // Create the start button
        const startButton = document.createElement("button");
        startButton.textContent = "Start Game";
        startButton.classList.add("btn-start");

        document.body.appendChild(startButton);

        // Create the dropdown for screen resolution
        const resolutionSelect = document.createElement("select");
        resolutionSelect.classList.add("resolution-select");


        // Populate the dropdown with options
        for (const { label, width, height } of Game.AVAILABLE_RESOLUTIONS) {
            const option = document.createElement("option");
            option.value = `${width}x${height}`;
            option.textContent = label;
            resolutionSelect.appendChild(option);
        }
        document.body.appendChild(resolutionSelect);

        // Use resolutionSelect.selectedIndex to get the selected resolution

        startButton.addEventListener("click", () => {

            this.aspectRatio = Game.AVAILABLE_RESOLUTIONS[resolutionSelect.selectedIndex].width / Game.AVAILABLE_RESOLUTIONS[resolutionSelect.selectedIndex].height;

            console.log('Starting the game!', this.aspectRatio);

            startButton.style.display = 'none';
            resolutionSelect.style.display = 'none';
            // document.body.style.cursor = 'none'; // ! HIDE NATIVE CURSOR !
            this.started = true;
            // Setup timer in case RAF Skipped when not in foreground or minimized.
            setInterval(() => { this.checkUpdate(); }, 500);
            loop(0);
        });

    }

    addGameEventListeners(): void {
        document.addEventListener('keydown', (e) => {
            this.keysPressed[e.key] = true;
            if (e.key === 'F10') {
                e.preventDefault();  // Prevent default F10 behavior
                this.toggleGameMenu();
            }
            // Prevent keyboard zoom.
            if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
                e.preventDefault();
            }

        });
        document.addEventListener('keyup', (e) => {
            this.keysPressed[e.key] = false;
        });
        window.addEventListener("mousemove", this.mouseMove.bind(this));
        window.addEventListener("mousedown", this.mouseDown.bind(this));
        window.addEventListener("mouseup", this.mouseUp.bind(this));
        window.addEventListener("wheel", this.mouseWheel.bind(this), { passive: false });

    }

    toggleGameMenu(): void {
        console.log('Toggle Game Menu'); // Todo: Implement Game Menu
    }

    mouseMove(event: MouseEvent): void {
        //
    }

    mouseDown(event: MouseEvent): void {
        //
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

    checkUpdate(): void {
        //
    }


}


