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
        window.addEventListener("keydown", this.handleKeyDown.bind(this));
        window.addEventListener("keyup", this.handleKeyUp.bind(this));
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        window.addEventListener("mousedown", this.handleMouseDown.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
        window.addEventListener("wheel", this.handleMouseWheel.bind(this), { passive: false });
    }
    private handleKeyDown(e: KeyboardEvent): void {
        this.keysPressed[e.key] = true;
        if (e.key === 'F10') {
            e.preventDefault();
            this.game.toggleGameMenu();
        }
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
            e.preventDefault();
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.keysPressed[e.key] = false;
    }

    private handleMouseMove(event: MouseEvent): void {
        this.setCursorPos(event);
        this.scrollNowX = 0;
        this.scrollNowY = 0;

        if (this.mouseX > this.game.scrollEdgeX) {
            this.scrollNowX = CONFIG.DISPLAY.SCROLL.SPEED;
        }
        if (this.mouseY > this.game.scrollEdgeY) {
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
                this.gameSelStartX = this.selX + this.game.scrollX;
                this.gameSelStartY = this.selY + this.game.scrollY;
                this.game.setCursor('cur-target');
            }
            if (event.button === 2) {
                this.game.gameAction = CONFIG.GAME.ACTIONS.DEFAULT;
            }
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        this.setCursorPos(event);
        if (event.button === 0) {
            this.gameSelEndX = this.mouseX + this.game.scrollX;
            this.gameSelEndY = this.mouseY + this.game.scrollY;
            this.selecting = false;
            this.game.gameAction = CONFIG.GAME.ACTIONS.RELEASESEL;
            this.game.setCursor('cur-pointer');
        }
    }

    private handleMouseWheel(event: WheelEvent): void {
        if (event.ctrlKey) {
            event.preventDefault();
        }
        if (event.deltaY < 0) {
            // Todo: Zoom in
            console.log("CTRL+Scroll Up"); // You could trigger a specific game action here
        } else if (event.deltaY > 0) {
            // Todo: Zoom out
            console.log("CTRL+Scroll Down");
        }
    }

    private setCursorPos(event: MouseEvent): void {
        this.mouseX = event.clientX * (this.game.gameScreenWidth / this.game.canvasBoundingRect.width);
        this.mouseY = event.clientY * (this.game.gameScreenHeight / this.game.canvasBoundingRect.height);
        this.gameMouseX = this.mouseX + this.game.scrollX;
        this.gameMouseY = this.mouseY + this.game.scrollY;
    }

    public processInputs(): void {
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
        if (!this.selecting) {
            this.updateScroll();
        }
    }

    private updateScroll(): void {
        this.game.scrollX += this.scrollNowX;
        this.game.scrollY += this.scrollNowY;

        // Clamp scroll values
        this.game.scrollX = Math.max(0, Math.min(this.game.scrollX, this.game.maxScrollX));
        this.game.scrollY = Math.max(0, Math.min(this.game.scrollY, this.game.maxScrollY));
    }

    public get isSelecting(): boolean {
        return this.selecting;
    }


}

