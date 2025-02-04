import { Game } from "./game";
import { CONFIG } from './config';

export class InputManager {
    private game: Game;
    private keysPressed: Record<string, boolean> = {};
    private selecting: boolean = false;
    public mouseX = 0;
    public mouseY = 0;
    private gameMouseX = 0;
    private gameMouseY = 0;
    public selX = 0;
    public selY = 0;
    private gameSelStartX = 0;
    private gameSelStartY = 0;
    private gameSelEndX = 0;
    private gameSelEndY = 0;
    private scrollNowX = 0;
    private scrollNowY = 0;

    private keyboardUp = false;
    private keyboardDown = false;
    private keyboardLeft = false;
    private keyboardRight = false;

    private keyDownHandler = this.handleKeyDown.bind(this);
    private keyUpHandler = this.handleKeyUp.bind(this);
    private mouseMoveHandler = this.handleMouseMove.bind(this);
    private mouseDownHandler = this.handleMouseDown.bind(this);
    private mouseUpHandler = this.handleMouseUp.bind(this);
    private mouseWheelHandler = this.handleMouseWheel.bind(this);

    constructor(game: Game) {
        this.game = game;
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
        window.addEventListener("keydown", this.keyDownHandler);
        window.addEventListener("keyup", this.keyUpHandler);
        window.addEventListener("mousemove", this.mouseMoveHandler);
        window.addEventListener("mousedown", this.mouseDownHandler);
        window.addEventListener("mouseup", this.mouseUpHandler);
        window.addEventListener("wheel", this.mouseWheelHandler, { passive: false });
    }

    dispose(): void {
        window.removeEventListener("keydown", this.keyDownHandler);
        window.removeEventListener("keyup", this.keyUpHandler);
        window.removeEventListener("mousemove", this.mouseMoveHandler);
        window.removeEventListener("mousedown", this.mouseDownHandler);
        window.removeEventListener("mouseup", this.mouseUpHandler);
        window.removeEventListener("wheel", this.mouseWheelHandler);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        this.keysPressed[e.key] = true;
        if (e.key === 'F10') {
            e.preventDefault();
            this.game.uiManager.toggleGameMenu();
        }
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
            e.preventDefault();
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.keysPressed[e.key] = false;
    }

    private handleMouseMove(event?: MouseEvent): void {
        if (event) {
            this.setCursorPos(event);
        }
        this.scrollNowX = 0;
        this.scrollNowY = 0;

        if (this.mouseX > this.game.cameraManager.scrollEdgeX) {
            this.scrollNowX = CONFIG.DISPLAY.SCROLL.SPEED;
        }
        if (this.mouseY > this.game.cameraManager.scrollEdgeY) {
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
                this.selX = this.mouseX;
                this.selY = this.mouseY;
                this.gameSelStartX = this.selX + this.game.cameraManager.scrollX;
                this.gameSelStartY = this.selY + this.game.cameraManager.scrollY;
                this.game.uiManager.setCursor('cur-target');
            }
            if (event.button === 2) {
                this.game.gameAction = CONFIG.GAME.ACTIONS.DEFAULT;
            }
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        this.setCursorPos(event);
        if (event.button === 0) {
            this.gameSelEndX = this.mouseX + this.game.cameraManager.scrollX;
            this.gameSelEndY = this.mouseY + this.game.cameraManager.scrollY;
            this.selecting = false;
            this.game.gameAction = CONFIG.GAME.ACTIONS.RELEASESEL;
            this.game.uiManager.setCursor('cur-pointer');
        }
    }

    private handleMouseWheel(event: WheelEvent): void {
        if (event.ctrlKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        if (event.deltaY < 0) {
            // TODO : Implement Zoom in!
            console.log("Scroll Up");
        } else if (event.deltaY > 0) {
            // TODO : Implement Zoom out!
            console.log("Scroll Down");
        }
    }

    private setCursorPos(event: MouseEvent): void {
        this.mouseX = event.clientX * (this.game.cameraManager.gameScreenWidth / this.game.canvasBoundingRect.width);
        this.mouseY = event.clientY * (this.game.cameraManager.gameScreenHeight / this.game.canvasBoundingRect.height);
        this.gameMouseX = this.mouseX + this.game.cameraManager.scrollX;
        this.gameMouseY = this.mouseY + this.game.cameraManager.scrollY;
    }

    public processInputs(): void {
        if (this.keysPressed['ArrowUp'] || this.keysPressed['w']) {
            this.scrollNowY = -CONFIG.DISPLAY.SCROLL.SPEED;
            this.keyboardUp = true
        } else if (this.keyboardUp) {
            this.keyboardUp = false;
            this.scrollNowY = 0;
            this.handleMouseMove();
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['s']) {
            this.scrollNowY = CONFIG.DISPLAY.SCROLL.SPEED;
            this.keyboardDown = true
        } else if (this.keyboardDown) {
            this.keyboardDown = false;
            this.scrollNowY = 0;
            this.handleMouseMove();
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['a']) {
            this.scrollNowX = -CONFIG.DISPLAY.SCROLL.SPEED;
            this.keyboardLeft = true
        } else if (this.keyboardLeft) {
            this.keyboardLeft = false;
            this.scrollNowX = 0;
            this.handleMouseMove();
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['d']) {
            this.scrollNowX = CONFIG.DISPLAY.SCROLL.SPEED;
            this.keyboardRight = true
        } else if (this.keyboardRight) {
            this.keyboardRight = false;
            this.scrollNowX = 0;
            this.handleMouseMove();
        }

        // Scroll if not currently dragging a selection.
        if (!this.isSelecting) {
            this.game.cameraManager.scroll(this.scrollVelocity);
        }
    }

    public get isSelecting(): boolean {
        return this.selecting;
    }


}

